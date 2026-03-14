"use client";

import { useMemo, useState } from "react";
import AppShell from "../../../components/ui/AppShell";
import {
  exportSingleSheetExcel,
  type ExcelColumn,
} from "../../../lib/exportExcel";

type FinanceExportType =
  | "payments"
  | "expenses"
  | "payment-summary"
  | "monthly-finance-summary";

type PaymentRelationStudent =
  | {
      name: string | null;
    }
  | {
      name: string | null;
    }[]
  | null;

type PaymentRow = {
  id: string;
  payment_date: string | null;
  due_date: string | null;
  payment_category: string | null;
  description: string | null;
  payment_method: string | null;
  payment_status: string | null;
  base_amount: number | null;
  discount_amount: number | null;
  final_amount: number | null;
  paid_amount: number | null;
  balance_amount: number | null;
  note: string | null;
  students: PaymentRelationStudent;
};

type ExpenseRow = {
  id: string;
  expense_date: string | null;
  category: string | null;
  amount: number | null;
  description: string | null;
  note: string | null;
};

type PaymentExportRow = {
  paymentDate: string;
  dueDate: string;
  studentName: string;
  category: string;
  description: string;
  paymentMethod: string;
  paymentStatus: string;
  baseAmount: number | "";
  discountAmount: number | "";
  finalAmount: number | "";
  paidAmount: number | "";
  balanceAmount: number | "";
  note: string;
};

type ExpenseExportRow = {
  expenseDate: string;
  category: string;
  amount: number | "";
  description: string;
  note: string;
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
  value: FinanceExportType;
  selected: boolean;
  onSelect: (value: FinanceExportType) => void;
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

function formatExportTypeLabel(type: FinanceExportType) {
  switch (type) {
    case "payments":
      return "Payments";
    case "expenses":
      return "Expenses";
    case "payment-summary":
      return "Payment Summary";
    case "monthly-finance-summary":
      return "Monthly Finance Summary";
    default:
      return "";
  }
}

function getDefaultStartDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function getDefaultEndDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRelationStudentName(value: PaymentRelationStudent | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value[0]?.name ?? "";
  }
  return value.name ?? "";
}

function buildPaymentColumns(): ExcelColumn<PaymentExportRow>[] {
  return [
    { header: "Payment Date", key: "paymentDate", width: 16 },
    { header: "Due Date", key: "dueDate", width: 16 },
    { header: "Student Name", key: "studentName", width: 24 },
    { header: "Category", key: "category", width: 18 },
    { header: "Description", key: "description", width: 28 },
    { header: "Payment Method", key: "paymentMethod", width: 18 },
    { header: "Payment Status", key: "paymentStatus", width: 18 },
    { header: "Base Amount", key: "baseAmount", width: 14 },
    { header: "Discount Amount", key: "discountAmount", width: 16 },
    { header: "Final Amount", key: "finalAmount", width: 14 },
    { header: "Paid Amount", key: "paidAmount", width: 14 },
    { header: "Balance Amount", key: "balanceAmount", width: 16 },
    { header: "Note", key: "note", width: 28 },
  ];
}

function buildExpenseColumns(): ExcelColumn<ExpenseExportRow>[] {
  return [
    { header: "Expense Date", key: "expenseDate", width: 16 },
    { header: "Category", key: "category", width: 18 },
    { header: "Amount", key: "amount", width: 14 },
    { header: "Description", key: "description", width: 28 },
    { header: "Note", key: "note", width: 28 },
  ];
}

function buildPaymentExportRows(rows: PaymentRow[]): PaymentExportRow[] {
  return rows.map((row) => ({
    paymentDate: row.payment_date ?? "",
    dueDate: row.due_date ?? "",
    studentName: getRelationStudentName(row.students),
    category: row.payment_category ?? "",
    description: row.description ?? "",
    paymentMethod: row.payment_method ?? "",
    paymentStatus: row.payment_status ?? "",
    baseAmount: row.base_amount ?? "",
    discountAmount: row.discount_amount ?? "",
    finalAmount: row.final_amount ?? "",
    paidAmount: row.paid_amount ?? "",
    balanceAmount: row.balance_amount ?? "",
    note: row.note ?? "",
  }));
}

function buildExpenseExportRows(rows: ExpenseRow[]): ExpenseExportRow[] {
  return rows.map((row) => ({
    expenseDate: row.expense_date ?? "",
    category: row.category ?? "",
    amount: row.amount ?? "",
    description: row.description ?? "",
    note: row.note ?? "",
  }));
}

async function fetchPaymentsForExport(params: {
  startDate: string;
  endDate: string;
}): Promise<PaymentRow[]> {
  const { startDate, endDate } = params;
  const res = await fetch("/api/finance/payments?limit=5000");
  const json = await res.json().catch(() => []);
  const rows = (Array.isArray(json) ? json : []) as Array<{
    id: string;
    payment_date: string | null;
    amount: number | null;
    payment_status: string | null;
    students:
      | {
          full_name: string | null;
          name: string | null;
        }
      | {
          full_name: string | null;
          name: string | null;
        }[]
      | null;
  }>;

  const filtered = rows.filter((r) => {
    const d = r.payment_date ?? "";
    if (!d) return false;
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  return filtered.map((r) => ({
    id: r.id,
    payment_date: r.payment_date,
    due_date: null,
    payment_category: null,
    description: null,
    payment_method: null,
    payment_status: r.payment_status,
    base_amount: null,
    discount_amount: null,
    final_amount: r.amount,
    paid_amount: r.amount,
    balance_amount: null,
    note: null,
    students: r.students as PaymentRelationStudent,
  }));
}

async function fetchExpensesForExport(params: {
  startDate: string;
  endDate: string;
}): Promise<ExpenseRow[]> {
  const { startDate, endDate } = params;
  const res = await fetch("/api/finance/expenses?limit=5000");
  const json = await res.json().catch(() => []);
  const rows = (Array.isArray(json) ? json : []) as Array<{
    id: string;
    expense_date: string | null;
    amount: number | null;
    description: string | null;
    note: string | null;
    expense_categories: { name: string | null } | null;
  }>;

  const filtered = rows.filter((r) => {
    const d = r.expense_date ?? "";
    if (!d) return false;
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  return filtered.map((r) => ({
    id: r.id,
    expense_date: r.expense_date,
    category: r.expense_categories?.name ?? null,
    amount: r.amount,
    description: r.description,
    note: r.note,
  }));
}

export default function FinanceExportPage() {
  const [exportType, setExportType] =
    useState<FinanceExportType>("payments");
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate());
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fileNamePreview = useMemo(() => {
    const safeStart = startDate || "start";
    const safeEnd = endDate || "end";
    return `finance-${exportType}-${safeStart}-to-${safeEnd}.xlsx`;
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

      if (exportType === "payments") {
        const paymentRows = await fetchPaymentsForExport({ startDate, endDate });
        const exportRows = buildPaymentExportRows(paymentRows);

        exportSingleSheetExcel<PaymentExportRow>({
          fileName: fileNamePreview,
          sheetName: "Payments",
          columns: buildPaymentColumns(),
          rows: exportRows,
        });

        return;
      }

      if (exportType === "expenses") {
        const expenseRows = await fetchExpensesForExport({ startDate, endDate });
        const exportRows = buildExpenseExportRows(expenseRows);

        exportSingleSheetExcel<ExpenseExportRow>({
          fileName: fileNamePreview,
          sheetName: "Expenses",
          columns: buildExpenseColumns(),
          rows: exportRows,
        });

        return;
      }

      throw new Error(
        "Payment Summary and Monthly Finance Summary will be connected in the next step."
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to export finance data.";
      setErrorMessage(message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <AppShell
      title="Finance Export"
      description="Export finance data into Excel. This page belongs to Layer 4 and reads existing finance records only."
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
          description="Choose which finance dataset you want to export."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
            }}
          >
            <ExportOptionCard
              title="Payments"
              description="Export payment records such as status, paid amount, balance, due date, and payment method."
              value="payments"
              selected={exportType === "payments"}
              onSelect={setExportType}
            />

            <ExportOptionCard
              title="Expenses"
              description="Export expense records including category, amount, expense date, and description."
              value="expenses"
              selected={exportType === "expenses"}
              onSelect={setExportType}
            />

            <ExportOptionCard
              title="Payment Summary"
              description="Summary export will be connected after payments and expenses real export is stabilized."
              value="payment-summary"
              selected={exportType === "payment-summary"}
              onSelect={setExportType}
            />

            <ExportOptionCard
              title="Monthly Finance Summary"
              description="Monthly summary export will be connected in the next step."
              value="monthly-finance-summary"
              selected={exportType === "monthly-finance-summary"}
              onSelect={setExportType}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Date Range"
          description="Set the date range for the finance export."
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
                htmlFor="finance-export-start-date"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#cbd5e1",
                }}
              >
                Start Date
              </label>
              <input
                id="finance-export-start-date"
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
                htmlFor="finance-export-end-date"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#cbd5e1",
                }}
              >
                End Date
              </label>
              <input
                id="finance-export-end-date"
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
          description="Review the current export configuration before downloading."
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