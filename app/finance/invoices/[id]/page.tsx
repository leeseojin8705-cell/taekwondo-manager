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

type InvoiceDetailRow = {
  id: string;
  invoice_number: string | null;
  student_id: string | null;
  student_name: string | null;
  student_contract_id: string | null;
  student_program_id: string | null;
  payment_category: string | null;
  description: string | null;
  issued_date: string | null;
  due_date: string | null;
  subtotal_amount: number | null;
  discount_amount: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  paid_amount: number | null;
  balance_amount: number | null;
  invoice_status: string | null;
  payment_status: string | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
  voided_at?: string | null;
  void_reason?: string | null;
};

type InvoiceItemRow = {
  id: string;
  invoice_id: string;
  item_type: string | null;
  description: string | null;
  qty: number | null;
  unit_price_snapshot: number | null;
  line_discount_snapshot: number | null;
  line_tax_snapshot: number | null;
  line_total: number | null;
  sort_order: number | null;
  note: string | null;
  created_at: string | null;
};

type PaymentRelation = {
  id: string;
  payment_date: string | null;
  payment_status: string | null;
  payment_method: string | null;
  reference_number: string | null;
  amount: number | null;
  note: string | null;
  voided_at?: string | null;
  void_reason?: string | null;
};

type AllocationRow = {
  id: string;
  payment_id: string;
  invoice_id: string;
  allocated_amount: number | null;
  status: string | null;
  note: string | null;
  created_at: string | null;
  voided_at?: string | null;
  void_reason?: string | null;
  payments: PaymentRelation | PaymentRelation[] | null;
};

function getInvoiceStatusColor(status: string | null) {
  switch (status) {
    case "paid":
      return "#22c55e";
    case "partial":
      return "#f59e0b";
    case "overdue":
      return "#ef4444";
    case "issued":
      return "#38bdf8";
    case "draft":
      return "#a78bfa";
    case "void":
      return "#94a3b8";
    default:
      return "#64748b";
  }
}

function getPaymentStatusColor(status: string | null) {
  switch (status) {
    case "completed":
      return "#22c55e";
    case "pending":
      return "#f59e0b";
    case "void":
      return "#94a3b8";
    case "refunded":
      return "#ef4444";
    default:
      return "#64748b";
  }
}

function normalizePayment(
  value: PaymentRelation | PaymentRelation[] | null
): PaymentRelation | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [invoice, setInvoice] = useState<InvoiceDetailRow | null>(null);
  const [items, setItems] = useState<InvoiceItemRow[]>([]);
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
    if (!invoiceId) return;

    setLoading(true);
    setError(null);

    const invoiceRes = await supabase
      .from("invoices")
      .select(
        `
          id,
          invoice_number,
          student_id,
          student_name,
          student_contract_id,
          student_program_id,
          payment_category,
          description,
          issued_date,
          due_date,
          subtotal_amount,
          discount_amount,
          tax_amount,
          total_amount,
          paid_amount,
          balance_amount,
          invoice_status,
          payment_status,
          note,
          created_at,
          updated_at,
          voided_at,
          void_reason
        `
      )
      .eq("id", invoiceId)
      .single();

    if (invoiceRes.error) {
      setError(invoiceRes.error.message);
      setLoading(false);
      return;
    }

    const itemRes = await supabase
      .from("invoice_items")
      .select(
        `
          id,
          invoice_id,
          item_type,
          description,
          qty,
          unit_price_snapshot,
          line_discount_snapshot,
          line_tax_snapshot,
          line_total,
          sort_order,
          note,
          created_at
        `
      )
      .eq("invoice_id", invoiceId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (itemRes.error) {
      setError(itemRes.error.message);
      setLoading(false);
      return;
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
          note,
          created_at,
          voided_at,
          void_reason,
          payments (
            id,
            payment_date,
            payment_status,
            payment_method,
            reference_number,
            amount,
            note,
            voided_at,
            void_reason
          )
        `
      )
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: true });

    if (allocationRes.error) {
      setError(allocationRes.error.message);
      setLoading(false);
      return;
    }

    setInvoice(invoiceRes.data as InvoiceDetailRow);
    setItems((itemRes.data ?? []) as InvoiceItemRow[]);
    setAllocations((allocationRes.data ?? []) as AllocationRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [invoiceId]);

  async function handleVoidInvoice() {
    if (!invoice?.id) return;

    if ((invoice.invoice_status ?? "") === "void") {
      alert("This invoice is already void.");
      return;
    }

    const reason = window.prompt("Void reason");
    if (reason === null) return;

    setSubmitting(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc("void_invoice", {
      p_invoice_id: invoice.id,
      p_void_reason: reason.trim() || null,
    });

    if (rpcError) {
      setError(rpcError.message);
      setSubmitting(false);
      return;
    }

    await loadData();
    setSubmitting(false);
    alert("Invoice void completed.");
  }

  if (loading) {
    return (
      <AppShell title="Invoice Detail">
        <LoadingBlock />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Invoice Detail">
        <ErrorBlock message={error} />
      </AppShell>
    );
  }

  if (!invoice) {
    return (
      <AppShell title="Invoice Detail">
        <EmptyState
          title="Invoice not found"
          description="The requested invoice record does not exist."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Invoice Detail">
      <div style={headerWrapStyle}>
        <div>
          <div style={eyebrowStyle}>Finance</div>
          <h1 style={pageTitleStyle}>Invoice Detail</h1>
          <p style={pageDescStyle}>
            Review invoice header, line items, allocations, and void history.
          </p>
        </div>

        <div style={headerActionStyle}>
          <Link href="/finance/invoices" style={backButtonStyle}>
            Back to Invoices
          </Link>

          <button
            type="button"
            onClick={handleVoidInvoice}
            disabled={submitting || (invoice.invoice_status ?? "") === "void"}
            style={{
              ...voidButtonStyle,
              opacity:
                submitting || (invoice.invoice_status ?? "") === "void"
                  ? 0.6
                  : 1,
              cursor:
                submitting || (invoice.invoice_status ?? "") === "void"
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {submitting ? "Voiding..." : "Void Invoice"}
          </button>
        </div>
      </div>

      <div style={gridStyle}>
        <div style={{ gridColumn: "span 12" }}>
          <PageCard title="Invoice Overview">
            <div style={overviewGridStyle}>
              {[
                ["Invoice Number", invoice.invoice_number || "-"],
                ["Student", invoice.student_name || "-"],
                ["Category", invoice.payment_category || "-"],
                ["Invoice Status", invoice.invoice_status || "-"],
                ["Payment Status", invoice.payment_status || "-"],
                ["Issued Date", formatDate(invoice.issued_date)],
                ["Due Date", formatDate(invoice.due_date)],
                ["Subtotal", formatMoney(invoice.subtotal_amount || 0)],
                ["Discount", formatMoney(invoice.discount_amount || 0)],
                ["Tax", formatMoney(invoice.tax_amount || 0)],
                ["Total", formatMoney(invoice.total_amount || 0)],
                ["Paid", formatMoney(invoice.paid_amount || 0)],
                ["Balance", formatMoney(invoice.balance_amount || 0)],
                ["Created", formatDateTime(invoice.created_at)],
              ].map(([label, value]) => (
                <div key={label} style={infoBoxStyle}>
                  <div style={infoLabelStyle}>{label}</div>
                  <div
                    style={{
                      ...infoValueStyle,
                      color:
                        label === "Invoice Status"
                          ? getInvoiceStatusColor(invoice.invoice_status)
                          : label === "Payment Status"
                          ? getPaymentStatusColor(
                              invoice.payment_status === "paid"
                                ? "completed"
                                : invoice.payment_status === "void"
                                ? "void"
                                : invoice.payment_status === "partial"
                                ? "pending"
                                : "pending"
                            )
                          : "white",
                    }}
                  >
                    {label === "Student" && invoice.student_id ? (
                      <Link href={`/students/${invoice.student_id}`} style={{ color: "#93c5fd", fontWeight: 600, textDecoration: "none" }}>
                        {invoice.student_name || "-"}
                      </Link>
                    ) : (
                      value
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={textBoxStyle}>
              <div style={infoLabelStyle}>Description</div>
              <div style={textValueStyle}>{invoice.description || "-"}</div>
            </div>

            <div style={{ ...textBoxStyle, marginTop: 12 }}>
              <div style={infoLabelStyle}>Note</div>
              <div style={textValueStyle}>{invoice.note || "-"}</div>
            </div>

            {(invoice.invoice_status ?? "") === "void" && (
              <div style={voidInfoBoxStyle}>
                <div style={voidInfoLabelStyle}>Void Information</div>
                <div style={voidInfoMainStyle}>
                  Voided At: {formatDateTime(invoice.voided_at)}
                </div>
                <div style={voidInfoSubStyle}>
                  Reason: {invoice.void_reason || "-"}
                </div>
              </div>
            )}
          </PageCard>
        </div>

        <div style={{ gridColumn: "span 12" }}>
          <PageCard
            title="Invoice Items"
            subtitle="Price snapshot lines stored at invoice creation time"
          >
            {items.length === 0 ? (
              <EmptyState
                title="No invoice items"
                description="There are no line items attached to this invoice."
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={tableHeadRowStyle}>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Description</th>
                      <th style={thStyle}>Qty</th>
                      <th style={thStyle}>Unit Price</th>
                      <th style={thStyle}>Discount</th>
                      <th style={thStyle}>Tax</th>
                      <th style={thStyle}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr key={row.id} style={tableBodyRowStyle}>
                        <td style={tdStyle}>{row.item_type || "-"}</td>
                        <td style={tdStyle}>{row.description || "-"}</td>
                        <td style={tdStyle}>{row.qty ?? 0}</td>
                        <td style={tdStyle}>
                          {formatMoney(row.unit_price_snapshot || 0)}
                        </td>
                        <td style={tdStyle}>
                          {formatMoney(row.line_discount_snapshot || 0)}
                        </td>
                        <td style={tdStyle}>
                          {formatMoney(row.line_tax_snapshot || 0)}
                        </td>
                        <td style={tdStyle}>
                          {formatMoney(row.line_total || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PageCard>
        </div>

        <div style={{ gridColumn: "span 12" }}>
          <PageCard
            title="Active Allocations"
            subtitle="Payments currently applied to this invoice"
          >
            {activeAllocations.length === 0 ? (
              <EmptyState
                title="No active allocations"
                description="This invoice has no active payment allocations."
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={tableHeadRowStyle}>
                      <th style={thStyle}>Payment</th>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Method</th>
                      <th style={thStyle}>Payment Status</th>
                      <th style={thStyle}>Allocated</th>
                      <th style={thStyle}>Reference</th>
                      <th style={thStyle}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeAllocations.map((row) => {
                      const payment = normalizePayment(row.payments);

                      return (
                        <tr key={row.id} style={tableBodyRowStyle}>
                          <td style={tdStyle}>
                            {payment?.id ? (
                              <Link
                                href={`/finance/payments/${payment.id}`}
                                style={linkStyle}
                              >
                                View Payment
                              </Link>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td style={tdStyle}>
                            {formatDate(payment?.payment_date)}
                          </td>
                          <td style={tdStyle}>{payment?.payment_method || "-"}</td>
                          <td
                            style={{
                              ...tdStyle,
                              color: getPaymentStatusColor(
                                payment?.payment_status || null
                              ),
                              fontWeight: 700,
                            }}
                          >
                            {payment?.payment_status || "-"}
                          </td>
                          <td style={tdStyle}>
                            {formatMoney(row.allocated_amount || 0)}
                          </td>
                          <td style={tdStyle}>
                            {payment?.reference_number || "-"}
                          </td>
                          <td style={tdStyle}>{row.note || payment?.note || "-"}</td>
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
          <PageCard
            title="Voided Allocation History"
            subtitle="Allocation history remains preserved after payment void"
          >
            {voidedAllocations.length === 0 ? (
              <EmptyState
                title="No voided allocation history"
                description="There are no voided allocation records for this invoice."
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={tableHeadRowStyle}>
                      <th style={thStyle}>Payment</th>
                      <th style={thStyle}>Allocated</th>
                      <th style={thStyle}>Voided At</th>
                      <th style={thStyle}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voidedAllocations.map((row) => {
                      const payment = normalizePayment(row.payments);

                      return (
                        <tr key={row.id} style={tableBodyRowStyle}>
                          <td style={tdStyle}>
                            {payment?.id ? (
                              <Link
                                href={`/finance/payments/${payment.id}`}
                                style={linkStyle}
                              >
                                View Payment
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