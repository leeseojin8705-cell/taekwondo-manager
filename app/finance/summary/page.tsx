"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import EmptyState from "../../../components/ui/EmptyState";
import { supabase } from "../../../lib/supabase";

type PaymentRow = {
  id: string;
  payment_date: string;
  amount: number;
  payment_status: string;
  students: {
    id: string;
    full_name?: string | null;
    name?: string | null;
  } | null;
  payment_methods: {
    name: string | null;
  } | null;
};

type ExpenseRow = {
  id: string;
  expense_date: string;
  amount: number;
  vendor_name: string | null;
  description: string | null;
  expense_categories: {
    name: string | null;
  } | null;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  status: string;
  final_amount: number;
  paid_amount: number;
  balance_amount: number;
  students: {
    id: string;
    full_name?: string | null;
    name?: string | null;
  } | null;
};

type StudentRow = {
  id: string;
  status: string | null;
  join_date: string | null;
};

type ContractRow = {
  id: string;
  student_id: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function getStudentName(
  student:
    | {
        full_name?: string | null;
        name?: string | null;
      }
    | null
    | undefined
) {
  return student?.full_name || student?.name || "-";
}

function getDateParts() {
  const now = new Date();

  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const weekday = now.getDay();

  const today = new Date(year, month, day);
  const todayStr = toDateString(today);

  const monthStart = new Date(year, month, 1);
  const monthStartStr = toDateString(monthStart);

  const weekOffset = weekday === 0 ? -6 : 1 - weekday;
  const weekStart = new Date(year, month, day + weekOffset);
  const weekStartStr = toDateString(weekStart);

  return {
    todayStr,
    monthStartStr,
    weekStartStr,
  };
}

function toDateString(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function StatusPill({ value }: { value: string | null | undefined }) {
  const normalized = (value || "").toLowerCase();

  let border = "#334155";
  let background = "#0f172a";
  let color = "#cbd5e1";

  if (normalized === "paid" || normalized === "completed") {
    border = "#166534";
    background = "rgba(34,197,94,0.12)";
    color = "#bbf7d0";
  } else if (normalized === "partial" || normalized === "issued") {
    border = "#92400e";
    background = "rgba(245,158,11,0.12)";
    color = "#fde68a";
  } else if (normalized === "overdue" || normalized === "voided" || normalized === "cancelled") {
    border = "#7f1d1d";
    background = "rgba(239,68,68,0.12)";
    color = "#fecaca";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        border: `1px solid ${border}`,
        background,
        color,
        padding: "5px 10px",
        fontSize: 11,
        fontWeight: 800,
        textTransform: "capitalize",
      }}
    >
      {value || "-"}
    </span>
  );
}

export default function FinanceSummaryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);

  useEffect(() => {
    fetchFinanceSummary();
  }, []);

  async function fetchFinanceSummary() {
    try {
      setLoading(true);
      setError(null);

      const [
        paymentsJson,
        expensesJson,
        invoicesRes,
        studentsRes,
        contractsRes,
      ] = await Promise.all([
        fetch("/api/finance/payments?limit=300").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/finance/expenses?limit=300").then((r) => (r.ok ? r.json() : [])),
        supabase
          .from("invoices")
          .select(`
            id,
            invoice_number,
            invoice_date:issued_date,
            due_date,
            status:invoice_status,
            final_amount:total_amount,
            paid_amount,
            balance_amount,
            students:student_id (
              id,
              full_name,
              name
            )
          `)
          .order("issued_date", { ascending: false })
          .limit(300),

        supabase
          .from("students")
          .select(`
            id,
            status,
            join_date
          `)
          .eq("active", true)
          .limit(1000),

        supabase
          .from("student_contracts")
          .select(`
            id,
            student_id,
            start_date,
            end_date,
            status
          `)
          .limit(1000),
      ]);

      setPayments((paymentsJson ?? []) as unknown as PaymentRow[]);
      setExpenses((expensesJson ?? []) as unknown as ExpenseRow[]);
      setInvoices((invoicesRes.error ? [] : invoicesRes.data ?? []) as unknown as InvoiceRow[]);
      setStudents((studentsRes.error ? [] : studentsRes.data ?? []) as unknown as StudentRow[]);
      setContracts((contractsRes.error ? [] : contractsRes.data ?? []) as unknown as ContractRow[]);
    } catch (err: any) {
      setError(err?.message || "Failed to load finance summary.");
    } finally {
      setLoading(false);
    }
  }

  const { todayStr, weekStartStr, monthStartStr } = useMemo(() => getDateParts(), []);

  const summary = useMemo(() => {
    const todayIncome = payments
      .filter((row) => row.payment_date === todayStr)
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const thisWeekIncome = payments
      .filter((row) => row.payment_date >= weekStartStr)
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const thisMonthIncome = payments
      .filter((row) => row.payment_date >= monthStartStr)
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const thisMonthExpenses = expenses
      .filter((row) => row.expense_date >= monthStartStr)
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const outstandingBalance = invoices.reduce(
      (sum, row) => sum + Number(row.balance_amount || 0),
      0
    );

    const overdueInvoices = invoices.filter(
      (row) => (row.status || "").toLowerCase() === "overdue"
    ).length;

    const netProfit = thisMonthIncome - thisMonthExpenses;

    const totalStudents = students.length;
    const activeStudents = students.filter(
      (row) => (row.status || "").toLowerCase() === "active"
    ).length;
    const holdStudents = students.filter(
      (row) => (row.status || "").toLowerCase() === "hold"
    ).length;
    const inactiveStudents = students.filter(
      (row) => (row.status || "").toLowerCase() === "inactive"
    ).length;

    const studentsWithBalance = new Set(
      invoices
        .filter((row) => Number(row.balance_amount || 0) > 0 && row.students?.id)
        .map((row) => row.students!.id)
    ).size;

    const newStudentsThisMonth = students.filter(
      (row) => row.join_date && row.join_date >= monthStartStr
    ).length;

    const renewalsThisMonth = contracts.filter(
      (row) => row.start_date && row.start_date >= monthStartStr
    ).length;

    const expiringIn7Days = contracts.filter((row) => {
      if (!row.end_date) return false;
      if ((row.status || "").toLowerCase() !== "active") return false;

      const end = new Date(row.end_date);
      const today = new Date(todayStr);
      const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      return diff >= 0 && diff <= 7;
    }).length;

    return {
      todayIncome,
      thisWeekIncome,
      thisMonthIncome,
      thisMonthExpenses,
      netProfit,
      outstandingBalance,
      overdueInvoices,
      totalStudents,
      activeStudents,
      holdStudents,
      inactiveStudents,
      studentsWithBalance,
      newStudentsThisMonth,
      renewalsThisMonth,
      expiringIn7Days,
    };
  }, [payments, expenses, invoices, students, contracts, todayStr, weekStartStr, monthStartStr]);

  const recentPayments = useMemo(() => payments.slice(0, 8), [payments]);
  const recentExpenses = useMemo(() => expenses.slice(0, 8), [expenses]);
  const recentInvoices = useMemo(() => invoices.slice(0, 8), [invoices]);

  if (loading) {
    return (
      <AppShell
        title="Finance Summary"
        description="Finance overview with income, expenses, balances, and student snapshot"
      >
        <LoadingBlock message="Loading finance summary..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell
        title="Finance Summary"
        description="Finance overview with income, expenses, balances, and student snapshot"
      >
        <ErrorBlock title="Failed to load finance summary" message={error} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Finance Summary"
      description="Finance overview with income, expenses, balances, and student snapshot"
    >
      <div style={{ display: "grid", gap: 20 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Link href="/finance" style={buttonGhostStyle}>
            Back to Finance Home
          </Link>
          <Link href="/program-pricing" style={buttonGhostStyle}>
            Pricing
          </Link>
          <Link href="/finance/invoices" style={buttonGhostStyle}>
            Invoices
          </Link>
          <Link href="/finance/payments" style={buttonGhostStyle}>
            Payments
          </Link>
          <Link href="/finance/expenses" style={buttonGhostStyle}>
            Expenses
          </Link>
        </div>

        <PageCard title="Finance Summary Cards">
          <div style={summaryGridStyle}>
            <SummaryCard title="Today Income" value={formatMoney(summary.todayIncome)} tone="green" />
            <SummaryCard title="This Week Income" value={formatMoney(summary.thisWeekIncome)} tone="blue" />
            <SummaryCard title="This Month Income" value={formatMoney(summary.thisMonthIncome)} tone="green" />
            <SummaryCard title="This Month Expenses" value={formatMoney(summary.thisMonthExpenses)} tone="red" />
            <SummaryCard
              title="Net Profit"
              value={formatMoney(summary.netProfit)}
              tone={summary.netProfit >= 0 ? "green" : "red"}
            />
            <SummaryCard
              title="Outstanding Balance"
              value={formatMoney(summary.outstandingBalance)}
              tone="yellow"
            />
            <SummaryCard
              title="Overdue Invoices"
              value={`${summary.overdueInvoices}`}
              tone="red"
            />
            <SummaryCard
              title="Expiring in 7 Days"
              value={`${summary.expiringIn7Days}`}
              tone="yellow"
            />
          </div>
        </PageCard>

        <PageCard title="Student Snapshot">
          <div style={summaryGridStyle}>
            <SummaryCard title="Total Students" value={`${summary.totalStudents}`} />
            <SummaryCard title="Active Students" value={`${summary.activeStudents}`} tone="green" />
            <SummaryCard title="Hold Students" value={`${summary.holdStudents}`} tone="yellow" />
            <SummaryCard title="Inactive Students" value={`${summary.inactiveStudents}`} tone="red" />
            <SummaryCard
              title="Students with Balance"
              value={`${summary.studentsWithBalance}`}
              tone="yellow"
            />
            <SummaryCard
              title="New Students This Month"
              value={`${summary.newStudentsThisMonth}`}
              tone="blue"
            />
            <SummaryCard
              title="Renewals This Month"
              value={`${summary.renewalsThisMonth}`}
              tone="blue"
            />
          </div>
        </PageCard>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 20,
          }}
        >
          <PageCard title="Recent Payments">
            {recentPayments.length === 0 ? (
              <EmptyState
                title="No recent payments"
                description="No payment records are available."
              />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {recentPayments.map((row) => (
                  <div key={row.id} style={listCardStyle}>
                    <div style={listHeaderStyle}>
                      <div style={titleStyle}>{getStudentName(row.students)}</div>
                      <StatusPill value={row.payment_status} />
                    </div>

                    <div style={metaGridStyle}>
                      <MetaItem label="Date" value={formatDate(row.payment_date)} />
                      <MetaItem label="Amount" value={formatMoney(row.amount)} />
                      <MetaItem
                        label="Method"
                        value={row.payment_methods?.name || "-"}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageCard>

          <PageCard title="Recent Expenses">
            {recentExpenses.length === 0 ? (
              <EmptyState
                title="No recent expenses"
                description="No expense records are available."
              />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {recentExpenses.map((row) => (
                  <div key={row.id} style={listCardStyle}>
                    <div style={listHeaderStyle}>
                      <div style={titleStyle}>
                        {row.expense_categories?.name || "Expense"}
                      </div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 900,
                          color: "#f8fafc",
                        }}
                      >
                        {formatMoney(row.amount)}
                      </div>
                    </div>

                    <div style={metaGridStyle}>
                      <MetaItem label="Date" value={formatDate(row.expense_date)} />
                      <MetaItem label="Vendor" value={row.vendor_name || "-"} />
                      <MetaItem
                        label="Description"
                        value={row.description || "-"}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageCard>
        </div>

        <PageCard title="Recent Invoices">
          {recentInvoices.length === 0 ? (
            <EmptyState
              title="No recent invoices"
              description="No invoice records are available."
            />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {recentInvoices.map((row) => (
                <div key={row.id} style={listCardStyle}>
                  <div style={listHeaderStyle}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={titleStyle}>{row.invoice_number}</div>
                      <div style={subTextStyle}>{getStudentName(row.students)}</div>
                    </div>
                    <StatusPill value={row.status} />
                  </div>

                  <div style={metaGridStyle}>
                    <MetaItem label="Invoice Date" value={formatDate(row.invoice_date)} />
                    <MetaItem label="Due Date" value={formatDate(row.due_date)} />
                    <MetaItem label="Final" value={formatMoney(row.final_amount)} />
                    <MetaItem label="Paid" value={formatMoney(row.paid_amount)} />
                    <MetaItem label="Balance" value={formatMoney(row.balance_amount)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageCard>
      </div>
    </AppShell>
  );
}

function SummaryCard({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: string;
  tone?: "default" | "green" | "red" | "blue" | "yellow";
}) {
  const toneMap = {
    default: {
      border: "1px solid #334155",
      background: "#0f172a",
      color: "#f8fafc",
    },
    green: {
      border: "1px solid #166534",
      background: "rgba(34,197,94,0.12)",
      color: "#bbf7d0",
    },
    red: {
      border: "1px solid #7f1d1d",
      background: "rgba(239,68,68,0.12)",
      color: "#fecaca",
    },
    blue: {
      border: "1px solid #1d4ed8",
      background: "rgba(59,130,246,0.12)",
      color: "#bfdbfe",
    },
    yellow: {
      border: "1px solid #92400e",
      background: "rgba(245,158,11,0.12)",
      color: "#fde68a",
    },
  } as const;

  const style = toneMap[tone];

  return (
    <div
      style={{
        border: style.border,
        background: style.background,
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
        {title}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          color: style.color,
          lineHeight: 1.1,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #1e293b",
        background: "#0b1220",
        borderRadius: 10,
        padding: 10,
        display: "grid",
        gap: 4,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#f8fafc",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

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

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
};

const listCardStyle: React.CSSProperties = {
  border: "1px solid #334155",
  background: "#0f172a",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 12,
};

const listHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
};

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  color: "#f8fafc",
};

const subTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#94a3b8",
};

const metaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 10,
};