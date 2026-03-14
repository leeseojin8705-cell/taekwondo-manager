"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/ui/AppShell";
import { supabase } from "../../lib/supabase";

type RelationName =
  | {
      name: string | null;
    }
  | {
      name: string | null;
    }[]
  | null;

type RelationStudent =
  | {
      id?: string;
      name: string | null;
    }
  | {
      id?: string;
      name: string | null;
    }[]
  | null;

type OverduePaymentRow = {
  id: string;
  due_date: string | null;
  payment_category: string | null;
  description: string | null;
  payment_status: string | null;
  final_amount: number | null;
  paid_amount: number | null;
  balance_amount: number | null;
  students: RelationStudent;
};

type ExpiringMembershipRow = {
  id: string;
  student_id: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  weekly_frequency: number | null;
  students: RelationStudent;
};

type StudentAttendanceAggregate = {
  studentId: string;
  studentName: string;
  className: string;
  attendanceCount: number;
};

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string | number;
  description: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #1e293b",
        background: "#0f172a",
        borderRadius: 18,
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "#94a3b8",
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 32,
          fontWeight: 900,
          color: "#ffffff",
          marginBottom: 8,
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 14,
          color: "#94a3b8",
          lineHeight: 1.6,
        }}
      >
        {description}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #1e293b",
        background: "#0f172a",
        borderRadius: 18,
        padding: 20,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            color: "#ffffff",
          }}
        >
          {title}
        </h2>

        {description ? (
          <p
            style={{
              margin: "8px 0 0 0",
              fontSize: 14,
              color: "#94a3b8",
              lineHeight: 1.6,
            }}
          >
            {description}
          </p>
        ) : null}
      </div>

      {children}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        border: "1px dashed #334155",
        background: "#020617",
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: "#ffffff",
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 14,
          color: "#94a3b8",
          lineHeight: 1.6,
        }}
      >
        {description}
      </div>
    </div>
  );
}

function getRelationName(value: RelationName | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value[0]?.name ?? "";
  }
  return value.name ?? "";
}

function getStudentName(value: RelationStudent | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value[0]?.name ?? "";
  }
  return value.name ?? "";
}

function getStudentId(value: RelationStudent | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value[0]?.id ?? "";
  }
  return value.id ?? "";
}

function formatMoney(value: number | null | undefined) {
  const amount = typeof value === "number" ? value : 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return value;
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function getFutureDateString(days: number) {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function getPastDateString(days: number) {
  const prev = new Date();
  prev.setDate(prev.getDate() - days);
  return prev.toISOString().slice(0, 10);
}

async function fetchOverduePayments(): Promise<OverduePaymentRow[]> {
  const today = getTodayDateString();

  const { data, error } = await supabase
    .from("payments")
    .select(
      `
        id,
        due_date,
        payment_category,
        description,
        payment_status,
        final_amount,
        paid_amount,
        balance_amount,
        students:student_id (
          id,
          name
        )
      `
    )
    .lt("due_date", today)
    .gt("balance_amount", 0)
    .order("due_date", { ascending: true });

  if (error) return [];
  return (data ?? []) as unknown as OverduePaymentRow[];
}

async function fetchExpiringMemberships(): Promise<ExpiringMembershipRow[]> {
  const today = getTodayDateString();
  const limitDate = getFutureDateString(30);

  const { data, error } = await supabase
    .from("student_contracts")
    .select(
      `
        id,
        student_id,
        status,
        start_date,
        end_date,
        students:student_id (
          id,
          name
        )
      `
    )
    .gte("end_date", today)
    .lte("end_date", limitDate)
    .order("end_date", { ascending: true });

  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    ...r,
    weekly_frequency: (r.weekly_frequency as number | undefined) ?? null,
  })) as unknown as ExpiringMembershipRow[];
}

async function fetchLowAttendanceStudents(): Promise<StudentAttendanceAggregate[]> {
  const startDate = getPastDateString(30);
  const endDate = getTodayDateString();

  const { data, error } = await supabase
    .from("attendance_logs")
    .select(
      `
        student_id,
        students:student_id (
          id,
          name
        )
      `
    )
    .gte("checkin_date", startDate)
    .lte("checkin_date", endDate);

  if (error) return [];

  const rows = (data ?? []) as unknown as Array<{
    student_id: string | null;
    students:
      | { id?: string; name: string | null; classes?: RelationName }
      | { id?: string; name: string | null; classes?: RelationName }[]
      | null;
  }>;

  const map: Record<string, StudentAttendanceAggregate> = {};

  for (const row of rows) {
    const rawStudent = Array.isArray(row.students) ? row.students[0] : row.students;
    const studentId = rawStudent?.id ?? row.student_id ?? "";
    const studentName = rawStudent?.name ?? "Unknown Student";
    const className = getRelationName(rawStudent?.classes);

    if (!studentId) continue;

    if (!map[studentId]) {
      map[studentId] = {
        studentId,
        studentName,
        className,
        attendanceCount: 0,
      };
    }

    map[studentId].attendanceCount += 1;
  }

  return Object.values(map)
    .filter((row) => row.attendanceCount <= 4)
    .sort((a, b) => a.attendanceCount - b.attendanceCount);
}

export default function AlertsPage() {
  const [overduePayments, setOverduePayments] = useState<OverduePaymentRow[]>(
    []
  );
  const [expiringMemberships, setExpiringMemberships] = useState<
    ExpiringMembershipRow[]
  >([]);
  const [lowAttendanceStudents, setLowAttendanceStudents] = useState<
    StudentAttendanceAggregate[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadAlerts() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [payments, memberships, lowAttendance] = await Promise.all([
          fetchOverduePayments(),
          fetchExpiringMemberships(),
          fetchLowAttendanceStudents(),
        ]);

        setOverduePayments(payments);
        setExpiringMemberships(memberships);
        setLowAttendanceStudents(lowAttendance);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load alerts.";
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadAlerts();
  }, []);

  const totalOverdueBalance = useMemo(() => {
    return overduePayments.reduce((sum, row) => {
      const balance =
        typeof row.balance_amount === "number" ? row.balance_amount : 0;
      return sum + balance;
    }, 0);
  }, [overduePayments]);

  return (
    <AppShell
      title="Alerts Center"
      description="Operational alerts for overdue payments, expiring memberships, and low attendance students. This page belongs to Layer 4 and reads existing records only."
    >
      <div style={{ display: "grid", gap: 20 }}>
        {errorMessage ? (
          <div
            style={{
              border: "1px solid #7f1d1d",
              background: "#450a0a",
              color: "#fecaca",
              borderRadius: 16,
              padding: 16,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <SummaryCard
            title="Overdue Payments"
            value={overduePayments.length}
            description="Payment records with past due date and remaining balance."
          />

          <SummaryCard
            title="Overdue Balance"
            value={formatMoney(totalOverdueBalance)}
            description="Current total overdue balance."
          />

          <SummaryCard
            title="Expiring Memberships"
            value={expiringMemberships.length}
            description="Memberships ending within the next 30 days."
          />

          <SummaryCard
            title="Low Attendance Students"
            value={lowAttendanceStudents.length}
            description="Students with 4 or fewer present records in the last 30 days."
          />
        </div>

        <SectionCard
          title="Overdue Payments"
          description="Students with unpaid balances past the due date."
        >
          {isLoading ? (
            <div style={{ color: "#94a3b8" }}>Loading...</div>
          ) : overduePayments.length === 0 ? (
            <EmptyState
              title="No overdue payments"
              description="There are currently no overdue payment alerts."
            />
          ) : (
            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              {overduePayments.map((row) => {
                const studentName = getStudentName(row.students);
                const studentId = getStudentId(row.students);

                return (
                  <div
                    key={row.id}
                    style={{
                      border: "1px solid #1f2937",
                      background: "#111827",
                      borderRadius: 14,
                      padding: 16,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: "#ffffff",
                          }}
                        >
                          {studentName || "Unknown Student"}
                        </div>

                        <div
                          style={{
                            fontSize: 13,
                            color: "#94a3b8",
                          }}
                        >
                          Due: {formatDate(row.due_date)}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 900,
                          color: "#f87171",
                        }}
                      >
                        {formatMoney(row.balance_amount)}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        color: "#cbd5e1",
                        lineHeight: 1.6,
                      }}
                    >
                      Category: {row.payment_category ?? "-"} | Status:{" "}
                      {row.payment_status ?? "-"} | Description:{" "}
                      {row.description ?? "-"}
                    </div>

                    {studentId ? (
                      <div>
                        <Link
                          href={`/students/${studentId}`}
                          style={{
                            color: "#38bdf8",
                            textDecoration: "none",
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          Open Student Detail
                        </Link>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Membership Expiring Soon"
          description="Memberships ending within the next 30 days."
        >
          {isLoading ? (
            <div style={{ color: "#94a3b8" }}>Loading...</div>
          ) : expiringMemberships.length === 0 ? (
            <EmptyState
              title="No expiring memberships"
              description="There are currently no membership expiration alerts."
            />
          ) : (
            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              {expiringMemberships.map((row) => {
                const studentName = getStudentName(row.students);
                const studentId = getStudentId(row.students);

                return (
                  <div
                    key={row.id}
                    style={{
                      border: "1px solid #1f2937",
                      background: "#111827",
                      borderRadius: 14,
                      padding: 16,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: "#ffffff",
                          }}
                        >
                          {studentName || "Unknown Student"}
                        </div>

                        <div
                          style={{
                            fontSize: 13,
                            color: "#94a3b8",
                          }}
                        >
                          End Date: {formatDate(row.end_date)}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#facc15",
                        }}
                      >
                        {row.status ?? "-"}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        color: "#cbd5e1",
                        lineHeight: 1.6,
                      }}
                    >
                      Weekly Frequency: {row.weekly_frequency ?? "-"} | Start
                      Date: {formatDate(row.start_date)}
                    </div>

                    {studentId ? (
                      <div>
                        <Link
                          href={`/students/${studentId}`}
                          style={{
                            color: "#38bdf8",
                            textDecoration: "none",
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          Open Student Detail
                        </Link>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Low Attendance Students"
          description="Students with 4 or fewer present attendance records in the last 30 days."
        >
          {isLoading ? (
            <div style={{ color: "#94a3b8" }}>Loading...</div>
          ) : lowAttendanceStudents.length === 0 ? (
            <EmptyState
              title="No low attendance alerts"
              description="There are currently no low attendance students based on the last 30 days."
            />
          ) : (
            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              {lowAttendanceStudents.map((row) => (
                <div
                  key={row.studentId}
                  style={{
                    border: "1px solid #1f2937",
                    background: "#111827",
                    borderRadius: 14,
                    padding: 16,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: "#ffffff",
                        }}
                      >
                        {row.studentName}
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          color: "#94a3b8",
                        }}
                      >
                        Class: {row.className || "-"}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 900,
                        color: "#f97316",
                      }}
                    >
                      {row.attendanceCount} present
                    </div>
                  </div>

                  <div>
                    <Link
                      href={`/students/${row.studentId}`}
                      style={{
                        color: "#38bdf8",
                        textDecoration: "none",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      Open Student Detail
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}