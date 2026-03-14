"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import EmptyState from "../../../components/ui/EmptyState";

type InvoiceRow = {
  invoice_id?: string;
  id?: string;
  invoice_number: string | null;
  student_id: string | null;
  student_name: string | null;
  student_contract_id: string | null;
  student_program_id: string | null;
  payment_category: string | null;
  description: string | null;
  issued_date: string | null;
  due_date: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  balance_amount: number | null;
  invoice_status: string | null;
  payment_status: string | null;
  created_at: string | null;
};

type SummaryRow = {
  total_invoices: number | null;
  total_billed: number | null;
  total_collected: number | null;
  total_outstanding: number | null;
  overdue_count: number | null;
  overdue_amount: number | null;
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
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getStatusColor(status: string | null | undefined) {
  switch (status) {
    case "paid":
      return "#16a34a";
    case "partial":
      return "#f59e0b";
    case "overdue":
      return "#dc2626";
    case "issued":
      return "#2563eb";
    case "draft":
      return "#6b7280";
    case "void":
      return "#111827";
    default:
      return "#475569";
  }
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

export default function FinanceInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [summary, setSummary] = useState<SummaryRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  
  async function loadPage() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/finance/invoices");
      const json = res.ok ? await res.json() : { invoices: [] };
      const rows: InvoiceRow[] = json.invoices ?? [];

      setInvoices(rows);

      // Compute summary totals from invoice rows
      const total_billed = rows.reduce(
        (sum, row) => sum + Number(row.total_amount ?? 0),
        0
      );
      const total_collected = rows.reduce(
        (sum, row) => sum + Number(row.paid_amount ?? 0),
        0
      );
      const total_outstanding = rows.reduce(
        (sum, row) => sum + Number(row.balance_amount ?? 0),
        0
      );

      const overdueRows = rows.filter((row) => row.invoice_status === "overdue");
      const overdue_count = overdueRows.length;
      const overdue_amount = overdueRows.reduce(
        (sum, row) => sum + Number(row.balance_amount ?? 0),
        0
      );

      setSummary({
        total_invoices: rows.length,
        total_billed,
        total_collected,
        total_outstanding,
        overdue_count,
        overdue_amount,
      });
    } catch (err) {
      console.error(err);
      setError(`Failed to load invoices. ${toErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  }  

  useEffect(() => {
    loadPage();
  }, []);

  const filteredInvoices = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesSearch =
        keyword.length === 0 ||
        (invoice.invoice_number ?? "").toLowerCase().includes(keyword) ||
        (invoice.student_name ?? "").toLowerCase().includes(keyword) ||
        (invoice.description ?? "").toLowerCase().includes(keyword) ||
        (invoice.payment_category ?? "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "all" || (invoice.invoice_status ?? "") === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const quickStats = useMemo(() => {
    return {
      invoiceCount: filteredInvoices.length,
      paidCount: filteredInvoices.filter((row) => row.invoice_status === "paid").length,
      openCount: filteredInvoices.filter((row) =>
        ["issued", "partial", "overdue"].includes(row.invoice_status ?? "")
      ).length,
      overdueCount: filteredInvoices.filter((row) => row.invoice_status === "overdue").length,
    };
  }, [filteredInvoices]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          display: "grid",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "#38bdf8",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 700,
              }}
            >
              Finance
            </p>
            <h1
              style={{
                margin: "8px 0 0 0",
                fontSize: 30,
                fontWeight: 900,
                color: "white",
              }}
            >
              Invoice List
            </h1>
            <p
              style={{
                margin: "10px 0 0 0",
                color: "#94a3b8",
                fontSize: 14,
              }}
            >
              Billing, outstanding balance, and overdue invoices.
            </p>
            <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#64748b" }}>
              Invoice = 청구 (billed, amount due). Payment = 결제 (money received). Create an invoice to mark as “청구”; record a payment when you receive money.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/finance/invoices/new"
              style={{
                textDecoration: "none",
                padding: "10px 14px",
                borderRadius: 12,
                background: "#22c55e",
                color: "white",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              New Invoice (청구하기)
            </Link>
            <Link
              href="/finance"
              style={{
                textDecoration: "none",
                padding: "10px 14px",
                borderRadius: 12,
                background: "#1e293b",
                color: "white",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Finance Home
            </Link>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <PageCard title="Total Billed">
            <div style={{ fontSize: 28, fontWeight: 900, color: "white" }}>
              {formatMoney(summary?.total_billed)}
            </div>
          </PageCard>

          <PageCard title="Total Collected">
            <div style={{ fontSize: 28, fontWeight: 900, color: "white" }}>
              {formatMoney(summary?.total_collected)}
            </div>
          </PageCard>

          <PageCard title="Outstanding">
            <div style={{ fontSize: 28, fontWeight: 900, color: "#f59e0b" }}>
              {formatMoney(summary?.total_outstanding)}
            </div>
          </PageCard>

          <PageCard title="Overdue">
            <div style={{ fontSize: 28, fontWeight: 900, color: "#ef4444" }}>
              {formatMoney(summary?.overdue_amount)}
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: "#94a3b8" }}>
              {summary?.overdue_count ?? 0} invoices
            </div>
          </PageCard>
        </div>

        <PageCard title="Filters">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: 12,
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice number, student, description..."
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid #334155",
                background: "#0f172a",
                color: "white",
                outline: "none",
              }}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid #334155",
                background: "#0f172a",
                color: "white",
                outline: "none",
              }}
            >
              <option value="all">All Status</option>
              <option value="issued">Issued</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="void">Void</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              fontSize: 13,
              color: "#94a3b8",
            }}
          >
            <span>Total: {quickStats.invoiceCount}</span>
            <span>Paid: {quickStats.paidCount}</span>
            <span>Open: {quickStats.openCount}</span>
            <span>Overdue: {quickStats.overdueCount}</span>
          </div>
        </PageCard>

        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorBlock message={error} />
        ) : filteredInvoices.length === 0 ? (
          <EmptyState
            title="No invoices found"
            description="There are no invoices matching the current filters."
          />
        ) : (
          <PageCard title={`Invoices (${filteredInvoices.length})`}>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 1100,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid #334155" }}>
                    <th style={thStyle}>Invoice</th>
                    <th style={thStyle}>Student</th>
                    <th style={thStyle}>Category</th>
                    <th style={thStyle}>Issued</th>
                    <th style={thStyle}>Due</th>
                    <th style={thStyle}>Total</th>
                    <th style={thStyle}>Paid</th>
                    <th style={thStyle}>Balance</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => {
                    const rowId = invoice.invoice_id ?? invoice.id ?? "";
                    const isOverdue = invoice.invoice_status === "overdue";

                    return (
                      <tr
                        key={rowId}
                        style={{
                          borderBottom: "1px solid #1e293b",
                          background: isOverdue ? "rgba(127, 29, 29, 0.18)" : "transparent",
                        }}
                      >
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 800, color: "white" }}>
                            {invoice.invoice_number ?? "No Number"}
                          </div>
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                            {invoice.description || "-"}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <div style={{ fontWeight: 700, color: "white" }}>
                            {invoice.student_id ? (
                              <Link
                                href={`/students/${invoice.student_id}`}
                                style={{ color: "#93c5fd", textDecoration: "none" }}
                              >
                                {invoice.student_name ?? "-"}
                              </Link>
                            ) : (
                              invoice.student_name ?? "-"
                            )}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "6px 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 700,
                              background: "#1e293b",
                              color: "#cbd5e1",
                            }}
                          >
                            {invoice.payment_category ?? "-"}
                          </span>
                        </td>

                        <td style={tdStyle}>{formatDate(invoice.issued_date)}</td>
                        <td style={tdStyle}>{formatDate(invoice.due_date)}</td>
                        <td style={tdStyle}>{formatMoney(invoice.total_amount)}</td>
                        <td style={tdStyle}>{formatMoney(invoice.paid_amount)}</td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              color:
                                Number(invoice.balance_amount ?? 0) > 0 ? "#f59e0b" : "#e2e8f0",
                              fontWeight: 800,
                            }}
                          >
                            {formatMoney(invoice.balance_amount)}
                          </span>
                        </td>

                        <td style={tdStyle}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "6px 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 800,
                              color: "white",
                              background: getStatusColor(invoice.invoice_status),
                            }}
                          >
                            {invoice.invoice_status ?? "-"}
                          </span>
                        </td>

                        <td style={tdStyle}>
                          {rowId ? (
                            <Link
                              href={`/finance/invoices/${rowId}`}
                              style={{
                                textDecoration: "none",
                                display: "inline-block",
                                padding: "8px 12px",
                                borderRadius: 10,
                                background: "#2563eb",
                                color: "white",
                                fontSize: 13,
                                fontWeight: 800,
                              }}
                            >
                              Open
                            </Link>
                          ) : (
                            <span style={{ color: "#64748b", fontSize: 13 }}>No ID</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </PageCard>
        )}
      </div>
    </div>
  );
}

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  fontSize: 13,
  color: "#94a3b8",
  fontWeight: 800,
};

const tdStyle: CSSProperties = {
  padding: "14px 10px",
  fontSize: 14,
  color: "#e2e8f0",
  verticalAlign: "middle",
};