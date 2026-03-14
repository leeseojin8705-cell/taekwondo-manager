"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import EmptyState from "../../../components/ui/EmptyState";
import { supabase } from "../../../lib/supabase";

type InventoryCategoryRow = {
  id: string;
  name: string | null;
};

type InventoryItemRow = {
  id: string;
  name: string;
  sku: string | null;
  sale_price: number;
  cost_price: number;
  track_stock: boolean;
  active: boolean;
  note: string | null;
  category_id: string | null;
  inventory_categories: {
    id: string;
    name: string | null;
  } | null;
};

type InventoryVariantCountRow = {
  inventory_item_id: string;
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        border: active ? "1px solid #166534" : "1px solid #7f1d1d",
        background: active ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
        color: active ? "#bbf7d0" : "#fecaca",
        padding: "5px 10px",
        fontSize: 11,
        fontWeight: 800,
      }}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function InventoryItemsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [categories, setCategories] = useState<InventoryCategoryRow[]>([]);
  const [variantCounts, setVariantCounts] = useState<Record<string, number>>({});

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [form, setForm] = useState({
    name: "",
    category_id: "",
    sku: "",
    sale_price: "",
    cost_price: "",
    track_stock: true,
    active: true,
    note: "",
  });

  useEffect(() => {
    fetchPage();
  }, []);

  async function fetchPage() {
    try {
      setLoading(true);
      setError(null);

      const [itemsRes, categoriesRes, variantsRes] = await Promise.all([
        supabase
          .from("inventory_items")
          .select(`
            id,
            name,
            sku,
            sale_price,
            cost_price,
            track_stock,
            active,
            note,
            category_id,
            inventory_categories:category_id (
              id,
              name
            )
          `)
          .order("name", { ascending: true }),

        supabase
          .from("inventory_categories")
          .select("id, name")
          .order("name", { ascending: true }),

        supabase
          .from("inventory_variants")
          .select("inventory_item_id")
          .eq("active", true),
      ]);

      const itemRows = (itemsRes.error ? [] : itemsRes.data ?? []) as unknown as InventoryItemRow[];
      const categoryRows = categoriesRes.error
        ? []
        : ((categoriesRes.data ?? []) as unknown as InventoryCategoryRow[]);
      const variantRows = (variantsRes.error ? [] : variantsRes.data ?? []) as unknown as InventoryVariantCountRow[];

      const counts: Record<string, number> = {};
      for (const row of variantRows) {
        counts[row.inventory_item_id] = (counts[row.inventory_item_id] || 0) + 1;
      }

      setItems(itemRows);
      setCategories(categoryRows);
      setVariantCounts(counts);
    } catch (err: any) {
      setError(err?.message || "Failed to load item catalog.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveItem() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (!form.name.trim()) {
        setError("Item name is required.");
        return;
      }

      if (form.sale_price === "" || Number(form.sale_price) < 0) {
        setError("Valid sale price is required.");
        return;
      }

      if (form.cost_price === "" || Number(form.cost_price) < 0) {
        setError("Valid cost price is required.");
        return;
      }

      const payload = {
        name: form.name.trim(),
        category_id: form.category_id || null,
        sku: form.sku.trim() || null,
        sale_price: Number(form.sale_price),
        cost_price: Number(form.cost_price),
        track_stock: form.track_stock,
        active: form.active,
        note: form.note.trim() || null,
      };

      const { error } = await supabase.from("inventory_items").insert(payload);

      if (error) throw error;

      setForm({
        name: "",
        category_id: "",
        sku: "",
        sale_price: "",
        cost_price: "",
        track_stock: true,
        active: true,
        note: "",
      });

      setSuccess("Inventory item saved successfully.");
      await fetchPage();
    } catch (err: any) {
      setError(err?.message || "Failed to save inventory item.");
    } finally {
      setSaving(false);
    }
  }

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (search.trim()) {
      const keyword = search.trim().toLowerCase();
      result = result.filter((row) => {
        const name = (row.name || "").toLowerCase();
        const sku = (row.sku || "").toLowerCase();
        const category = (row.inventory_categories?.name || "").toLowerCase();
        const note = (row.note || "").toLowerCase();

        return (
          name.includes(keyword) ||
          sku.includes(keyword) ||
          category.includes(keyword) ||
          note.includes(keyword)
        );
      });
    }

    if (categoryFilter !== "all") {
      result = result.filter(
        (row) => (row.inventory_categories?.name || "").toLowerCase() === categoryFilter
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        result = result.filter((row) => row.active);
      }
      if (statusFilter === "inactive") {
        result = result.filter((row) => !row.active);
      }
    }

    return result;
  }, [items, search, categoryFilter, statusFilter]);

  const summary = useMemo(() => {
    const totalItems = items.length;
    const activeItems = items.filter((row) => row.active).length;
    const trackStockItems = items.filter((row) => row.track_stock).length;
    const inactiveItems = items.filter((row) => !row.active).length;

    return {
      totalItems,
      activeItems,
      trackStockItems,
      inactiveItems,
    };
  }, [items]);

  if (loading) {
    return (
      <AppShell
        title="Item Catalog"
        description="Manage inventory master items, pricing, and stock tracking options"
      >
        <LoadingBlock message="Loading item catalog..." />
      </AppShell>
    );
  }

  if (error && items.length === 0) {
    return (
      <AppShell
        title="Item Catalog"
        description="Manage inventory master items, pricing, and stock tracking options"
      >
        <ErrorBlock title="Failed to load item catalog" message={error} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Item Catalog"
      description="Manage inventory master items, pricing, and stock tracking options"
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
          <Link href="/inventory/stock-in" style={buttonGhostStyle}>
            Stock In
          </Link>
          <Link href="/inventory/stock-out" style={buttonGhostStyle}>
            Stock Out
          </Link>
          <Link href="/inventory/log" style={buttonGhostStyle}>
            Inventory Log
          </Link>
        </div>

        {error ? <ErrorBlock title="Catalog Error" message={error} /> : null}
        {success ? <div style={successBoxStyle}>{success}</div> : null}

        <PageCard title="Catalog Summary">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            <SummaryCard title="Total Items" value={`${summary.totalItems}`} />
            <SummaryCard title="Active Items" value={`${summary.activeItems}`} tone="green" />
            <SummaryCard
              title="Track Stock Items"
              value={`${summary.trackStockItems}`}
              tone="blue"
            />
            <SummaryCard
              title="Inactive Items"
              value={`${summary.inactiveItems}`}
              tone="red"
            />
          </div>
        </PageCard>

        <PageCard title="New Item">
          <div style={formGridStyle}>
            <Field label="Item Name">
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                style={inputStyle}
                placeholder="Uniform"
              />
            </Field>

            <Field label="Category">
              <select
                value={form.category_id}
                onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}
                style={inputStyle}
              >
                <option value="">Select category</option>
                {categories.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name || "-"}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="SKU">
              <input
                value={form.sku}
                onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                style={inputStyle}
                placeholder="Optional SKU"
              />
            </Field>

            <Field label="Sale Price">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.sale_price}
                onChange={(e) => setForm((prev) => ({ ...prev, sale_price: e.target.value }))}
                style={inputStyle}
                placeholder="0.00"
              />
            </Field>

            <Field label="Cost Price">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.cost_price}
                onChange={(e) => setForm((prev) => ({ ...prev, cost_price: e.target.value }))}
                style={inputStyle}
                placeholder="0.00"
              />
            </Field>

            <Field label="Note">
              <input
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                style={inputStyle}
                placeholder="Optional note"
              />
            </Field>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 18,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <CheckField
              label="Track Stock"
              checked={form.track_stock}
              onChange={(checked) => setForm((prev) => ({ ...prev, track_stock: checked }))}
            />
            <CheckField
              label="Active"
              checked={form.active}
              onChange={(checked) => setForm((prev) => ({ ...prev, active: checked }))}
            />
          </div>

          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleSaveItem}
              disabled={saving}
              style={buttonPrimaryStyle}
            >
              {saving ? "Saving..." : "Save Item"}
            </button>
          </div>
        </PageCard>

        <PageCard title="Filters">
          <div style={filterGridStyle}>
            <Field label="Search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={inputStyle}
                placeholder="Name, SKU, category, note"
              />
            </Field>

            <Field label="Category">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="all">All</option>
                {categories.map((row) => (
                  <option key={row.id} value={(row.name || "").toLowerCase()}>
                    {row.name || "-"}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>
        </PageCard>

        <PageCard title="Item Records">
          {filteredItems.length === 0 ? (
            <EmptyState
              title="No items found"
              description="No inventory items match the current filters."
            />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {filteredItems.map((row) => (
                <div key={row.id} style={listCardStyle}>
                  <div style={listHeaderStyle}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={titleStyle}>{row.name}</div>
                      <div style={subTextStyle}>
                        Category: {row.inventory_categories?.name || "-"}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <TrackBadge trackStock={row.track_stock} />
                      <StatusBadge active={row.active} />
                    </div>
                  </div>

                  <div style={metaGridStyle}>
                    <MetaItem label="SKU" value={row.sku || "-"} />
                    <MetaItem label="Sale Price" value={formatMoney(row.sale_price)} />
                    <MetaItem label="Cost Price" value={formatMoney(row.cost_price)} />
                    <MetaItem
                      label="Variants"
                      value={`${variantCounts[row.id] || 0}`}
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

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        color: "#e2e8f0",
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
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
  tone?: "default" | "green" | "red" | "blue";
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

function TrackBadge({ trackStock }: { trackStock: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        border: trackStock ? "1px solid #1d4ed8" : "1px solid #334155",
        background: trackStock ? "rgba(59,130,246,0.12)" : "#0f172a",
        color: trackStock ? "#bfdbfe" : "#cbd5e1",
        padding: "5px 10px",
        fontSize: 11,
        fontWeight: 800,
      }}
    >
      {trackStock ? "Track Stock On" : "Track Stock Off"}
    </span>
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