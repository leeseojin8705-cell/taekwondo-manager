"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import EmptyState from "../../../components/ui/EmptyState";
import { supabase } from "../../../lib/supabase";

type PaymentRow = {
  payment_id?: string;
  id?: string;
  student_id: string | null;
  student_contract_id: string | null;
  payment_amount: number | null;
  allocated_amount: number | null;
  unallocated_amount: number | null;
  payment_date: string | null;
  payment_status: string | null;
  payment_method: string | null;
  payment_method_id: string | null;
  reference_number: string | null;
  note: string | null;
  created_at: string | null;
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

function getPaymentStatusColor(status: string | null | undefined) {
  switch (status) {
    case "completed":
      return "#16a34a";
    case "pending":
      return "#f59e0b";
    case "void":
      return "#111827";
    case "refunded":
      return "#dc2626";
    default:
      return "#475569";
  }
}

export default function FinancePaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function loadPage() {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPayments((data ?? []) as PaymentRow[]);
    } catch (err) {
      console.error(err);
      setError("Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  const filteredPayments = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const rowId = payment.payment_id ?? payment.id ?? "";

      const matchesSearch =
        keyword.length === 0 ||
        rowId.toLowerCase().includes(keyword) ||
        (payment.payment_method ?? "").toLowerCase().includes(keyword) ||
        (payment.reference_number ?? "").toLowerCase().includes(keyword) ||
        (payment.note ?? "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "all" || (payment.payment_status ?? "") === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [payments, search, statusFilter]);

  const summary = useMemo(() => {
    const totalAmount = filteredPayments.reduce(
      (sum, row) => sum + Number(row.payment_amount ?? 0),
      0
    );

    const totalAllocated = filteredPayments.reduce(
      (sum, row) => sum + Number(row.allocated_amount ?? 0),
      0
    );

    const totalUnallocated = filteredPayments.reduce(
      (sum, row) => sum + Number(row.unallocated_amount ?? 0),
      0
    );

    const completedCount = filteredPayments.filter(
      (row) => row.payment_status === "completed"
    ).length;

    const voidCount = filteredPayments.filter(
      (row) => row.payment_status === "void"
    ).length;

    return {
      totalCount: filteredPayments.length,
      totalAmount,
      totalAllocated,
      totalUnallocated,
      completedCount,
      voidCount,
    };
  }, [filteredPayments]);

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
              Payments
            </h1>
            <p
              style={{
                margin: "10px 0 0 0",
                color: "#94a3b8",
                fontSize: 14,
              }}
            >
              Payment records, allocated amounts, and remaining unallocated balance.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/finance" style={buttonSecondary}>
              Finance Home
            </Link>
            <Link href="/finance/invoices" style={buttonSecondary}>
              Invoices
            </Link>
            <Link href="/finance/payments/new" style={buttonPrimary}>
              New Payment
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
          <PageCard title="Total Payments">
            <div style={bigValue}>{summary.totalCount}</div>
          </PageCard>

          <PageCard title="Payment Amount">
            <div style={bigValue}>{formatMoney(summary.totalAmount)}</div>
          </PageCard>

          <PageCard title="Allocated">
            <div style={{ ...bigValue, color: "#16a34a" }}>
              {formatMoney(summary.totalAllocated)}
            </div>
          </PageCard>

          <PageCard title="Unallocated">
            <div style={{ ...bigValue, color: "#f59e0b" }}>
              {formatMoney(summary.totalUnallocated)}
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
              placeholder="Search by payment id, method, reference, or note..."
              style={inputStyle}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="void">Void</option>
              <option value="refunded">Refunded</option>
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
            <span>Total: {summary.totalCount}</span>
            <span>Completed: {summary.completedCount}</span>
            <span>Void: {summary.voidCount}</span>
          </div>
        </PageCard>

        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorBlock message={error} />
        ) : filteredPayments.length === 0 ? (
          <EmptyState
            title="No payments found"
            description="There are no payments matching the current filters."
          />
        ) : (
          <PageCard title={`Payments (${filteredPayments.length})`}>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 1200,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid #334155" }}>
                    <th style={thStyle}>Payment ID</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Method</th>
                    <th style={thStyle}>Reference</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Allocated</th>
                    <th style={thStyle}>Unallocated</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Note</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => {
                    const rowId = payment.payment_id ?? payment.id ?? "";
                    const unallocated = Number(payment.unallocated_amount ?? 0);

                    return (
                      <tr
                        key={rowId}
                        style={{
                          borderBottom: "1px solid #1e293b",
                          background:
                            unallocated > 0 ? "rgba(245, 158, 11, 0.08)" : "transparent",
                        }}
                      >
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 700, color: "white" }}>
                            {rowId || "-"}
                          </div>
                        </td>

                        <td style={tdStyle}>{formatDate(payment.payment_date)}</td>
                        <td style={tdStyle}>{payment.payment_method ?? "-"}</td>
                        <td style={tdStyle}>{payment.reference_number ?? "-"}</td>

                        <td style={tdStyle}>
                          <span style={{ fontWeight: 800, color: "white" }}>
                            {formatMoney(payment.payment_amount)}
                          </span>
                        </td>

                        <td style={tdStyle}>
                          <span style={{ fontWeight: 800, color: "#16a34a" }}>
                            {formatMoney(payment.allocated_amount)}
                          </span>
                        </td>

                        <td style={tdStyle}>
                          <span
                            style={{
                              fontWeight: 800,
                              color: unallocated > 0 ? "#f59e0b" : "#e2e8f0",
                            }}
                          >
                            {formatMoney(payment.unallocated_amount)}
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
                              background: getPaymentStatusColor(payment.payment_status),
                            }}
                          >
                            {payment.payment_status ?? "-"}
                          </span>
                        </td>

                        <td style={tdStyle}>
                          <div
                            style={{
                              maxWidth: 260,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={payment.note ?? ""}
                          >
                            {payment.note ?? "-"}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          {rowId ? (
                            <Link
                              href={`/finance/payments/${rowId}`}
                              style={tableActionButton}
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

const buttonPrimary: CSSProperties = {
  textDecoration: "none",
  padding: "10px 14px",
  borderRadius: 12,
  background: "#2563eb",
  color: "white",
  fontWeight: 700,
  fontSize: 14,
};

const buttonSecondary: CSSProperties = {
  textDecoration: "none",
  padding: "10px 14px",
  borderRadius: 12,
  background: "#1e293b",
  color: "white",
  fontWeight: 700,
  fontSize: 14,
};

const tableActionButton: CSSProperties = {
  textDecoration: "none",
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 10,
  background: "#2563eb",
  color: "white",
  fontSize: 13,
  fontWeight: 800,
};

const bigValue: CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  color: "white",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "white",
  outline: "none",
};

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