"use client";

import { useMemo, useState } from "react";
import AppShell from "../../../components/ui/AppShell";
import { supabase } from "../../../lib/supabase";
import {
  exportMultiSheetExcel,
  exportSingleSheetExcel,
  type ExcelColumn,
} from "../../../lib/exportExcel";

type DashboardExportType =
  | "revenue-trend"
  | "student-growth"
  | "attendance-trend"
  | "monthly-finance-summary";

type PaymentRow = {
  amount: number | null;
  payment_date: string | null;
  payment_status?: string | null;
};

type StudentRow = {
  id: string;
  status: string | null;
  join_date: string | null;
};

type AttendanceLogRow = {
  id: string;
  checkin_date: string | null;
};

type ExpenseRow = {
  id: string;
  expense_date: string | null;
  amount: number | null;
  category: string | null;
  description: string | null;
};

type RevenueTrendRow = {
  month: string;
  revenue: number;
};

type StudentGrowthRow = {
  month: string;
  students: number;
};

type AttendanceTrendRow = {
  date: string;
  count: number;
};

type MonthlyFinanceSummaryRow = {
  month: string;
  revenue: number;
  expense: number;
  net: number;
};

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
              lineHeight: 1.6,
              color: "#94a3b8",
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

function ExportOptionCard({
  title,
  description,
  value,
  selected,
  onSelect,
}: {
  title: string;
  description: string;
  value: DashboardExportType;
  selected: boolean;
  onSelect: (value: DashboardExportType) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 16,
        padding: 18,
        cursor: "pointer",
        background: selected ? "#172554" : "#111827",
        border: selected ? "1px solid #3b82f6" : "1px solid #1f2937",
        color: "#f8fafc",
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          marginBottom: 8,
          color: "#ffffff",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: "#94a3b8",
        }}
      >
        {description}
      </div>
    </button>
  );
}

function formatExportTypeLabel(type: DashboardExportType) {
  switch (type) {
    case "revenue-trend":
      return "Revenue Trend";
    case "student-growth":
      return "Student Growth";
    case "attendance-trend":
      return "Attendance Trend";
    case "monthly-finance-summary":
      return "Monthly Finance Summary";
    default:
      return "";
  }
}

function getDefaultStartDate() {
  const today = new Date();
  const year = today.getFullYear() - 1;
  return `${year}-01-01`;
}

function getDefaultEndDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function safeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getMonthKey(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return value.slice(0, 7);
}

function buildMonthlyRevenue(rows: PaymentRow[]): RevenueTrendRow[] {
  const map: Record<string, number> = {};

  rows.forEach((row) => {
    if (!row.payment_date) return;
    const month = row.payment_date.slice(0, 7);
    if (!map[month]) map[month] = 0;
    map[month] += safeNumber(row.amount);
  });

  return Object.keys(map)
    .sort()
    .map((month) => ({
      month,
      revenue: map[month],
    }));
}

function buildStudentGrowth(rows: StudentRow[]): StudentGrowthRow[] {
  const monthlyNewMap: Record<string, number> = {};

  rows.forEach((row) => {
    if (!row.join_date) return;
    const month = row.join_date.slice(0, 7);
    if (!monthlyNewMap[month]) monthlyNewMap[month] = 0;
    monthlyNewMap[month] += 1;
  });

  const sortedMonths = Object.keys(monthlyNewMap).sort();
  let runningTotal = 0;

  return sortedMonths.map((month) => {
    runningTotal += monthlyNewMap[month];
    return {
      month,
      students: runningTotal,
    };
  });
}

function buildAttendanceTrend(rows: AttendanceLogRow[]): AttendanceTrendRow[] {
  const dailyMap: Record<string, number> = {};

  rows.forEach((row) => {
    if (!row.checkin_date) return;
    if (!dailyMap[row.checkin_date]) dailyMap[row.checkin_date] = 0;
    dailyMap[row.checkin_date] += 1;
  });

  return Object.keys(dailyMap)
    .sort()
    .map((date) => ({
      date,
      count: dailyMap[date],
    }));
}

function buildMonthlyFinanceSummary(
  payments: PaymentRow[],
  expenses: ExpenseRow[]
): MonthlyFinanceSummaryRow[] {
  const map: Record<string, MonthlyFinanceSummaryRow> = {};

  for (const payment of payments) {
    const month = getMonthKey(payment.payment_date);
    if (!map[month]) {
      map[month] = {
        month,
        revenue: 0,
        expense: 0,
        net: 0,
      };
    }
    map[month].revenue += safeNumber(payment.amount);
  }

  for (const expense of expenses) {
    const month = getMonthKey(expense.expense_date);
    if (!map[month]) {
      map[month] = {
        month,
        revenue: 0,
        expense: 0,
        net: 0,
      };
    }
    map[month].expense += safeNumber(expense.amount);
  }

  return Object.values(map)
    .map((row) => ({
      ...row,
      net: row.revenue - row.expense,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function buildRevenueColumns(): ExcelColumn<RevenueTrendRow>[] {
  return [
    { header: "Month", key: "month", width: 14 },
    { header: "Revenue", key: "revenue", width: 16 },
  ];
}

function buildStudentGrowthColumns(): ExcelColumn<StudentGrowthRow>[] {
  return [
    { header: "Month", key: "month", width: 14 },
    { header: "Students", key: "students", width: 16 },
  ];
}

function buildAttendanceTrendColumns(): ExcelColumn<AttendanceTrendRow>[] {
  return [
    { header: "Date", key: "date", width: 16 },
    { header: "Count", key: "count", width: 14 },
  ];
}

function buildMonthlyFinanceSummaryColumns(): ExcelColumn<MonthlyFinanceSummaryRow>[] {
  return [
    { header: "Month", key: "month", width: 14 },
    { header: "Revenue", key: "revenue", width: 16 },
    { header: "Expense", key: "expense", width: 16 },
    { header: "Net", key: "net", width: 16 },
  ];
}

async function fetchPaymentsForDashboard(params: {
  startDate: string;
  endDate: string;
}): Promise<PaymentRow[]> {
  const { startDate, endDate } = params;

  const { data, error } = await supabase
    .from("payments")
    .select("amount,paid_at,payment_status")
    .gte("paid_at", startDate)
    .lte("paid_at", endDate)
    .order("paid_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const raw = (data ?? []) as { amount: number | null; paid_at: string | null; payment_status: string | null }[];
  const rows = raw
    .map((r) => ({ amount: r.amount, payment_date: r.paid_at, payment_status: r.payment_status }))
    .filter((row) => (row.payment_status ?? "completed") === "completed");
  return rows as unknown as PaymentRow[];
}

async function fetchStudentsForDashboard(params: {
  startDate: string;
  endDate: string;
}): Promise<StudentRow[]> {
  const { startDate, endDate } = params;

  const { data, error } = await supabase
    .from("students")
    .select("id,status,join_date")
    .gte("join_date", startDate)
    .lte("join_date", endDate)
    .order("join_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as StudentRow[];
}

async function fetchAttendanceForDashboard(params: {
  startDate: string;
  endDate: string;
}): Promise<AttendanceLogRow[]> {
  const { startDate, endDate } = params;

  const { data, error } = await supabase
    .from("attendance_logs")
    .select("id,checkin_date")
    .gte("checkin_date", startDate)
    .lte("checkin_date", endDate)
    .order("checkin_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as AttendanceLogRow[];
}

async function fetchExpensesForDashboard(params: {
  startDate: string;
  endDate: string;
}): Promise<ExpenseRow[]> {
  const { startDate, endDate } = params;

  const { data, error } = await supabase
    .from("expenses")
    .select(`
      id,
      expense_date,
      amount,
      description,
      expense_categories:expense_category_id ( name )
    `)
    .gte("expense_date", startDate)
    .lte("expense_date", endDate)
    .order("expense_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as { id: string; expense_date: string | null; amount: number | null; description: string | null; expense_categories: { name: string | null } | null }[];
  return rows.map((r) => ({
    id: r.id,
    expense_date: r.expense_date,
    amount: r.amount,
    category: r.expense_categories?.name ?? null,
    description: r.description,
  })) as unknown as ExpenseRow[];
}

export default function DashboardExportPage() {
  const [exportType, setExportType] =
    useState<DashboardExportType>("revenue-trend");
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fileNamePreview = useMemo(() => {
    return `dashboard-${exportType}-${startDate}-to-${endDate}.xlsx`;
  }, [exportType, startDate, endDate]);

  const dateError =
    startDate && endDate && startDate > endDate
      ? "Start date cannot be later than end date."
      : "";

  async function handleDownload() {
    try {
      setIsDownloading(true);
      setErrorMessage("");

      if (dateError) {
        throw new Error(dateError);
      }

      if (exportType === "revenue-trend") {
        const payments = await fetchPaymentsForDashboard({ startDate, endDate });
        const rows = buildMonthlyRevenue(payments);

        exportSingleSheetExcel<RevenueTrendRow>({
          fileName: fileNamePreview,
          sheetName: "Revenue Trend",
          columns: buildRevenueColumns(),
          rows,
        });
        return;
      }

      if (exportType === "student-growth") {
        const students = await fetchStudentsForDashboard({ startDate, endDate });
        const rows = buildStudentGrowth(students);

        exportSingleSheetExcel<StudentGrowthRow>({
          fileName: fileNamePreview,
          sheetName: "Student Growth",
          columns: buildStudentGrowthColumns(),
          rows,
        });
        return;
      }

      if (exportType === "attendance-trend") {
        const attendance = await fetchAttendanceForDashboard({
          startDate,
          endDate,
        });
        const rows = buildAttendanceTrend(attendance);

        exportSingleSheetExcel<AttendanceTrendRow>({
          fileName: fileNamePreview,
          sheetName: "Attendance Trend",
          columns: buildAttendanceTrendColumns(),
          rows,
        });
        return;
      }

      if (exportType === "monthly-finance-summary") {
        const [payments, expenses] = await Promise.all([
          fetchPaymentsForDashboard({ startDate, endDate }),
          fetchExpensesForDashboard({ startDate, endDate }),
        ]);

        const summaryRows = buildMonthlyFinanceSummary(payments, expenses);
        const revenueRows = buildMonthlyRevenue(payments);

        const sheets = [
          {
            sheetName: "Monthly Finance Summary",
            columns: buildMonthlyFinanceSummaryColumns().map((col) => ({
              header: col.header,
              key: String(col.key),
              width: col.width,
            })),
            rows: summaryRows as Record<string, unknown>[],
          },
          {
            sheetName: "Revenue Trend",
            columns: buildRevenueColumns().map((col) => ({
              header: col.header,
              key: String(col.key),
              width: col.width,
            })),
            rows: revenueRows as Record<string, unknown>[],
          },
        ];

        exportMultiSheetExcel(fileNamePreview, sheets);
        return;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to export dashboard data.";
      setErrorMessage(message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <AppShell
      title="Dashboard Export"
      description="Export dashboard analytics data such as revenue trend, student growth, attendance trend, and monthly finance summary."
      actions={
        <button
          type="button"
          onClick={handleDownload}
          disabled={Boolean(dateError) || isDownloading}
          style={{
            border: "1px solid #2563eb",
            background:
              Boolean(dateError) || isDownloading ? "#1f2937" : "#2563eb",
            color: "#ffffff",
            borderRadius: 12,
            padding: "12px 16px",
            fontWeight: 800,
            cursor:
              Boolean(dateError) || isDownloading ? "not-allowed" : "pointer",
            opacity: Boolean(dateError) || isDownloading ? 0.7 : 1,
          }}
        >
          {isDownloading ? "Preparing Excel..." : "Download Excel"}
        </button>
      }
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

        <SectionCard
          title="Export Type"
          description="Choose which dashboard dataset you want to export."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
            }}
          >
            <ExportOptionCard
              title="Revenue Trend"
              description="Monthly revenue trend based on completed payments."
              value="revenue-trend"
              selected={exportType === "revenue-trend"}
              onSelect={setExportType}
            />

            <ExportOptionCard
              title="Student Growth"
              description="Running student growth based on join date."
              value="student-growth"
              selected={exportType === "student-growth"}
              onSelect={setExportType}
            />

            <ExportOptionCard
              title="Attendance Trend"
              description="Attendance trend based on daily check-in logs."
              value="attendance-trend"
              selected={exportType === "attendance-trend"}
              onSelect={setExportType}
            />

            <ExportOptionCard
              title="Monthly Finance Summary"
              description="Monthly revenue, expense, and net summary."
              value="monthly-finance-summary"
              selected={exportType === "monthly-finance-summary"}
              onSelect={setExportType}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Date Range"
          description="Set the time range for the dashboard export."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <label
                htmlFor="dashboard-export-start-date"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#cbd5e1",
                }}
              >
                Start Date
              </label>
              <input
                id="dashboard-export-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  borderRadius: 12,
                  border: "1px solid #334155",
                  background: "#020617",
                  color: "#f8fafc",
                  padding: "12px 14px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label
                htmlFor="dashboard-export-end-date"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#cbd5e1",
                }}
              >
                End Date
              </label>
              <input
                id="dashboard-export-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  borderRadius: 12,
                  border: "1px solid #334155",
                  background: "#020617",
                  color: "#f8fafc",
                  padding: "12px 14px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {dateError ? (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #7f1d1d",
                background: "#450a0a",
                color: "#fecaca",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {dateError}
            </div>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Export Preview"
          description="Review export configuration before downloading."
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 14,
                background: "#111827",
                border: "1px solid #1f2937",
              }}
            >
              <div
                style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700 }}
              >
                Export Type
              </div>
              <div
                style={{ color: "#ffffff", fontSize: 14, fontWeight: 700 }}
              >
                {formatExportTypeLabel(exportType)}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 14,
                background: "#111827",
                border: "1px solid #1f2937",
              }}
            >
              <div
                style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700 }}
              >
                Date Range
              </div>
              <div
                style={{ color: "#ffffff", fontSize: 14, fontWeight: 700 }}
              >
                {startDate || "-"} to {endDate || "-"}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 14,
                background: "#111827",
                border: "1px solid #1f2937",
              }}
            >
              <div
                style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700 }}
              >
                File Name Preview
              </div>
              <div
                style={{
                  color: "#38bdf8",
                  fontSize: 14,
                  fontWeight: 800,
                  wordBreak: "break-all",
                }}
              >
                {fileNamePreview}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}