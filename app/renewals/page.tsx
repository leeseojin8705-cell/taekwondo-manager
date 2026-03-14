"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type RenewalRow = {
  id: string;
  student_id: string;
  program_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  students: {
    id: string;
    name: string | null;
    full_name?: string | null;
    status: string | null;
  } | null;
  programs: {
    id: string;
    name: string;
  } | null;
  weekly_frequency_options?: {
    name: string | null;
  } | null;
};

type PeriodPriceRow = {
  program_id: string;
  period_months: number;
  amount: number | null;
};

type BucketKey = "expired" | "today" | "within7" | "within14";

const CARD_STYLE: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#020617",
  color: "#e2e8f0",
  outline: "none",
};

const BUTTON_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#111827",
  color: "#f8fafc",
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
};

const PRIMARY_BUTTON_STYLE: React.CSSProperties = {
  ...BUTTON_STYLE,
  background: "#06b6d4",
  color: "#082f49",
  border: "1px solid #22d3ee",
};

function getTodayLocalString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function diffDaysFromToday(dateString: string) {
  const today = new Date(getTodayLocalString());
  const target = new Date(dateString);
  const diffMs = target.getTime() - today.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function bucketByEndDate(endDate: string | null): BucketKey | null {
  if (!endDate) return null;

  const diff = diffDaysFromToday(endDate);

  if (diff < 0) return "expired";
  if (diff === 0) return "today";
  if (diff <= 7) return "within7";
  if (diff <= 14) return "within14";

  return null;
}

function bucketLabel(bucket: BucketKey) {
  switch (bucket) {
    case "expired":
      return "Expired";
    case "today":
      return "Due Today";
    case "within7":
      return "Due in 7 Days";
    case "within14":
      return "Due in 14 Days";
  }
}

function bucketColor(bucket: BucketKey) {
  switch (bucket) {
    case "expired":
      return "#ef4444";
    case "today":
      return "#f59e0b";
    case "within7":
      return "#22c55e";
    case "within14":
      return "#38bdf8";
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return "-";
  return dateString;
}

function statusBadgeStyle(bucket: BucketKey): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 800,
    background: `${bucketColor(bucket)}22`,
    color: bucketColor(bucket),
    border: `1px solid ${bucketColor(bucket)}55`,
  };
}

export default function RenewalsPage() {
  const [rows, setRows] = useState<RenewalRow[]>([]);
  const [periodPrices, setPeriodPrices] = useState<PeriodPriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBucket, setSelectedBucket] = useState<BucketKey | "all">("all");
  const [error, setError] = useState("");
  const [runningExit, setRunningExit] = useState(false);

  useEffect(() => {
    fetchRenewals();
  }, []);

  async function runMarkExpired() {
    setRunningExit(true);
    try {
      const res = await fetch("/api/renewals/mark-expired", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to run exit processing.");
      await fetchRenewals();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setRunningExit(false);
    }
  }

  async function fetchRenewals() {
    setLoading(true);
    setError("");

    const today = getTodayLocalString();
    const after14 = new Date(today);
    after14.setDate(after14.getDate() + 14);
    const after14String = `${after14.getFullYear()}-${String(
      after14.getMonth() + 1
    ).padStart(2, "0")}-${String(after14.getDate()).padStart(2, "0")}`;

    const [listRes, periodRes] = await Promise.all([
      supabase
        .from("student_contracts")
        .select(
          `
            id,
            student_id,
            program_id,
            start_date,
            end_date,
            status,
            students:student_id (
              id,
              name,
              full_name,
              status
            ),
            programs:program_id (
              id,
              name
            ),
            weekly_frequency_options:weekly_frequency_option_id (
              name
            )
          `
        )
        .in("status", ["active", "hold"])
        .not("end_date", "is", null)
        .lte("end_date", after14String)
        .order("end_date", { ascending: true }),
      supabase
        .from("program_period_prices")
        .select("program_id, period_months, amount")
        .eq("active", true)
        .order("period_months", { ascending: true }),
    ]);

    if (listRes.error) {
      setError(listRes.error.message);
      setRows([]);
      setLoading(false);
      return;
    }
    setRows((listRes.data ?? []) as unknown as RenewalRow[]);
    if (!periodRes.error && periodRes.data) {
      setPeriodPrices((periodRes.data ?? []) as PeriodPriceRow[]);
    } else {
      setPeriodPrices([]);
    }
    setLoading(false);
  }

  function getPeriodPrice(programId: string | null, periodMonths: number): number | null {
    if (!programId) return null;
    const row = periodPrices.find(
      (p) => p.program_id === programId && p.period_months === periodMonths
    );
    return row?.amount ?? null;
  }

  function formatPeriodHint(programId: string | null): string {
    if (!programId) return "—";
    const periods = [1, 3, 6, 12, 24];
    const parts = periods
      .map((mo) => {
        const amt = getPeriodPrice(programId, mo);
        return amt != null ? `${mo}mo $${Number(amt).toLocaleString()}` : null;
      })
      .filter(Boolean);
    return parts.length ? parts.join(" · ") : "—";
  }

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const displayName =
        (row.students?.name || row.students?.full_name || "").toLowerCase();
      const name = displayName || "";
      const programName = row.programs?.name?.toLowerCase() || "";
      const keyword = search.trim().toLowerCase();

      const bucket = bucketByEndDate(row.end_date);

      const matchesSearch =
        !keyword ||
        name.includes(keyword) ||
        programName.includes(keyword);

      const matchesBucket =
        selectedBucket === "all" ? true : bucket === selectedBucket;

      return matchesSearch && matchesBucket;
    });
  }, [rows, search, selectedBucket]);

  const grouped = useMemo(() => {
    const result: Record<BucketKey, RenewalRow[]> = {
      expired: [],
      today: [],
      within7: [],
      within14: [],
    };

    for (const row of filteredRows) {
      const bucket = bucketByEndDate(row.end_date);
      if (!bucket) continue;
      result[bucket].push(row);
    }

    return result;
  }, [filteredRows]);

  const counts = useMemo(() => {
    const result = {
      expired: 0,
      today: 0,
      within7: 0,
      within14: 0,
    };

    for (const row of rows) {
      const bucket = bucketByEndDate(row.end_date);
      if (!bucket) continue;
      result[bucket] += 1;
    }

    return result;
  }, [rows]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#f8fafc",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "#67e8f9",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 800,
              }}
            >
              Taekwondo Manager
            </p>

            <h1
              style={{
                margin: "8px 0 0 0",
                fontSize: 34,
                fontWeight: 900,
                color: "#f8fafc",
              }}
            >
              Renewal List
            </h1>

            <p style={{ margin: "10px 0 0 0", color: "#94a3b8" }}>
              Students with programs ending soon
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/dashboard" style={BUTTON_STYLE}>
              Dashboard
            </Link>
            <Link href="/students" style={BUTTON_STYLE}>
              Students
            </Link>
            <Link href="/student-programs/new" style={PRIMARY_BUTTON_STYLE}>
              Register Program (리뉴얼 시 결제 등록)
            </Link>
            <button
              type="button"
              onClick={runMarkExpired}
              disabled={runningExit || loading}
              style={{
                ...BUTTON_STYLE,
                background: counts.expired > 0 ? "rgba(239,68,68,0.2)" : undefined,
                borderColor: counts.expired > 0 ? "#ef4444" : undefined,
                color: counts.expired > 0 ? "#fca5a5" : undefined,
                opacity: runningExit || loading ? 0.7 : 1,
              }}
            >
              {runningExit ? "처리 중…" : "퇴관 처리 실행"}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div style={CARD_STYLE}>
            <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>
              Expired
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#ef4444" }}>
              {counts.expired}
            </div>
          </div>

          <div style={CARD_STYLE}>
            <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>
              Due Today
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#f59e0b" }}>
              {counts.today}
            </div>
          </div>

          <div style={CARD_STYLE}>
            <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>
              Due in 7 Days
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#22c55e" }}>
              {counts.within7}
            </div>
          </div>

          <div style={CARD_STYLE}>
            <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>
              Due in 14 Days
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#38bdf8" }}>
              {counts.within14}
            </div>
          </div>
        </div>

        <div style={{ ...CARD_STYLE, marginBottom: 24 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(240px, 1fr) auto",
              gap: 12,
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student, class, or program"
              style={INPUT_STYLE}
            />

            <select
              value={selectedBucket}
              onChange={(e) =>
                setSelectedBucket(e.target.value as BucketKey | "all")
              }
              style={{
                ...INPUT_STYLE,
                width: 220,
              }}
            >
              <option value="all">All</option>
              <option value="expired">Expired</option>
              <option value="today">Due Today</option>
              <option value="within7">Due in 7 Days</option>
              <option value="within14">Due in 14 Days</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={CARD_STYLE}>Loading...</div>
        ) : error ? (
          <div style={{ ...CARD_STYLE, color: "#fca5a5" }}>
            Error: {error}
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={CARD_STYLE}>No students match this filter.</div>
        ) : (
          <div style={{ display: "grid", gap: 20 }}>
            {(["expired", "today", "within7", "within14"] as BucketKey[]).map(
              (bucket) => {
                const bucketRows = grouped[bucket];
                if (bucketRows.length === 0) return null;

                return (
                  <div key={bucket} style={CARD_STYLE}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <h2
                        style={{
                          margin: 0,
                          fontSize: 22,
                          fontWeight: 900,
                          color: "#f8fafc",
                        }}
                      >
                        {bucketLabel(bucket)}
                      </h2>

                      <span style={statusBadgeStyle(bucket)}>
                        {bucketRows.length} students
                      </span>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          minWidth: 1100,
                        }}
                      >
                        <thead>
                          <tr style={{ borderBottom: "1px solid #1e293b" }}>
                            <th style={thStyle}>Student</th>
                            <th style={thStyle}>Program</th>
                            <th style={thStyle}>Price (1/3/6/12/24 mo)</th>
                            <th style={thStyle}>Start</th>
                            <th style={thStyle}>End</th>
                            <th style={thStyle}>Status</th>
                            <th style={thStyle}>Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          {bucketRows.map((row) => (
                            <tr
                              key={row.id}
                              style={{
                                borderBottom: "1px solid #0f172a",
                              }}
                            >
                              <td style={tdStrongStyle}>
                                {row.students?.name ||
                                  row.students?.full_name ||
                                  "-"}
                              </td>

                              <td style={tdStyle}>
                                {row.programs?.name || "-"}
                              </td>

                              <td style={{ ...tdStyle, fontSize: 12, color: "#94a3b8" }}>
                                {formatPeriodHint(row.program_id ?? null)}
                              </td>

                              <td style={tdStyle}>
                                {formatDate(row.start_date)}
                              </td>

                              <td style={tdStrongStyle}>
                                {formatDate(row.end_date)}
                              </td>

                              <td style={tdStyle}>
                                <span style={statusBadgeStyle(bucket)}>
                                  {bucketLabel(bucket)}
                                </span>
                              </td>

                              <td style={tdStyle}>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 8,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <Link
                                    href={`/students/${row.student_id}`}
                                    style={BUTTON_STYLE}
                                  >
                                    Student
                                  </Link>
                                  <Link
                                    href={`/finance/payments/new?student_id=${row.student_id}${row.program_id ? `&program_id=${row.program_id}` : ""}`}
                                    style={PRIMARY_BUTTON_STYLE}
                                  >
                                    Payment
                                  </Link>
                                  <Link
                                    href={`/student-programs/new?studentId=${row.student_id}`}
                                    style={BUTTON_STYLE}
                                  >
                                    New program
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  color: "#94a3b8",
  fontSize: 13,
};

const tdStyle: React.CSSProperties = {
  padding: "14px 10px",
  color: "#cbd5e1",
};

const tdStrongStyle: React.CSSProperties = {
  padding: "14px 10px",
  color: "#f8fafc",
  fontWeight: 700,
};