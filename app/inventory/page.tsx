"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/ui/AppShell";
import PageCard from "../../components/ui/PageCard";
import LoadingBlock from "../../components/ui/LoadingBlock";
import ErrorBlock from "../../components/ui/ErrorBlock";
import EmptyState from "../../components/ui/EmptyState";
import { supabase } from "../../lib/supabase";

type InventoryItemRow = {
  id: string;
  name: string;
  active: boolean;
  sale_price: number;
  cost_price: number;
  track_stock: boolean;
};

type InventoryVariantRow = {
  id: string;
  inventory_item_id: string;
  variant_name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  sale_price_override: number | null;
  cost_price_override: number | null;
  active: boolean;
  inventory_items: {
    id: string;
    name: string | null;
  } | null;
};

type InventoryMovementRow = {
  id: string;
  movement_date: string;
  direction: string;
  quantity: number;
  reason: string;
  vendor_name: string | null;
  note: string | null;
  inventory_items: {
    id: string;
    name: string | null;
  } | null;
  inventory_variants: {
    id: string;
    variant_name: string | null;
  } | null;
  students: {
    id: string;
    full_name?: string | null;
    name?: string | null;
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

function DirectionPill({ value }: { value: string | null | undefined }) {
  const normalized = (value || "").toLowerCase();

  const isIn = normalized === "in";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        border: isIn ? "1px solid #166534" : "1px solid #7f1d1d",
        background: isIn ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
        color: isIn ? "#bbf7d0" : "#fecaca",
        padding: "5px 10px",
        fontSize: 11,
        fontWeight: 800,
        textTransform: "uppercase",
      }}
    >
      {value || "-"}
    </span>
  );
}

export default function InventoryHomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [variants, setVariants] = useState<InventoryVariantRow[]>([]);
  const [movements, setMovements] = useState<InventoryMovementRow[]>([]);

  useEffect(() => {
    fetchInventoryHome();
  }, []);

  async function fetchInventoryHome() {
    try {
      setLoading(true);
      setError(null);

      const [itemsRes, variantsRes, movementsRes] = await Promise.all([
        supabase
          .from("inventory_items")
          .select(`
            id,
            name,
            active,
            sale_price,
            cost_price,
            track_stock
          `)
          .order("name", { ascending: true })
          .limit(500),

        supabase
          .from("inventory_variants")
          .select(`
            id,
            inventory_item_id,
            variant_name,
            stock_quantity,
            low_stock_threshold,
            sale_price_override,
            cost_price_override,
            active,
            inventory_items:inventory_item_id (
              id,
              name
            )
          `)
          .order("created_at", { ascending: false })
          .limit(1000),

        fetch("/api/inventory/movements?limit=20").then((r) => (r.ok ? r.json() : { movements: [] })),
      ]);

      setItems((itemsRes.error ? [] : itemsRes.data ?? []) as unknown as InventoryItemRow[]);
      setVariants((variantsRes.error ? [] : variantsRes.data ?? []) as unknown as InventoryVariantRow[]);
      setMovements((movementsRes?.movements ?? []) as unknown as InventoryMovementRow[]);
      const allFailed = itemsRes.error && variantsRes.error;
      setError(allFailed ? "Inventory data could not be loaded. Run scripts/inventory_tables_create.sql and scripts/inventory_columns_fix.sql in Supabase." : null);
    } catch (err: any) {
      const msg = err?.message || "Failed to load inventory home.";
      setError(
        msg.includes("relation") || msg.includes("does not exist")
          ? `${msg} Create inventory_items, inventory_variants, inventory_movements (and optionally inventory_categories) in Supabase. See Settings → Database setup.`
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    const activeItems = items.filter((row) => row.active).length;

    const totalStockUnits = variants
      .filter((row) => row.active)
      .reduce((sum, row) => sum + Number(row.stock_quantity || 0), 0);

    const lowStockItems = variants.filter((row) => {
      if (!row.active) return false;
      return Number(row.stock_quantity || 0) <= Number(row.low_stock_threshold || 0);
    });

    const inventoryValueAtCost = variants
      .filter((row) => row.active)
      .reduce((sum, row) => {
        const matchedItem = items.find((item) => item.id === row.inventory_item_id);
        const cost =
          row.cost_price_override != null
            ? Number(row.cost_price_override)
            : Number(matchedItem?.cost_price || 0);

        return sum + cost * Number(row.stock_quantity || 0);
      }, 0);

    const inventoryValueAtSale = variants
      .filter((row) => row.active)
      .reduce((sum, row) => {
        const matchedItem = items.find((item) => item.id === row.inventory_item_id);
        const sale =
          row.sale_price_override != null
            ? Number(row.sale_price_override)
            : Number(matchedItem?.sale_price || 0);

        return sum + sale * Number(row.stock_quantity || 0);
      }, 0);

    const recentStockMovements = movements.length;

    return {
      activeItems,
      totalStockUnits,
      lowStockCount: lowStockItems.length,
      inventoryValueAtCost,
      inventoryValueAtSale,
      recentStockMovements,
      lowStockPreview: lowStockItems.slice(0, 8),
    };
  }, [items, movements, variants]);

  if (loading) {
    return (
      <AppShell
        title="Inventory Home"
        description="Inventory hub for item catalog, stock movement, low stock alerts, and summary"
      >
        <LoadingBlock message="Loading inventory home..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell
        title="Inventory Home"
        description="Inventory hub for item catalog, stock movement, low stock alerts, and summary"
      >
        <ErrorBlock title="Failed to load inventory home" message={error} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Inventory Home"
      description="Inventory hub for item catalog, stock movement, low stock alerts, and summary"
    >
      <div style={{ display: "grid", gap: 20 }}>
        <PageCard title="Inventory Summary">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
            }}
          >
            <SummaryCard title="Active Items" value={`${summary.activeItems}`} />
            <SummaryCard title="Total Stock Units" value={`${summary.totalStockUnits}`} tone="blue" />
            <SummaryCard title="Low Stock Items" value={`${summary.lowStockCount}`} tone="red" />
            <SummaryCard
              title="Inventory Value at Cost"
              value={formatMoney(summary.inventoryValueAtCost)}
              tone="yellow"
            />
            <SummaryCard
              title="Inventory Value at Sale"
              value={formatMoney(summary.inventoryValueAtSale)}
              tone="green"
            />
            <SummaryCard
              title="Recent Stock Movements"
              value={`${summary.recentStockMovements}`}
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
            <Link href="/inventory/items" style={buttonPrimaryStyle}>
              Item Catalog
            </Link>
            <Link href="/inventory/stock-in" style={buttonGhostStyle}>
              Stock In
            </Link>
            <Link href="/inventory/stock-out" style={buttonGhostStyle}>
              Stock Out
            </Link>
            <Link href="/inventory/log" style={buttonGhostStyle}>
              Inventory Log
            </Link>
            <Link href="/inventory/low-stock" style={buttonGhostStyle}>
              Low Stock Alert
            </Link>
            <Link href="/inventory/summary" style={buttonGhostStyle}>
              Inventory Summary
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
          <PageCard title="Low Stock Preview">
            {summary.lowStockPreview.length === 0 ? (
              <EmptyState
                title="No low stock items"
                description="No variants are currently below threshold."
              />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {summary.lowStockPreview.map((row) => (
                  <div key={row.id} style={listCardStyle}>
                    <div style={listHeaderStyle}>
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={titleStyle}>
                          {row.inventory_items?.name || "-"}
                        </div>
                        <div style={subTextStyle}>
                          Variant: {row.variant_name || "-"}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 900,
                          color: "#fecaca",
                        }}
                      >
                        {row.stock_quantity}
                      </div>
                    </div>

                    <div style={metaGridStyle}>
                      <MetaItem label="Current Stock" value={`${row.stock_quantity}`} />
                      <MetaItem
                        label="Threshold"
                        value={`${row.low_stock_threshold}`}
                      />
                      <MetaItem
                        label="Status"
                        value="Restock Recommended"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageCard>

          <PageCard title="Recent Stock Movements">
            {movements.length === 0 ? (
              <EmptyState
                title="No stock movements"
                description="No inventory movement records are available."
              />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {movements.map((row) => (
                  <div key={row.id} style={listCardStyle}>
                    <div style={listHeaderStyle}>
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={titleStyle}>
                          {row.inventory_items?.name || "-"}
                        </div>
                        <div style={subTextStyle}>
                          Variant: {row.inventory_variants?.variant_name || "-"}
                        </div>
                      </div>

                      <DirectionPill value={row.direction} />
                    </div>

                    <div style={metaGridStyle}>
                      <MetaItem label="Date" value={formatDate(row.movement_date)} />
                      <MetaItem label="Quantity" value={`${row.quantity}`} />
                      <MetaItem label="Reason" value={row.reason || "-"} />
                      <MetaItem label="Vendor" value={row.vendor_name || "-"} />
                      <MetaItem
                        label="Student"
                        value={getStudentName(row.students)}
                      />
                    </div>

                    {row.note ? <div style={noteBoxStyle}>{row.note}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </PageCard>
        </div>
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