"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/ui/AppShell";
import PageCard from "../../components/ui/PageCard";
import LoadingBlock from "../../components/ui/LoadingBlock";
import ErrorBlock from "../../components/ui/ErrorBlock";
import EmptyState from "../../components/ui/EmptyState";
import { supabase } from "../../lib/supabase";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  invoice_type: string;
  status: string;
  final_amount: number;
  paid_amount: number;
  balance_amount: number;
  students?: {
    id: string;
    full_name?: string | null;
    name?: string | null;
  } | null;
};

type PaymentRow = {
  id: string;
  payment_date: string;
  amount: number;
  payment_status: string;
  students?: {
    id: string;
    full_name?: string | null;
    name?: string | null;
  } | null;
  invoices: {
    id: string;
    invoice_number: string | null;
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
  payment_methods: {
    name: string | null;
  } | null;
};

type SummaryStats = {
  todayIncome: number;
  thisMonthIncome: number;
  outstandingBalance: number;
  overdueInvoices: number;
  thisMonthExpenses: number;
  netProfit: number;
};

function getLocalDateParts() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");

  return {
    today: `${year}-${month}-${day}`,
    monthStart: `${year}-${month}-01`,
  };
}

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

function toErrorMessage(err: unknown) {
  if (!err) return "Unknown error.";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || "Unknown error.";
  if (typeof err === "object") {
    const anyErr = err as { code?: string; message?: string; details?: string; hint?: string };
    const parts = [
      anyErr.code ? `code=${anyErr.code}` : null,
      anyErr.message ? anyErr.message : null,
      anyErr.details ? `details=${anyErr.details}` : null,
      anyErr.hint ? `hint=${anyErr.hint}` : null,
    ].filter(Boolean);
    if (parts.length) return parts.join(" | ");
  }
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error.";
  }
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
        }}
      >
        {value}
      </div>
    </div>
  );
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
  } else if (
    normalized === "overdue" ||
    normalized === "cancelled" ||
    normalized === "voided" ||
    normalized === "refunded"
  ) {
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

export default function FinanceHomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);

  const { today, monthStart } = useMemo(() => getLocalDateParts(), []);

  useEffect(() => {
    fetchFinanceHome();
  }, []);

  async function fetchFinanceHome() {
    try {
      setLoading(true);
      setError(null);

      const [homeRes, paymentsJson, expensesJson] = await Promise.all([
        fetch("/api/finance/home").then((r) => (r.ok ? r.json() : { invoices: [] })),
        fetch("/api/finance/payments?limit=8").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/finance/expenses?limit=8").then((r) => (r.ok ? r.json() : [])),
      ]);

      setInvoices((homeRes?.invoices ?? []) as unknown as InvoiceRow[]);
      setPayments((paymentsJson ?? []) as unknown as PaymentRow[]);
      setExpenses((expensesJson ?? []) as unknown as ExpenseRow[]);
    } catch (err: any) {
      setError(`Failed to load finance home. ${toErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo<SummaryStats>(() => {
    const todayIncome = payments
      .filter((row) => row.payment_date === today)
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const thisMonthIncome = payments
      .filter((row) => row.payment_date >= monthStart)
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const outstandingBalance = invoices.reduce(
      (sum, row) => sum + Number(row.balance_amount || 0),
      0
    );

    const overdueInvoices = invoices.filter(
      (row) => (row.status || "").toLowerCase() === "overdue"
    ).length;

    const thisMonthExpenses = expenses
      .filter((row) => row.expense_date >= monthStart)
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const netProfit = thisMonthIncome - thisMonthExpenses;

    return {
      todayIncome,
      thisMonthIncome,
      outstandingBalance,
      overdueInvoices,
      thisMonthExpenses,
      netProfit,
    };
  }, [expenses, invoices, monthStart, payments, today]);

  if (loading) {
    return (
      <AppShell
        title="Finance Home"
        description="Pricing, invoices (청구), payments (결제). Confirm amount to register payment. Alerts on Dashboard when needed."
      >
        <LoadingBlock message="Loading finance home..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell
        title="Finance Home"
        description="Pricing, invoices (청구), payments (결제). Confirm amount to register payment. Alerts on Dashboard when needed."
      >
        <ErrorBlock title="Failed to load finance home" message={error} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Finance Home"
      description="Finance hub for pricing, invoices, payments, expenses, and summary"
    >
      <div style={{ display: "grid", gap: 20 }}>
        <PageCard title="Finance Summary">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
            }}
          >
            <SummaryCard
              title="Today Income"
              value={formatMoney(stats.todayIncome)}
              tone="green"
            />
            <SummaryCard
              title="This Month Income"
              value={formatMoney(stats.thisMonthIncome)}
              tone="blue"
            />
            <SummaryCard
              title="Outstanding Balance"
              value={formatMoney(stats.outstandingBalance)}
              tone="yellow"
            />
            <SummaryCard
              title="Overdue Invoices"
              value={`${stats.overdueInvoices}`}
              tone="red"
            />
            <SummaryCard
              title="This Month Expenses"
              value={formatMoney(stats.thisMonthExpenses)}
              tone="default"
            />
            <SummaryCard
              title="Net Profit"
              value={formatMoney(stats.netProfit)}
              tone={stats.netProfit >= 0 ? "green" : "red"}
            />
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
            <Link href="/program-pricing" style={buttonPrimaryStyle}>
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
            <Link href="/finance/summary" style={buttonGhostStyle}>
              Finance Summary
            </Link>
          </div>
        </PageCard>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 20,
          }}
        >
          <PageCard title="Recent Invoices">
            {invoices.length === 0 ? (
              <EmptyState
                title="No invoices found"
                description="No invoice records are available."
              />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {invoices.map((row) => (
                  <div key={row.id} style={listCardStyle}>
                    <div style={listHeaderStyle}>
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={titleStyle}>{row.invoice_number}</div>
                        <div style={subTextStyle}>
                          {getStudentName(row.students)}
                        </div>
                      </div>
                      <StatusPill value={row.status} />
                    </div>

                    <div style={metaGridStyle}>
                      <MetaItem label="Date" value={formatDate(row.invoice_date)} />
                      <MetaItem label="Due" value={formatDate(row.due_date)} />
                      <MetaItem label="Type" value={row.invoice_type || "-"} />
                      <MetaItem label="Final" value={formatMoney(row.final_amount)} />
                      <MetaItem label="Paid" value={formatMoney(row.paid_amount)} />
                      <MetaItem
                        label="Balance"
                        value={formatMoney(row.balance_amount)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageCard>

          <PageCard title="Recent Payments">
            {payments.length === 0 ? (
              <EmptyState
                title="No payments found"
                description="No payment records are available."
              />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {payments.map((row) => (
                  <div key={row.id} style={listCardStyle}>
                    <div style={listHeaderStyle}>
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={titleStyle}>{getStudentName(row.students)}</div>
                        <div style={subTextStyle}>
                          Invoice: {row.invoices?.invoice_number || "-"}
                        </div>
                      </div>
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
        </div>

        <PageCard title="Recent Expenses">
          {expenses.length === 0 ? (
            <EmptyState
              title="No expenses found"
              description="No expense records are available."
            />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {expenses.map((row) => (
                <div key={row.id} style={listCardStyle}>
                  <div style={listHeaderStyle}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={titleStyle}>
                        {row.expense_categories?.name || "Expense"}
                      </div>
                      <div style={subTextStyle}>
                        {row.vendor_name || row.description || "-"}
                      </div>
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
                    <MetaItem
                      label="Method"
                      value={row.payment_methods?.name || "-"}
                    />
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
    </AppShell>
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
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 10,
};