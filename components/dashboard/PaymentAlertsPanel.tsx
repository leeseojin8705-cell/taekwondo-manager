"use client";

import Link from "next/link";
import { formatMoney, formatDate } from "../../lib/format";
import PageCard from "../ui/PageCard";
import EmptyState from "../ui/EmptyState";

type AlertRow = {
  id: string;
  student_id: string | null;
  student_name: string | null;
  payment_category: string;
  description: string | null;
  final_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: string;
  due_date: string | null;
  is_overdue: boolean;
};

type Props = {
  alerts: AlertRow[];
};

export default function PaymentAlertsPanel({ alerts }: Props) {
  return (
    <PageCard
      title="Payment Alerts"
      subtitle="Overdue or unpaid balance"
      right={
        <Link
          href="/finance/payments"
          style={{
            color: "#67e8f9",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Go to Payments
        </Link>
      }
    >
      {alerts.length === 0 ? (
        <EmptyState
          title="No payment alerts"
          description="Everything is currently clean."
        />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {alerts.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #334155",
                borderRadius: 14,
                padding: 14,
                background: item.is_overdue ? "#2b1318" : "#111827",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ color: "#fff", fontWeight: 800 }}>
                    {item.student_name ?? "Unknown Student"}
                  </div>
                  <div
                    style={{
                      color: "#cbd5e1",
                      marginTop: 4,
                      fontSize: 14,
                    }}
                  >
                    {item.description || item.payment_category}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#fca5a5", fontWeight: 800 }}>
                    Balance {formatMoney(item.balance_amount)}
                  </div>
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  >
                    Due {formatDate(item.due_date)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageCard>
  );
}