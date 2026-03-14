"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import EmptyState from "../../../components/ui/EmptyState";
import { supabase } from "../../../lib/supabase";

type InventoryItemRow = {
  id: string;
  name: string;
  cost_price: number;
  active: boolean;
};

type InventoryVariantRow = {
  id: string;
  inventory_item_id: string;
  variant_name: string;
  stock_quantity: number;
  cost_price_override: number | null;
  active: boolean;
};

type RecentStockInRow = {
  id: string;
  movement_date: string;
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  vendor_name: string | null;
  reason: string;
  note: string | null;
  inventory_items: {
    name: string | null;
  } | null;
  inventory_variants: {
    variant_name: string | null;
  } | null;
};

const STOCK_IN_REASONS = [
  "purchase",
  "return",
  "adjustment",
  "restock",
  "correction",
];

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

function getTodayLocalDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function InventoryStockInPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [variants, setVariants] = useState<InventoryVariantRow[]>([]);
  const [recentRows, setRecentRows] = useState<RecentStockInRow[]>([]);

  const [form, setForm] = useState({
    movement_date: getTodayLocalDate(),
    inventory_item_id: "",
    inventory_variant_id: "",
    quantity: "",
    unit_cost: "",
    vendor_name: "",
    reason: "purchase",
    note: "",
  });

  useEffect(() => {
    fetchPage();
  }, []);

  async function fetchPage() {
    try {
      setLoading(true);
      setError(null);

      const [itemsRes, variantsRes, recentRes] = await Promise.all([
        supabase
          .from("inventory_items")
          .select("id, name, cost_price, active")
          .eq("active", true)
          .order("name", { ascending: true }),

        supabase
          .from("inventory_variants")
          .select(`
            id,
            inventory_item_id,
            variant_name,
            stock_quantity,
            cost_price_override,
            active
          `)
          .eq("active", true)
          .order("variant_name", { ascending: true }),

        supabase
          .from("inventory_movements")
          .select(`
            id,
            movement_date,
            quantity,
            unit_cost,
            total_cost,
            vendor_name,
            reason,
            note,
            inventory_items:inventory_item_id (
              name
            ),
            inventory_variants:inventory_variant_id (
              variant_name
            )
          `)
          .eq("direction", "in")
          .order("movement_date", { ascending: false })
          .limit(20),
      ]);

      setItems((itemsRes.error ? [] : itemsRes.data ?? []) as unknown as InventoryItemRow[]);
      setVariants((variantsRes.error ? [] : variantsRes.data ?? []) as unknown as InventoryVariantRow[]);
      setRecentRows((recentRes.error ? [] : recentRes.data ?? []) as unknown as RecentStockInRow[]);
    } catch (err: any) {
      setError(err?.message || "Failed to load stock in page.");
    } finally {
      setLoading(false);
    }
  }

  const filteredVariants = useMemo(() => {
    if (!form.inventory_item_id) return [];
    return variants.filter(
      (row) => row.inventory_item_id === form.inventory_item_id
    );
  }, [variants, form.inventory_item_id]);

  const selectedItem = useMemo(() => {
    return items.find((row) => row.id === form.inventory_item_id) || null;
  }, [items, form.inventory_item_id]);

  const selectedVariant = useMemo(() => {
    return variants.find((row) => row.id === form.inventory_variant_id) || null;
  }, [variants, form.inventory_variant_id]);

  useEffect(() => {
    if (!form.inventory_item_id) return;

    const relatedVariants = variants.filter(
      (row) => row.inventory_item_id === form.inventory_item_id
    );

    if (relatedVariants.length === 1) {
      setForm((prev) => ({
        ...prev,
        inventory_variant_id: relatedVariants[0].id,
      }));
    } else if (
      form.inventory_variant_id &&
      !relatedVariants.some((row) => row.id === form.inventory_variant_id)
    ) {
      setForm((prev) => ({
        ...prev,
        inventory_variant_id: "",
      }));
    }
  }, [form.inventory_item_id, form.inventory_variant_id, variants]);

  useEffect(() => {
    if (!selectedItem) return;

    const recommendedCost =
      selectedVariant?.cost_price_override != null
        ? selectedVariant.cost_price_override
        : selectedItem.cost_price;

    if (
      form.unit_cost === "" &&
      recommendedCost != null &&
      !Number.isNaN(Number(recommendedCost))
    ) {
      setForm((prev) => ({
        ...prev,
        unit_cost: String(recommendedCost),
      }));
    }
  }, [selectedItem, selectedVariant, form.unit_cost]);

  const totalCost = useMemo(() => {
    const qty = Number(form.quantity || 0);
    const unit = Number(form.unit_cost || 0);
    return qty * unit;
  }, [form.quantity, form.unit_cost]);

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (!form.inventory_item_id) {
        setError("Item is required.");
        return;
      }

      if (!form.inventory_variant_id) {
        setError("Variant is required.");
        return;
      }

      if (!form.movement_date) {
        setError("Movement date is required.");
        return;
      }

      if (!form.quantity || Number(form.quantity) <= 0) {
        setError("Quantity must be greater than 0.");
        return;
      }

      if (form.unit_cost === "" || Number(form.unit_cost) < 0) {
        setError("Valid unit cost is required.");
        return;
      }

      const quantity = Number(form.quantity);
      const unitCost = Number(form.unit_cost);
      const computedTotalCost = quantity * unitCost;

      const selectedVariantRow = variants.find(
        (row) => row.id === form.inventory_variant_id
      );

      if (!selectedVariantRow) {
        setError("Selected variant not found.");
        return;
      }

      const movementPayload = {
        inventory_item_id: form.inventory_item_id,
        inventory_variant_id: form.inventory_variant_id,
        direction: "in",
        quantity,
        unit_cost: unitCost,
        total_cost: computedTotalCost,
        reason: form.reason,
        vendor_name: form.vendor_name.trim() || null,
        note: form.note.trim() || null,
        movement_date: form.movement_date,
      };

      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert(movementPayload);

      if (movementError) throw movementError;

      const { error: variantUpdateError } = await supabase
        .from("inventory_variants")
        .update({
          stock_quantity: Number(selectedVariantRow.stock_quantity || 0) + quantity,
        })
        .eq("id", form.inventory_variant_id);

      if (variantUpdateError) throw variantUpdateError;

      setSuccess("Stock in saved successfully.");

      setForm({
        movement_date: getTodayLocalDate(),
        inventory_item_id: "",
        inventory_variant_id: "",
        quantity: "",
        unit_cost: "",
        vendor_name: "",
        reason: "purchase",
        note: "",
      });

      await fetchPage();
    } catch (err: any) {
      setError(err?.message || "Failed to save stock in.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell
        title="Stock In"
        description="Record inbound inventory and increase stock quantity"
      >
        <LoadingBlock message="Loading stock in page..." />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Stock In"
      description="Record inbound inventory and increase stock quantity"
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
          <Link href="/inventory" style={buttonGhostStyle}>
            Back to Inventory Home
          </Link>
          <Link href="/inventory/items" style={buttonGhostStyle}>
            Item Catalog
          </Link>
          <Link href="/inventory/stock-out" style={buttonGhostStyle}>
            Stock Out
          </Link>
          <Link href="/inventory/log" style={buttonGhostStyle}>
            Inventory Log
          </Link>
        </div>

        {error ? <ErrorBlock title="Stock In Error" message={error} /> : null}
        {success ? <div style={successBoxStyle}>{success}</div> : null}

        <PageCard title="Stock In Form">
          <div style={formGridStyle}>
            <Field label="Date">
              <input
                type="date"
                value={form.movement_date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, movement_date: e.target.value }))
                }
                style={inputStyle}
              />
            </Field>

            <Field label="Item">
              <select
                value={form.inventory_item_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    inventory_item_id: e.target.value,
                    inventory_variant_id: "",
                    unit_cost: "",
                  }))
                }
                style={inputStyle}
              >
                <option value="">Select item</option>
                {items.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Variant">
              <select
                value={form.inventory_variant_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    inventory_variant_id: e.target.value,
                    unit_cost: "",
                  }))
                }
                style={inputStyle}
                disabled={!form.inventory_item_id}
              >
                <option value="">Select variant</option>
                {filteredVariants.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.variant_name} (Current: {row.stock_quantity})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Quantity">
              <input
                type="number"
                min="1"
                step="1"
                value={form.quantity}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, quantity: e.target.value }))
                }
                style={inputStyle}
                placeholder="0"
              />
            </Field>

            <Field label="Unit Cost">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.unit_cost}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, unit_cost: e.target.value }))
                }
                style={inputStyle}
                placeholder="0.00"
              />
            </Field>

            <Field label="Reason">
              <select
                value={form.reason}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, reason: e.target.value }))
                }
                style={inputStyle}
              >
                {STOCK_IN_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Vendor / Source">
              <input
                value={form.vendor_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, vendor_name: e.target.value }))
                }
                style={inputStyle}
                placeholder="Vendor name"
              />
            </Field>

            <Field label="Total Cost">
              <div style={readBoxStyle}>{formatMoney(totalCost)}</div>
            </Field>
          </div>

          <div style={{ marginTop: 16 }}>
            <Field label="Note">
              <textarea
                value={form.note}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, note: e.target.value }))
                }
                style={textareaStyle}
                placeholder="Optional note"
              />
            </Field>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={buttonPrimaryStyle}
            >
              {saving ? "Saving..." : "Save Stock In"}
            </button>
          </div>
        </PageCard>

        <PageCard title="Recent Stock In Records">
          {recentRows.length === 0 ? (
            <EmptyState
              title="No stock in records"
              description="No inbound inventory movements have been recorded yet."
            />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {recentRows.map((row) => (
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

                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 900,
                        color: "#bbf7d0",
                      }}
                    >
                      +{row.quantity}
                    </div>
                  </div>

                  <div style={metaGridStyle}>
                    <MetaItem label="Date" value={formatDate(row.movement_date)} />
                    <MetaItem label="Reason" value={row.reason || "-"} />
                    <MetaItem label="Vendor" value={row.vendor_name || "-"} />
                    <MetaItem
                      label="Unit Cost"
                      value={formatMoney(row.unit_cost)}
                    />
                    <MetaItem
                      label="Total Cost"
                      value={formatMoney(row.total_cost)}
                    />
                  </div>

                  {row.note ? <div style={noteBoxStyle}>{row.note}</div> : null}
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

const formGridStyle: React.CSSProperties = {
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

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 100,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#f8fafc",
  borderRadius: 10,
  padding: "12px 14px",
  outline: "none",
  resize: "vertical",
};

const readBoxStyle: React.CSSProperties = {
  border: "1px solid #334155",
  background: "#0b1220",
  color: "#f8fafc",
  borderRadius: 10,
  padding: "12px 14px",
  minHeight: 46,
  display: "flex",
  alignItems: "center",
  fontWeight: 700,
};

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

const successBoxStyle: React.CSSProperties = {
  border: "1px solid #166534",
  background: "rgba(34,197,94,0.12)",
  color: "#dcfce7",
  borderRadius: 14,
  padding: 16,
  fontWeight: 700,
};