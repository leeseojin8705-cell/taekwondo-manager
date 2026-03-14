"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/ui/AppShell";
import PageCard from "../../components/ui/PageCard";
import LoadingBlock from "../../components/ui/LoadingBlock";
import ErrorBlock from "../../components/ui/ErrorBlock";
import EmptyState from "../../components/ui/EmptyState";
import { supabase } from "../../lib/supabase";

type AttendanceRow = {
  id: string;
  student_id: string;
  student_contract_id: string | null;
  program_id: string | null;
  checkin_date: string;
  checkin_time: string;
  checkin_source: string;
  checkin_type: string;
  status_at_checkin: string | null;
  warning_flags: string[] | null;
  note: string | null;
  created_at: string;
  students: {
    id: string;
    name?: string | null;
    full_name?: string | null;
    photo_url: string | null;
    status: string | null;
  } | null;
  programs: {
    name: string | null;
  } | null;
};

type SummaryCard = {
  label: string;
  value: number;
  tone?: "default" | "green" | "yellow" | "red" | "blue";
};

function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStudentDisplayName(
  student: AttendanceRow["students"] | null | undefined
) {
  if (!student) return "Unknown Student";
  return student.name || student.full_name || "Unknown Student";
}

function hasWarning(flags: string[] | null | undefined, key: string) {
  if (!flags || !Array.isArray(flags)) return false;
  return flags.includes(key);
}

function getCardToneStyles(tone: SummaryCard["tone"]) {
  switch (tone) {
    case "green":
      return {
        border: "1px solid #166534",
        background: "rgba(34,197,94,0.12)",
        valueColor: "#bbf7d0",
      };
    case "yellow":
      return {
        border: "1px solid #92400e",
        background: "rgba(245,158,11,0.12)",
        valueColor: "#fde68a",
      };
    case "red":
      return {
        border: "1px solid #7f1d1d",
        background: "rgba(239,68,68,0.12)",
        valueColor: "#fecaca",
      };
    case "blue":
      return {
        border: "1px solid #1d4ed8",
        background: "rgba(59,130,246,0.12)",
        valueColor: "#bfdbfe",
      };
    default:
      return {
        border: "1px solid #334155",
        background: "#0f172a",
        valueColor: "#f8fafc",
      };
  }
}

function SummaryStatCard({ card }: { card: SummaryCard }) {
  const tone = getCardToneStyles(card.tone);

  return (
    <div
      style={{
        border: tone.border,
        background: tone.background,
        borderRadius: 16,
        padding: 18,
        display: "grid",
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {card.label}
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          color: tone.valueColor,
          lineHeight: 1,
        }}
      >
        {card.value}
      </div>
    </div>
  );
}

function WarningPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        border: "1px solid #92400e",
        background: "rgba(245,158,11,0.12)",
        color: "#fde68a",
        padding: "5px 9px",
        fontSize: 11,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  );
}

function SourcePill({ value }: { value: string | null | undefined }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        border: "1px solid #334155",
        background: "#0f172a",
        color: "#cbd5e1",
        padding: "5px 9px",
        fontSize: 11,
        fontWeight: 800,
        lineHeight: 1,
        textTransform: "capitalize",
      }}
    >
      {value || "-"}
    </span>
  );
}

const CHECKIN_TYPE_LABELS: Record<string, string> = {
  regular: "Regular",
  makeup: "Make-up",
  sparring: "Sparring",
  poomsae: "Poomsae",
  demonstration: "Demonstration",
};

function TypePill({ value }: { value: string | null | undefined }) {
  const t = (value || "").toLowerCase();
  const isMakeup = t === "makeup";
  const isSpecial = ["sparring", "poomsae", "demonstration"].includes(t);
  const label = CHECKIN_TYPE_LABELS[t] || (value ? String(value) : "-");
  const border = isMakeup ? "#1d4ed8" : isSpecial ? "#7c3aed" : "#166534";
  const bg = isMakeup ? "rgba(59,130,246,0.12)" : isSpecial ? "rgba(124,58,237,0.12)" : "rgba(34,197,94,0.12)";
  const color = isMakeup ? "#bfdbfe" : isSpecial ? "#e9d5ff" : "#bbf7d0";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        border: `1px solid ${border}`,
        background: bg,
        color,
        padding: "5px 9px",
        fontSize: 11,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {label}
    </span>
  );
}

export default function CheckInHomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayLogs, setTodayLogs] = useState<AttendanceRow[]>([]);

  const today = useMemo(() => getTodayLocalDate(), []);

  useEffect(() => {
    fetchTodayAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchTodayAttendance() {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("attendance_logs")
        .select(`
          id,
          student_id,
          student_contract_id,
          program_id,
          checkin_date,
          checkin_time,
          checkin_source,
          checkin_type,
          status_at_checkin,
          warning_flags,
          note,
          created_at,
          students:student_id (
            id,
            name,
            full_name,
            photo_url,
            status
          ),
          programs:program_id (
            name
          )
        `)
        .eq("checkin_date", today)
        .order("checkin_time", { ascending: false });

      if (error) {
        setTodayLogs([]);
        setLoading(false);
        return;
      }
      setTodayLogs((data ?? []) as unknown as AttendanceRow[]);
      setError(null);
    } catch (err: any) {
      setTodayLogs([]);
      setError((err?.message || "Failed to load check-in home.") + " Run scripts/attendance_logs_create.sql in Supabase if the table is missing.");
    } finally {
      setLoading(false);
    }
  }

  const summaryCards = useMemo<SummaryCard[]>(() => {
    const total = todayLogs.length;
    const regular = todayLogs.filter(
      (row) => (row.checkin_type || "").toLowerCase() === "regular"
    ).length;
    const makeup = todayLogs.filter(
      (row) => (row.checkin_type || "").toLowerCase() === "makeup"
    ).length;
    const holdAutoReleased = todayLogs.filter((row) =>
      hasWarning(row.warning_flags, "auto_released_hold")
    ).length;
    const expiredWarning = todayLogs.filter((row) =>
      hasWarning(row.warning_flags, "expired_membership")
    ).length;
    const overWeeklyLimit = todayLogs.filter((row) =>
      hasWarning(row.warning_flags, "over_weekly_limit")
    ).length;

    return [
      {
        label: "Today Check-ins",
        value: total,
        tone: "blue",
      },
      {
        label: "Regular Attendance",
        value: regular,
        tone: "green",
      },
      {
        label: "Make-up Attendance",
        value: makeup,
        tone: "default",
      },
      {
        label: "Hold Auto Released",
        value: holdAutoReleased,
        tone: "yellow",
      },
      {
        label: "Expired Membership Warning",
        value: expiredWarning,
        tone: "red",
      },
      {
        label: "Over Weekly Limit",
        value: overWeeklyLimit,
        tone: "yellow",
      },
    ];
  }, [todayLogs]);

  if (loading) {
    return (
      <AppShell
        title="Check-in Home"
        description="Daily attendance operations and kiosk control"
      >
        <LoadingBlock message="Loading check-in home..." />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Check-in Home"
      description="Daily attendance operations, kiosk launch, and today check-in summary"
    >
      <div style={{ display: "grid", gap: 20 }}>
        {error ? (
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              border: "1px solid #7f1d1d",
              background: "rgba(239,68,68,0.12)",
              color: "#fecaca",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        ) : null}
        <PageCard title="Today Summary">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            {summaryCards.map((card) => (
              <SummaryStatCard key={card.label} card={card} />
            ))}
          </div>
        </PageCard>

        <PageCard title="Quick Actions">
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Link href="/checkin/kiosk" style={buttonPrimaryStyle}>
              Open Kiosk
            </Link>
            <Link href="/checkin/manual" style={buttonGhostStyle}>
              Manual Check-in
            </Link>
            <Link href="/attendance" style={buttonGhostStyle}>
              Attendance Log
            </Link>
            <Link href="/checkin/settings" style={buttonGhostStyle}>
              Check-in Settings
            </Link>
          </div>
        </PageCard>

        <PageCard title="Today Check-in List">
          {todayLogs.length === 0 ? (
            <EmptyState
              title="No check-ins yet"
              description="No attendance has been recorded for today."
            />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {todayLogs.map((row) => {
                const studentName = getStudentDisplayName(row.students);
                const warnings = row.warning_flags ?? [];

                return (
                  <div
                    key={row.id}
                    style={{
                      border: "1px solid #334155",
                      background: "#0f172a",
                      borderRadius: 16,
                      padding: 16,
                      display: "grid",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "72px 1fr auto",
                        gap: 14,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        {row.students?.photo_url ? (
                          <img
                            src={row.students.photo_url}
                            alt={studentName}
                            style={{
                              width: 60,
                              height: 60,
                              objectFit: "cover",
                              borderRadius: 14,
                              border: "1px solid #334155",
                              background: "#111827",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 60,
                              height: 60,
                              borderRadius: 14,
                              border: "1px solid #334155",
                              background: "#111827",
                              color: "#94a3b8",
                              fontSize: 11,
                              fontWeight: 800,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              textAlign: "center",
                              padding: 6,
                            }}
                          >
                            No Photo
                          </div>
                        )}
                      </div>

                      <div style={{ display: "grid", gap: 6 }}>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 900,
                            color: "#f8fafc",
                          }}
                        >
                          {studentName}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <TypePill value={row.checkin_type} />
                          <SourcePill value={row.checkin_source} />
                          <span style={minorPillStyle}>
                            Program: {row.programs?.name || "-"}
                          </span>
                          <span style={minorPillStyle}>
                            Time: {formatDateTime(row.checkin_time)}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          justifyContent: "flex-end",
                        }}
                      >
                        <Link
                          href={`/students/${row.student_id}`}
                          style={buttonGhostSmallStyle}
                        >
                          View Student
                        </Link>
                      </div>
                    </div>

                    {warnings.length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        {hasWarning(warnings, "expired_membership") ? (
                          <WarningPill>Expired Membership</WarningPill>
                        ) : null}

                        {hasWarning(warnings, "over_weekly_limit") ? (
                          <WarningPill>Over Weekly Limit</WarningPill>
                        ) : null}

                        {hasWarning(warnings, "auto_released_hold") ? (
                          <WarningPill>Hold Auto Released</WarningPill>
                        ) : null}
                      </div>
                    ) : null}

                    {row.note ? (
                      <div style={noteBoxStyle}>{row.note}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </PageCard>
      </div>
    </AppShell>
  );
}

const buttonPrimaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "#22c55e",
  color: "#052e16",
  borderRadius: 10,
  padding: "12px 18px",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
};

const buttonGhostStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#e2e8f0",
  borderRadius: 10,
  padding: "12px 18px",
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
};

const buttonGhostSmallStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#e2e8f0",
  borderRadius: 10,
  padding: "9px 12px",
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
  fontSize: 13,
};

const minorPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  border: "1px solid #334155",
  background: "#0b1220",
  color: "#cbd5e1",
  padding: "5px 9px",
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1,
};

const noteBoxStyle: React.CSSProperties = {
  border: "1px solid #1e293b",
  background: "#0b1220",
  borderRadius: 12,
  padding: 12,
  color: "#cbd5e1",
  lineHeight: 1.6,
  fontSize: 14,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};