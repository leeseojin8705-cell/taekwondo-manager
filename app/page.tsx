"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import AppShell from "../components/ui/AppShell";
import BilingualText from "../components/ui/BilingualText";
import LoadingBlock from "../components/ui/LoadingBlock";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import RevenueChart from "../components/charts/RevenueChart";
import AttendanceChart from "../components/charts/AttendanceChart";
import {
  buildDailyRevenueForCurrentMonth as buildRevenueChart,
  buildEnrollmentsExitsByDay as buildEnrollmentsExits,
  buildDailyAttendance as buildAttendanceChart,
} from "../lib/dashboard-charts";

const styles = {
  section: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#94a3b8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "1px solid #1e293b",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
  },
  chartGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 20,
  },
};

type PaymentRow = {
  id: string;
  paid_at: string | null;
  payment_status: string | null;
  final_amount: number | null;
  paid_amount: number | null;
  balance_amount: number | null;
};

type StudentRow = {
  id: string;
  status: string | null;
  join_date: string | null;
};

type AttendanceRow = {
  id: string;
  attended_on: string | null;
  status: string | null;
  student_id: string | null;
};

type StudentContractRow = {
  id: string;
  student_id: string | null;
  status: string | null;
  end_date: string | null;
};

type RevenueChartData = {
  month: string; // used as day label e.g. "3/1"
  revenue: number;
};

type StudentGrowthChartData = {
  month: string;
  students: number;
};

type EnrollmentsExitsChartData = {
  date: string;
  newEnrollments: number;
  exits: number;
};

type YearMonthRow = {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  newEnrollments: number;
  exits: number;
};

type AttendanceChartData = {
  date: string;
  count: number;
};

function KpiCard({
  title,
  value,
  href,
}: {
  title: ReactNode;
  value: string | number;
  href?: string;
}) {
  const content = (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 14,
        padding: "20px 22px",
        cursor: href ? "pointer" : "default",
        transition: "border-color 0.2s, background 0.2s, transform 0.15s",
      }}
      onMouseEnter={href ? (e) => {
        e.currentTarget.style.borderColor = "#334155";
        e.currentTarget.style.background = "#1e293b";
        e.currentTarget.style.transform = "translateY(-2px)";
      } : undefined}
      onMouseLeave={href ? (e) => {
        e.currentTarget.style.borderColor = "#1e293b";
        e.currentTarget.style.background = "#0f172a";
        e.currentTarget.style.transform = "translateY(0)";
      } : undefined}
    >
      <div style={{ color: "#64748b", fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
        {title}
      </div>
      <div style={{ color: "#f8fafc", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>
        {value}
      </div>
    </div>
  );

  if (!href) return content;
  return <Link href={href} style={{ display: "block", textDecoration: "none", color: "inherit" }}>{content}</Link>;
}

function AlertCard({
  title,
  value,
  tone,
  href,
}: {
  title: ReactNode;
  value: string | number;
  tone: "red" | "yellow" | "blue";
  href?: string;
}) {
  const toneStyle = {
    red: { border: "1px solid #7f1d1d", background: "rgba(239,68,68,0.1)", color: "#fca5a5" },
    yellow: { border: "1px solid #92400e", background: "rgba(245,158,11,0.1)", color: "#fde047" },
    blue: { border: "1px solid #1d4ed8", background: "rgba(59,130,246,0.1)", color: "#93c5fd" },
  } as const;
  const s = toneStyle[tone];
  const content = (
    <div
      style={{
        border: s.border,
        background: s.background,
        borderRadius: 14,
        padding: "18px 20px",
        cursor: href ? "pointer" : "default",
        transition: "transform 0.15s, box-shadow 0.2s",
      }}
      onMouseEnter={href ? (e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
      } : undefined}
      onMouseLeave={href ? (e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      } : undefined}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>
        {value}
      </div>
    </div>
  );
  if (!href) return content;
  return <Link href={href} style={{ display: "block", textDecoration: "none", color: "inherit" }}>{content}</Link>;
}

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value ?? 0));
}

function safeNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getPastDateKey(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateKey(date);
}

export default function DashboardPage() {
  const [revenueChartData, setRevenueChartData] = useState<RevenueChartData[]>([]);
  const [enrollmentsExitsData, setEnrollmentsExitsData] = useState<EnrollmentsExitsChartData[]>([]);
  const [attendanceTrendData, setAttendanceTrendData] = useState<AttendanceChartData[]>([]);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [studentContracts, setStudentContracts] = useState<StudentContractRow[]>([]);
  const [unpaidInvoicesCount, setUnpaidInvoicesCount] = useState(0);
  const [yearTableData, setYearTableData] = useState<YearMonthRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [amountLoadError, setAmountLoadError] = useState<string | null>(null);

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    setErrorMessage("");
    setAmountLoadError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/home");
      const data = await res.json().catch(() => ({}));
      const paymentRows = (data.payments ?? []) as PaymentRow[];
      const studentRows = (data.students ?? []) as StudentRow[];
      const homePaymentsError = data.paymentsError ?? null;
      const homeInvoicesError = data.invoicesError ?? null;
      const rawAttendance = (data.attendance ?? []) as Array<{ id: string; checkin_date: string | null; student_id: string | null }>;
      const attendanceDataRows: AttendanceRow[] = rawAttendance.map((r) => ({
        id: r.id,
        attended_on: r.checkin_date ?? null,
        status: "present",
        student_id: r.student_id ?? null,
      }));
      const contractRows = (data.studentContracts ?? []) as StudentContractRow[];
      setRevenueChartData(buildRevenueChart(paymentRows));
      setEnrollmentsExitsData(buildEnrollmentsExits(studentRows, contractRows, 14));
      setAttendanceTrendData(buildAttendanceChart(attendanceDataRows, 14));
      setPayments(paymentRows);
      setStudents(studentRows);
      setAttendanceRows(attendanceDataRows);
      setStudentContracts(contractRows);
      setUnpaidInvoicesCount(Number(data.unpaidInvoicesCount ?? 0));

      const yearRes = await fetch("/api/finance/yearly");
      const yearJson = await yearRes.json().catch(() => ({}));
      const yearlyPaymentsError = yearJson.paymentsError ?? null;
      const yearlyExpensesError = yearJson.expensesError ?? null;
      const currentYear = new Date().getFullYear();
      let monthly = (yearJson.byYearMonth?.[String(currentYear)] ?? []) as YearMonthRow[];
      if (monthly.length === 0) {
        monthly = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => ({
          month: `${m}월`,
          revenue: 0,
          expenses: 0,
          profit: 0,
          newEnrollments: 0,
          exits: 0,
        }));
      }
      setYearTableData(monthly);

      const errs: string[] = [];
      if (homePaymentsError) errs.push(`결제: ${homePaymentsError}`);
      if (homeInvoicesError) errs.push(`청구: ${homeInvoicesError}`);
      if (yearlyPaymentsError) errs.push(`연간 수입: ${yearlyPaymentsError}`);
      if (yearlyExpensesError) errs.push(`연간 지출: ${yearlyExpensesError}`);
      setAmountLoadError(errs.length > 0 ? errs.join(" / ") : null);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  const kpis = useMemo(() => {
    const todayStr = toDateKey(new Date());

    const totalStudents = students.length;

    const activeStudents = students.filter(
      (row) => (row.status ?? "").toLowerCase() === "active"
    ).length;

    const todayAttendance = attendanceRows.filter(
      (row) => row.attended_on === todayStr
    ).length;

    const outstandingBalance = payments.reduce(
      (sum, row) => sum + safeNumber(row.balance_amount),
      0
    );

    return {
      totalStudents,
      activeStudents,
      todayAttendance,
      outstandingBalance,
    };
  }, [students, attendanceRows, payments]);

  const alerts = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = getPastDateKey(30);

    const studentsWithBalance = payments.filter(
      (row) => safeNumber(row.balance_amount) > 0
    ).length;

    const expiringMemberships = studentContracts.filter((row) => {
      if (!row.end_date) return false;
      if ((row.status ?? "").toLowerCase() !== "active") return false;

      const end = new Date(row.end_date);
      const diff = Math.ceil(
        (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      return diff >= 0 && diff <= 30;
    }).length;

    const attendanceCountByStudent: Record<string, number> = {};

    attendanceRows.forEach((row) => {
      if (!row.student_id) return;
      if (!row.attended_on) return;
      if (row.attended_on < thirtyDaysAgo) return;
      if ((row.status ?? "").toLowerCase() !== "present") return;

      if (!attendanceCountByStudent[row.student_id]) {
        attendanceCountByStudent[row.student_id] = 0;
      }

      attendanceCountByStudent[row.student_id] += 1;
    });

    const lowAttendanceStudents = students.filter((student) => {
      const count = attendanceCountByStudent[student.id] ?? 0;
      return count > 0 && count <= 4;
    }).length;

    return {
      studentsWithBalance,
      expiringMemberships,
      lowAttendanceStudents,
    };
  }, [payments, studentContracts, attendanceRows, students]);

  if (loading) {
    return (
      <AppShell title="Dashboard" description="System home. Summary, alerts, and quick navigation.">
        <LoadingBlock message="Loading dashboard..." />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Dashboard"
      description="System home. Summary, alerts, and quick navigation."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 1400 }}>
        {errorMessage ? (
          <div
            style={{
              border: "1px solid #7f1d1d",
              background: "rgba(127,29,29,0.2)",
              color: "#fca5a5",
              borderRadius: 14,
              padding: "14px 20px",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {errorMessage}
          </div>
        ) : null}
        {amountLoadError ? (
          <div
            style={{
              border: "1px solid #92400e",
              background: "rgba(245,158,11,0.1)",
              color: "#fde047",
              borderRadius: 14,
              padding: "14px 20px",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            금액 데이터 연동 오류 — 수입/지출이 0으로 나올 수 있습니다. {amountLoadError}
          </div>
        ) : null}

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 12,
            alignSelf: "flex-start",
          }}
        >
          <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>
            <BilingualText en="Current headcount" ko="현재 인원" />
          </span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>{kpis.activeStudents}</span>
        </div>

        <div style={styles.kpiGrid}>
          <KpiCard title={<BilingualText en="Total Students" ko="전체 학생" />} value={kpis.totalStudents} href="/students" />
          <KpiCard title={<BilingualText en="Active Students" ko="재원생" />} value={kpis.activeStudents} href="/students" />
          <KpiCard title={<BilingualText en="Today Attendance" ko="오늘 출석" />} value={kpis.todayAttendance} href="/attendance" />
          <KpiCard
            title={<BilingualText en="Outstanding Balance" ko="미수금" />}
            value={formatMoney(kpis.outstandingBalance)}
            href="/finance"
          />
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            <BilingualText en="Alerts" ko="알림" />
          </div>
          <div style={styles.kpiGrid}>
            <AlertCard
              title={<BilingualText en="Students With Balance" ko="잔액 있는 학생" />}
              value={alerts.studentsWithBalance}
              tone="red"
              href="/alerts"
            />
            <AlertCard
              title={<BilingualText en="Unpaid Invoices" ko="미결제 청구" />}
              value={unpaidInvoicesCount}
              tone="red"
              href="/finance/invoices"
            />
            <AlertCard
              title={<BilingualText en="Memberships Expiring in 30 Days" ko="30일 이내 만료" />}
              value={alerts.expiringMemberships}
              tone="yellow"
              href="/renewals"
            />
            <AlertCard
              title={<BilingualText en="Low Attendance Students" ko="출석 부족" />}
              value={alerts.lowAttendanceStudents}
              tone="blue"
              href="/alerts"
            />
          </div>
        </div>

        <div style={styles.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={styles.sectionTitle}>
              {new Date().getFullYear()}년 <BilingualText en="(Jan–Dec)" ko="1월~12월" />
            </div>
            <Link
              href="/finance/yearly"
              style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}
            >
              <BilingualText en="View details" ko="자세히 보기" /> →
            </Link>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: "#94a3b8", fontWeight: 600 }}>기간</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", color: "#94a3b8", fontWeight: 600 }}>수입</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", color: "#94a3b8", fontWeight: 600 }}>지출</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", color: "#94a3b8", fontWeight: 600 }}>순이익</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", color: "#94a3b8", fontWeight: 600 }}>입관</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", color: "#94a3b8", fontWeight: 600 }}>퇴관</th>
                </tr>
              </thead>
              <tbody>
                {yearTableData.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 16, color: "#64748b", textAlign: "center" }}>
                      <BilingualText en="No data for this year." ko="당해 데이터 없음" />
                    </td>
                  </tr>
                ) : (
                  yearTableData.map((row) => (
                    <tr key={row.month} style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "8px 10px", color: "#f1f5f9", fontWeight: 500 }}>{row.month}</td>
                      <td style={{ padding: "8px 10px", color: "#94a3b8", textAlign: "right" }}>{formatMoney(row.revenue)}</td>
                      <td style={{ padding: "8px 10px", color: "#94a3b8", textAlign: "right" }}>{formatMoney(row.expenses)}</td>
                      <td style={{ padding: "8px 10px", color: "#94a3b8", textAlign: "right" }}>{formatMoney(row.profit)}</td>
                      <td style={{ padding: "8px 10px", color: "#94a3b8", textAlign: "right" }}>{row.newEnrollments}</td>
                      <td style={{ padding: "8px 10px", color: "#94a3b8", textAlign: "right" }}>{row.exits}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            <BilingualText en="Daily revenue (this month)" ko="일 매출 (당월 1달 추이)" />
          </div>
          <RevenueChart data={revenueChartData} />
        </div>

        <div style={styles.chartGrid}>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <BilingualText en="Enrollments / Exits" ko="입관 / 퇴관" />
            </div>
            {enrollmentsExitsData.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: 14 }}>
                <BilingualText en="No data." ko="데이터 없음" />
              </p>
            ) : (
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={enrollmentsExitsData} margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10 }}
                      labelStyle={{ color: "#f1f5f9" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="newEnrollments" name="입관" fill="#64748b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="exits" name="퇴관" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <BilingualText en="Daily attendance" ko="일 출석" />
            </div>
            <AttendanceChart data={attendanceTrendData} />
          </div>
        </div>

      </div>
    </AppShell>
  );
}
