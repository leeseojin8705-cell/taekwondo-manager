"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import EmptyState from "../../../components/ui/EmptyState";
import { supabase } from "../../../lib/supabase";

type ExpenseRow = {
  id: string;
  expense_date: string;
  amount: number;
  vendor_name: string | null;
  description: string | null;
  note: string | null;
  attachment_url: string | null;
  expense_categories: {
    id?: string;
    name: string | null;
  } | null;
  payment_methods: {
    id?: string;
    name: string | null;
  } | null;
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

export default function FinanceExpensesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<ExpenseRow[]>([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  useEffect(() => {
    fetchExpenses();
  }, []);

  async function fetchExpenses() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/finance/expenses?limit=200");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || res.statusText);
      }
      const data = await res.json();
      setRows((data ?? []) as unknown as ExpenseRow[]);
    } catch (err: any) {
      setError(err?.message || "Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    let result = [...rows];

    if (search.trim()) {
      const keyword = search.trim().toLowerCase();
      result = result.filter((row) => {
        const vendor = (row.vendor_name || "").toLowerCase();
        const description = (row.description || "").toLowerCase();
        const note = (row.note || "").toLowerCase();
        const category = (row.expense_categories?.name || "").toLowerCase();
        return (
          vendor.includes(keyword) ||
          description.includes(keyword) ||
          note.includes(keyword) ||
          category.includes(keyword)
        );
      });
    }

    if (categoryFilter !== "all") {
      result = result.filter(
        (row) => (row.expense_categories?.name || "").toLowerCase() === categoryFilter
      );
    }

    if (methodFilter !== "all") {
      result = result.filter(
        (row) => (row.payment_methods?.name || "").toLowerCase() === methodFilter
      );
    }

    return result;
  }, [rows, search, categoryFilter, methodFilter]);

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .map((row) => row.expense_categories?.name || "")
          .filter((name) => name.trim().length > 0)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const methodOptions = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .map((row) => row.payment_methods?.name || "")
          .filter((name) => name.trim().length > 0)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const summary = useMemo(() => {
    const totalExpenses = filteredRows.length;
    const totalAmount = filteredRows.reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0
    );

    const topCategoryMap = new Map<string, number>();
    for (const row of filteredRows) {
      const key = row.expense_categories?.name || "Uncategorized";
      topCategoryMap.set(key, (topCategoryMap.get(key) || 0) + Number(row.amount || 0));
    }

    let topCategory = "-";
    let topCategoryAmount = 0;

    for (const [name, amount] of topCategoryMap.entries()) {
      if (amount > topCategoryAmount) {
        topCategory = name;
        topCategoryAmount = amount;
      }
    }

    return {
      totalExpenses,
      totalAmount,
      topCategory,
      topCategoryAmount,
    };
  }, [filteredRows]);

  if (loading) {
    return (
      <AppShell
        title="Expenses"
        description="Review expense records, vendors, categories, and payment methods"
      >
        <LoadingBlock message="Loading expenses..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell
        title="Expenses"
        description="Review expense records, vendors, categories, and payment methods"
      >
        <ErrorBlock title="Failed to load expenses" message={error} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Expenses"
      description="Review expense records, vendors, categories, and payment methods"
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
        </div>

        <PageCard title="Expense Summary">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            <SummaryCard title="Total Expenses" value={`${summary.totalExpenses}`} />
            <SummaryCard
              title="Total Amount"
              value={formatMoney(summary.totalAmount)}
              tone="red"
            />
            <SummaryCard
              title="Top Category"
              value={summary.topCategory}
              tone="yellow"
            />
            <SummaryCard
              title="Top Category Amount"
              value={formatMoney(summary.topCategoryAmount)}
              tone="default"
            />
          </div>
        </PageCard>

        <PageCard title="Filters">
          <div style={filterGridStyle}>
            <Field label="Search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={inputStyle}
                placeholder="Vendor, description, note, category"
              />
            </Field>

            <Field label="Expense Category">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="all">All</option>
                {categoryOptions.map((name) => (
                  <option key={name} value={name.toLowerCase()}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Payment Method">
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="all">All</option>
                {methodOptions.map((name) => (
                  <option key={name} value={name.toLowerCase()}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </PageCard>

        <PageCard title="Expense Records">
          {filteredRows.length === 0 ? (
            <EmptyState
              title="No expenses found"
              description="No expenses match the current filters."
            />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {filteredRows.map((row) => (
                <div key={row.id} style={listCardStyle}>
                  <div style={listHeaderStyle}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={titleStyle}>
                        {row.expense_categories?.name || "Uncategorized Expense"}
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
                    <MetaItem label="Expense Date" value={formatDate(row.expense_date)} />
                    <MetaItem
                      label="Category"
                      value={row.expense_categories?.name || "-"}
                    />
                    <MetaItem
                      label="Method"
                      value={row.payment_methods?.name || "-"}
                    />
                    <MetaItem label="Vendor" value={row.vendor_name || "-"} />
                  </div>

                  {row.description ? (
                    <div style={noteBoxStyle}>
                      <strong style={{ color: "#f8fafc" }}>Description:</strong> {row.description}
                    </div>
                  ) : null}

                  {row.note ? (
                    <div style={noteBoxStyle}>
                      <strong style={{ color: "#f8fafc" }}>Note:</strong> {row.note}
                    </div>
                  ) : null}

                  {row.attachment_url ? (
                    <div>
                      <a
                        href={row.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        style={buttonGhostSmallStyle}
                      >
                        Open Attachment
                      </a>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </PageCard>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#e2e8f0",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryCard({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: string;
  tone?: "default" | "red" | "yellow";
}) {
  const toneMap = {
    default: {
      border: "1px solid #334155",
      background: "#0f172a",
      color: "#f8fafc",
    },
    red: {
      border: "1px solid #7f1d1d",
      background: "rgba(239,68,68,0.12)",
      color: "#fecaca",
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

const filterGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#f8fafc",
  borderRadius: 10,
  padding: "12px 14px",
  outline: "none",
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