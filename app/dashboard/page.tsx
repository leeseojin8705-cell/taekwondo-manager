"use client";

import { useEffect, useState } from "react";
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
import AppShell from "../../components/ui/AppShell";
import LoadingBlock from "../../components/ui/LoadingBlock";
import RevenueCards from "../../components/dashboard/RevenueCards";
import PaymentAlertsPanel from "../../components/dashboard/PaymentAlertsPanel";
import LowStockPanel from "../../components/dashboard/LowStockPanel";
import PageCard from "../../components/ui/PageCard";
import RevenueChart from "../../components/charts/RevenueChart";
import AttendanceChart from "../../components/charts/AttendanceChart";
import {
  buildDailyRevenueForCurrentMonth,
  buildEnrollmentsExitsByDay,
  buildDailyAttendance,
  type RevenueChartData,
  type EnrollmentsExitsChartData,
  type AttendanceChartData,
} from "../../lib/dashboard-charts";

type SummaryRow = {
  today_revenue: number;
  month_revenue: number;
  active_students_count: number;
  unpaid_students_count: number;
  low_stock_count: number;
};

type AttendanceRow = {
  today_attendance_count: number;
  regular_count: number;
  makeup_count: number;
};

type AlertRow = {
  id: string;
  student_id: string | null;
  student_name: string | null;
  payment_category: string;
  description: string | null;
  final_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: string;
  due_date: string | null;
  is_overdue: boolean;
};

type LowStockRow = {
  id: string;
  item_name: string;
  stock_qty: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryRow | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow | null>(null);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [lowStock, setLowStock] = useState<LowStockRow[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<Array<{ month_start: string; billed_revenue: number; collected_revenue: number; outstanding_balance: number; total_expense: number; net_cash_flow: number }>>([]);

  const [revenueChartData, setRevenueChartData] = useState<RevenueChartData[]>([]);
  const [enrollmentsExitsData, setEnrollmentsExitsData] = useState<EnrollmentsExitsChartData[]>([]);
  const [attendanceTrendData, setAttendanceTrendData] = useState<AttendanceChartData[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [dashboardRes, homeRes] = await Promise.all([
          fetch("/api/dashboard/data"),
          fetch("/api/home"),
        ]);
        const data = await dashboardRes.json();
        setSummary(data.summary ?? null);
        setAttendance(data.attendance ?? null);
        setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
        setLowStock(Array.isArray(data.lowStock) ? data.lowStock : []);
        setMonthlySummary(Array.isArray(data.monthlySummary) ? data.monthlySummary : []);

        const homeData = await homeRes.json().catch(() => ({}));
        const paymentRows = (homeData.payments ?? []) as Array<{ paid_at: string | null; paid_amount?: number | null; final_amount?: number | null }>;
        const studentRows = (homeData.students ?? []) as Array<{ join_date: string | null }>;
        const contractRows = (homeData.studentContracts ?? []) as Array<{ end_date: string | null; student_id: string | null }>;
        const rawAttendance = (homeData.attendance ?? []) as Array<{ checkin_date: string | null }>;
        const attendanceRows = rawAttendance.map((r) => ({ attended_on: r.checkin_date ?? null }));

        setRevenueChartData(buildDailyRevenueForCurrentMonth(paymentRows));
        setEnrollmentsExitsData(buildEnrollmentsExitsByDay(studentRows, contractRows, 14));
        setAttendanceTrendData(buildDailyAttendance(attendanceRows, 14));
      } catch {
        setSummary(null);
        setAttendance(null);
        setAlerts([]);
        setLowStock([]);
        setMonthlySummary([]);
        setRevenueChartData([]);
        setEnrollmentsExitsData([]);
        setAttendanceTrendData([]);
      }
      setLoading(false);
    }

    load();
  }, []);

  return (
    <AppShell title="Dashboard">
      {loading ? (
        <LoadingBlock />
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          <RevenueCards summary={summary} attendance={attendance} />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.8fr",
              gap: 20,
            }}
          >
            <PaymentAlertsPanel alerts={alerts} />
            <LowStockPanel items={lowStock} />
          </div>

          <PageCard
            title="Monthly Finance Summary"
            subtitle="Collected revenue, billed revenue, expense, outstanding"
          >
            <FinanceSummaryTable rows={monthlySummary} />
          </PageCard>

          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 20, padding: 24 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #1e293b" }}>
              Daily revenue (this month)
            </div>
            <RevenueChart data={revenueChartData} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 20, padding: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #1e293b" }}>
                Enrollments / Exits
              </div>
              {enrollmentsExitsData.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: 14 }}>No data.</p>
              ) : (
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={enrollmentsExitsData} margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10 }} labelStyle={{ color: "#f1f5f9" }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="newEnrollments" name="입관" fill="#64748b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="exits" name="퇴관" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 20, padding: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #1e293b" }}>
                Daily attendance
              </div>
              <AttendanceChart data={attendanceTrendData} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}


function FinanceSummaryTable({ rows }: { rows: Array<{ month_start: string; billed_revenue: number; collected_revenue: number; outstanding_balance: number; total_expense: number; net_cash_flow: number }> }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#0b1220" }}>
            {["Month", "Billed", "Collected", "Outstanding", "Expense", "Net Cash Flow"].map((head) => (
              <th
                key={head}
                style={{
                  textAlign: "left",
                  padding: 12,
                  borderBottom: "1px solid #1f2937",
                  color: "#93c5fd",
                }}
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month_start}>
              <td style={cellStyle}>{row.month_start}</td>
              <td style={cellStyle}>${Number(row.billed_revenue ?? 0).toFixed(2)}</td>
              <td style={cellStyle}>${Number(row.collected_revenue ?? 0).toFixed(2)}</td>
              <td style={cellStyle}>${Number(row.outstanding_balance ?? 0).toFixed(2)}</td>
              <td style={cellStyle}>${Number(row.total_expense ?? 0).toFixed(2)}</td>
              <td style={cellStyle}>${Number(row.net_cash_flow ?? 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #1f2937",
  color: "#e5e7eb",
};