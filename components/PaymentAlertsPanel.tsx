"use client";

import { useEffect, useMemo, useState } from "react";

type PaymentAlertListRow = {
  id: string;
  student_id: string | null;
  student_name: string | null;
  amount: number | null;
  original_amount: number | null;
  discount_amount: number | null;
  final_amount: number | null;
  discount_note: string | null;
  payment_method: string | null;
  payment_date: string | null;
  billing_start_date: string | null;
  billing_end_date: string | null;
  is_renewal: boolean | null;
  note: string | null;
  status: string | null;
  income_category: string | null;
  is_overdue: boolean;
};

type ApiResponse = {
  items: PaymentAlertListRow[];
};

const cardStyle: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 18,
  padding: 20,
};

const smallCardStyle: React.CSSProperties = {
  ...cardStyle,
  minHeight: 120,
};

export default function PaymentAlertsPanel() {
  const [items, setItems] = useState<PaymentAlertListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    fetchPaymentAlerts();
  }, []);

  async function fetchPaymentAlerts() {
    setLoading(true);
    setErrorText("");

    try {
      const res = await fetch("/api/dashboard/payment-alerts", {
        cache: "no-store",
      });

      const json = (await res.json()) as ApiResponse | { error: string };

      if (!res.ok) {
        console.log("payment alerts fetch error:", json);
  setItems([]);
  setErrorText(("error" in json && json.error) ? json.error : "Failed to load payment alerts.");
  return;
}

      setItems((json as ApiResponse).items ?? []);
    } catch (error) {
      console.error("fetchPaymentAlerts error:", error);
      setItems([]);
      setErrorText(
        error instanceof Error ? error.message : "Failed to load payment alerts."
      );
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    const unpaidCount = items.length;
    const unpaidAmount = items.reduce(
      (sum, item) => sum + Number(item.final_amount ?? item.amount ?? 0),
      0
    );

    const overdueItems = items.filter((item) => item.is_overdue);
    const overdueCount = overdueItems.length;
    const overdueAmount = overdueItems.reduce(
      (sum, item) => sum + Number(item.final_amount ?? item.amount ?? 0),
      0
    );

    return {
      unpaidCount,
      unpaidAmount,
      overdueCount,
      overdueAmount,
    };
  }, [items]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <div style={smallCardStyle}>
          <div style={{ color: "#94a3b8", fontSize: 13 }}>Unpaid Count</div>
          <div style={{ fontSize: 32, fontWeight: 900, marginTop: 10 }}>
            {summary.unpaidCount}
          </div>
        </div>

        <div style={smallCardStyle}>
          <div style={{ color: "#94a3b8", fontSize: 13 }}>Unpaid Amount</div>
          <div style={{ fontSize: 32, fontWeight: 900, marginTop: 10 }}>
            ${summary.unpaidAmount.toLocaleString()}
          </div>
        </div>

        <div style={smallCardStyle}>
          <div style={{ color: "#94a3b8", fontSize: 13 }}>Overdue Count</div>
          <div style={{ fontSize: 32, fontWeight: 900, marginTop: 10 }}>
            {summary.overdueCount}
          </div>
        </div>

        <div style={smallCardStyle}>
          <div style={{ color: "#94a3b8", fontSize: 13 }}>Overdue Amount</div>
          <div style={{ fontSize: 32, fontWeight: 900, marginTop: 10 }}>
            ${summary.overdueAmount.toLocaleString()}
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
            Payment Alerts
          </h2>

          <button
            type="button"
            onClick={fetchPaymentAlerts}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #334155",
              background: "#111827",
              color: "#f8fafc",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div>Loading payment alerts...</div>
        ) : errorText ? (
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "#450a0a",
              border: "1px solid #7f1d1d",
              color: "#fecaca",
              fontWeight: 700,
            }}
          >
            Failed to load payment alerts: {errorText}
          </div>
        ) : items.length === 0 ? (
          <div style={{ color: "#94a3b8" }}>No payment alerts.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 1100,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  <th style={thStyle}>Student</th>
                  <th style={thStyle}>Payment Date</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Original</th>
                  <th style={thStyle}>Discount</th>
                  <th style={thStyle}>Final</th>
                  <th style={thStyle}>Method</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Overdue</th>
                  <th style={thStyle}>Note</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #0f172a" }}>
                    <td style={tdStyle}>{item.student_name ?? "-"}</td>
                    <td style={tdStyle}>{item.payment_date ?? "-"}</td>
                    <td style={tdStyle}>{item.status ?? "-"}</td>
                    <td style={tdStyle}>{item.original_amount ?? item.amount ?? 0}</td>
                    <td style={tdStyle}>{item.discount_amount ?? 0}</td>
                    <td style={tdStyle}>{item.final_amount ?? item.amount ?? 0}</td>
                    <td style={tdStyle}>{item.payment_method ?? "-"}</td>
                    <td style={tdStyle}>{item.income_category ?? "-"}</td>
                    <td style={tdStyle}>{item.is_overdue ? "Yes" : "No"}</td>
                    <td style={tdStyle}>{item.note ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  color: "#94a3b8",
  fontSize: 13,
};

const tdStyle: React.CSSProperties = {
  padding: "14px 10px",
  color: "#e2e8f0",
};