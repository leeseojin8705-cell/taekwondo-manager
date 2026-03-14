"use client";

import Link from "next/link";
import PageCard from "../ui/PageCard";
import EmptyState from "../ui/EmptyState";

type Row = {
  id: string;
  item_name: string;
  stock_qty: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
};

type Props = {
  items: Row[];
};

export default function LowStockPanel({ items }: Props) {
  return (
    <PageCard
      title="Low Stock"
      subtitle="Items that need restock"
      right={
        <Link
          href="/inventory"
          style={{
            color: "#67e8f9",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Go to Inventory
        </Link>
      }
    >
      {items.length === 0 ? (
        <EmptyState title="No low stock items" />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #334155",
                borderRadius: 14,
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div style={{ color: "#fff", fontWeight: 800 }}>{item.item_name}</div>
              <div style={{ color: "#fbbf24", fontWeight: 700 }}>
                {item.stock_qty} / threshold {item.low_stock_threshold}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageCard>
  );
}