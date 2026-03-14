"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import AppShell from "../../../../components/ui/AppShell";
import PageCard from "../../../../components/ui/PageCard";
import LoadingBlock from "../../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../../components/ui/ErrorBlock";
import EmptyState from "../../../../components/ui/EmptyState";
import { supabase } from "../../../../lib/supabase";
import {
  formatMoney,
  formatDate,
  formatDateTime,
} from "../../../../lib/format";

type PaymentDetailRow = {
  id: string;
  student_id: string | null;
  student_name: string | null;
  student_contract_id: string | null;
  payment_category: string | null;
  description: string | null;
  base_amount: number | null;
  discount_amount: number | null;
  final_amount: number | null;
  paid_amount: number | null;
  balance_amount: number | null;
  payment_status: string | null;
  payment_method: string | null;
  due_date: string | null;
  paid_at: string | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
};

type InvoiceRelation = {
  id: string;
  invoice_number: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  balance_amount: number | null;
  payment_status: string | null;
  due_date: string | null;
  student_name: string | null;
};

type AllocationRow = {
  id: string;
  payment_id: string;
  invoice_id: string | null;
  allocated_amount: number | null;
  status: string | null;
  created_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  invoices: InvoiceRelation | InvoiceRelation[] | null;
};

function getStatusColor(status: string | null) {
  switch (status) {
    case "paid":
      return "#22c55e";
    case "partial":
      return "#f59e0b";
    case "unpaid":
      return "#ef4444";
    case "void":
      return "#94a3b8";
    default:
      return "#64748b";
  }
}

function normalizeInvoice(
  value: InvoiceRelation | InvoiceRelation[] | null | undefined
): InvoiceRelation | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function toSafePaymentId(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function PaymentDetailPage() {
  const params = useParams();
  const paymentId = toSafePaymentId(params?.id);

  const [payment, setPayment] = useState<PaymentDetailRow | null>(null);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeAllocations = useMemo(() => {
    return allocations.filter((row) => (row.status ?? "active") === "active");
  }, [allocations]);

  const voidedAllocations = useMemo(() => {
    return allocations.filter((row) => (row.status ?? "active") === "void");
  }, [allocations]);

  async function loadData() {
    if (!paymentId) {
      setPayment(null);
      setAllocations([]);
      setLoading(false);
      setError("Invalid payment id.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const paymentRes = await supabase
        .from("payments")
        .select(
          `
            id,
            student_id,
            student_name,
            student_contract_id,
            payment_category,
            description,
            base_amount,
            discount_amount,
            final_amount,
            paid_amount,
            balance_amount,
            payment_status,
            payment_method,
            due_date,
            paid_at,
            note,
            created_at,
            updated_at,
            voided_at,
            void_reason
          `
        )
        .eq("id", paymentId)
        .single();

      if (paymentRes.error) {
        throw new Error(paymentRes.error.message);
      }

      const allocationRes = await supabase
        .from("payment_allocations")
        .select(
          `
            id,
            payment_id,
            invoice_id,
            allocated_amount,
            status,
            created_at,
            voided_at,
            void_reason,
            invoices (
              id,
              invoice_number,
              total_amount,
              paid_amount,
              balance_amount,
              payment_status,
              due_date,
              student_name
            )
          `
        )
        .eq("payment_id", paymentId)
        .order("created_at", { ascending: true });

      if (allocationRes.error) {
        throw new Error(allocationRes.error.message);
      }

      setPayment(paymentRes.data as PaymentDetailRow);
      setAllocations((allocationRes.data ?? []) as AllocationRow[]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load payment detail.";
      setError(message);
      setPayment(null);
      setAllocations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [paymentId]);

  async function handleVoidPayment() {
    if (!payment?.id) return;

    if ((payment.payment_status ?? "") === "void") {
      window.alert("This payment is already void.");
      return;
    }

    const reason = window.prompt("Void reason");
    if (reason === null) return;

    try {
      setSubmitting(true);
      setError(null);

      const { error: rpcError } = await supabase.rpc("void_payment", {
        p_payment_id: payment.id,
        p_void_reason: reason.trim() || null,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      await loadData();
      window.alert("Payment void completed.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to void payment.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Payment Detail">
        <LoadingBlock />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Payment Detail">
        <ErrorBlock message={error} />
      </AppShell>
    );
  }

  if (!payment) {
    return (
      <AppShell title="Payment Detail">
        <EmptyState
          title="Payment not found"
          description="The requested payment record does not exist."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Payment Detail">
      <div style={headerWrapStyle}>
        <div>
          <div style={eyebrowStyle}>Finance</div>
          <h1 style={pageTitleStyle}>Payment Detail</h1>
          <p style={pageDescStyle}>
            Review payment, allocation, and void history.
          </p>
        </div>

        <div style={headerActionStyle}>
          <Link href="/finance/payments" style={backButtonStyle}>
            Back to Payments
          </Link>

          <button
            type="button"
            onClick={handleVoidPayment}
            disabled={submitting || (payment.payment_status ?? "") === "void"}
            style={{
              ...voidButtonStyle,
              opacity:
                submitting || (payment.payment_status ?? "") === "void"
                  ? 0.6
                  : 1,
              cursor:
                submitting || (payment.payment_status ?? "") === "void"
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {submitting ? "Voiding..." : "Void Payment"}
          </button>
        </div>
      </div>

      <div style={gridStyle}>
        <div style={{ gridColumn: "span 12" }}>
          <PageCard title="Payment Overview">
            <div style={overviewGridStyle}>
              {[
                {
                  label: "Student",
                  value:
                    payment.student_id ? (
                      <Link
                        href={`/students/${payment.student_id}`}
                        style={{ color: "#93c5fd", fontWeight: 600, textDecoration: "none" }}
                      >
                        {payment.student_name || "-"}
                      </Link>
                    ) : (
                      payment.student_name || "-"
                    ),
                },
                { label: "Category", value: payment.payment_category || "-" },
                { label: "Method", value: payment.payment_method || "-" },
                { label: "Status", value: payment.payment_status || "-" },
                { label: "Base", value: formatMoney(payment.base_amount || 0) },
                {
                  label: "Discount",
                  value: formatMoney(payment.discount_amount || 0),
                },
                { label: "Final", value: formatMoney(payment.final_amount || 0) },
                { label: "Paid", value: formatMoney(payment.paid_amount || 0) },
                {
                  label: "Balance",
                  value: formatMoney(payment.balance_amount || 0),
                },
                { label: "Due Date", value: formatDate(payment.due_date) },
                { label: "Paid At", value: formatDateTime(payment.paid_at) },
                {
                  label: "Created",
                  value: formatDateTime(payment.created_at),
                },
              ].map((item) => (
                <div key={item.label} style={infoBoxStyle}>
                  <div style={infoLabelStyle}>{item.label}</div>
                  <div
                    style={{
                      ...infoValueStyle,
                      color:
                        item.label === "Status"
                          ? getStatusColor(payment.payment_status)
                          : "white",
                    }}
                  >
                    {typeof item.value === "string" || typeof item.value === "number" ? item.value : item.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={textBoxStyle}>
              <div style={infoLabelStyle}>Description</div>
              <div style={textValueStyle}>{payment.description || "-"}</div>
            </div>

            <div style={{ ...textBoxStyle, marginTop: 12 }}>
              <div style={infoLabelStyle}>Note</div>
              <div style={textValueStyle}>{payment.note || "-"}</div>
            </div>

            {(payment.payment_status ?? "") === "void" && (
              <div style={voidInfoBoxStyle}>
                <div style={voidInfoLabelStyle}>Void Information</div>
                <div style={voidInfoMainStyle}>
                  Voided At: {formatDateTime(payment.voided_at)}
                </div>
                <div style={voidInfoSubStyle}>
                  Reason: {payment.void_reason || "-"}
                </div>
              </div>
            )}
          </PageCard>
        </div>

        <div style={{ gridColumn: "span 12" }}>
          <PageCard title="Active Allocations">
            {activeAllocations.length === 0 ? (
              <EmptyState
                title="No active allocations"
                description="This payment is not currently applied to any open invoice."
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={tableHeadRowStyle}>
                      <th style={thStyle}>Invoice</th>
                      <th style={thStyle}>Student</th>
                      <th style={thStyle}>Due Date</th>
                      <th style={thStyle}>Invoice Status</th>
                      <th style={thStyle}>Allocated</th>
                      <th style={thStyle}>Invoice Total</th>
                      <th style={thStyle}>Invoice Paid</th>
                      <th style={thStyle}>Invoice Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeAllocations.map((row) => {
                      const invoice = normalizeInvoice(row.invoices);

                      return (
                        <tr key={row.id} style={tableBodyRowStyle}>
                          <td style={tdStyle}>
                            {invoice?.id ? (
                              <Link
                                href={`/finance/invoices/${invoice.id}`}
                                style={linkStyle}
                              >
                                {invoice.invoice_number || "View Invoice"}
                              </Link>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td style={tdStyle}>{invoice?.student_name || "-"}</td>
                          <td style={tdStyle}>{formatDate(invoice?.due_date)}</td>
                          <td
                            style={{
                              ...tdStyle,
                              color: getStatusColor(invoice?.payment_status || null),
                              fontWeight: 700,
                            }}
                          >
                            {invoice?.payment_status || "-"}
                          </td>
                          <td style={tdStyle}>
                            {formatMoney(row.allocated_amount || 0)}
                          </td>
                          <td style={tdStyle}>
                            {formatMoney(invoice?.total_amount || 0)}
                          </td>
                          <td style={tdStyle}>
                            {formatMoney(invoice?.paid_amount || 0)}
                          </td>
                          <td style={tdStyle}>
                            {formatMoney(invoice?.balance_amount || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </PageCard>
        </div>

        <div style={{ gridColumn: "span 12" }}>
          <PageCard title="Voided Allocation History">
            {voidedAllocations.length === 0 ? (
              <EmptyState
                title="No voided allocation history"
                description="There are no allocation records marked as void for this payment."
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={tableHeadRowStyle}>
                      <th style={thStyle}>Invoice</th>
                      <th style={thStyle}>Allocated</th>
                      <th style={thStyle}>Voided At</th>
                      <th style={thStyle}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voidedAllocations.map((row) => {
                      const invoice = normalizeInvoice(row.invoices);

                      return (
                        <tr key={row.id} style={tableBodyRowStyle}>
                          <td style={tdStyle}>
                            {invoice?.id ? (
                              <Link
                                href={`/finance/invoices/${invoice.id}`}
                                style={linkStyle}
                              >
                                {invoice.invoice_number || "View Invoice"}
                              </Link>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td style={tdStyle}>
                            {formatMoney(row.allocated_amount || 0)}
                          </td>
                          <td style={tdStyle}>{formatDateTime(row.voided_at)}</td>
                          <td style={tdStyle}>{row.void_reason || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </PageCard>
        </div>
      </div>
    </AppShell>
  );
}

const headerWrapStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 20,
};

const eyebrowStyle: CSSProperties = {
  fontSize: 12,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 800,
  color: "white",
};

const pageDescStyle: CSSProperties = {
  margin: "8px 0 0 0",
  fontSize: 14,
  color: "#94a3b8",
};

const headerActionStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const backButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  background: "#1e293b",
  color: "white",
  textDecoration: "none",
  fontWeight: 600,
};

const voidButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#dc2626",
  color: "white",
  fontWeight: 700,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
  gap: 16,
};

const overviewGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
};

const infoBoxStyle: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#0f172a",
  border: "1px solid #1e293b",
};

const infoLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "#94a3b8",
  marginBottom: 6,
};

const infoValueStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: "white",
};

const textBoxStyle: CSSProperties = {
  marginTop: 16,
  padding: 14,
  borderRadius: 12,
  background: "#020617",
  border: "1px solid #1e293b",
};

const textValueStyle: CSSProperties = {
  color: "white",
  fontWeight: 600,
};

const voidInfoBoxStyle: CSSProperties = {
  marginTop: 12,
  padding: 14,
  borderRadius: 12,
  background: "rgba(220, 38, 38, 0.1)",
  border: "1px solid rgba(220, 38, 38, 0.45)",
};

const voidInfoLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "#fca5a5",
  marginBottom: 8,
};

const voidInfoMainStyle: CSSProperties = {
  color: "white",
  fontWeight: 700,
};

const voidInfoSubStyle: CSSProperties = {
  color: "#e2e8f0",
  marginTop: 6,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 900,
};

const tableHeadRowStyle: CSSProperties = {
  borderBottom: "1px solid #1e293b",
};

const tableBodyRowStyle: CSSProperties = {
  borderBottom: "1px solid #0f172a",
};

const linkStyle: CSSProperties = {
  color: "#38bdf8",
  textDecoration: "none",
  fontWeight: 700,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  fontSize: 12,
  color: "#94a3b8",
  fontWeight: 700,
};

const tdStyle: CSSProperties = {
  padding: "14px 10px",
  fontSize: 14,
  color: "white",
  verticalAlign: "middle",
};