"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import EmptyState from "../../../components/ui/EmptyState";

type InventoryMovementRow = {
  id: string;
  movement_date: string;
  direction: string;
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  reason: string;
  vendor_name: string | null;
  reference_type: string | null;
  reference_id: string | null;
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
    name?: string | null;
    full_name?: string | null;
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
        name?: string | null;
        full_name?: string | null;
      }
    | null
    | undefined
) {
  return student?.name || student?.full_name || "-";
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

export default function InventoryLogPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<InventoryMovementRow[]>([]);

  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState("all");

  useEffect(() => {
    fetchInventoryLog();
  }, []);

  async function fetchInventoryLog() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/inventory/movements?limit=300");
      const json = res.ok ? await res.json() : { movements: [] };
      setRows((json.movements ?? []) as unknown as InventoryMovementRow[]);
    } catch (err: any) {
      setError(err?.message || "Failed to load inventory log.");
    } finally {
      setLoading(false);
    }
  }

  const reasonOptions = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .map((row) => row.reason || "")
          .filter((value) => value.trim().length > 0)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    let result = [...rows];

    if (search.trim()) {
      const keyword = search.trim().toLowerCase();

      result = result.filter((row) => {
        const itemName = (row.inventory_items?.name || "").toLowerCase();
        const variantName = (row.inventory_variants?.variant_name || "").toLowerCase();
        const reason = (row.reason || "").toLowerCase();
        const vendor = (row.vendor_name || "").toLowerCase();
        const note = (row.note || "").toLowerCase();
        const studentName = getStudentName(row.students).toLowerCase();
        const refType = (row.reference_type || "").toLowerCase();

        return (
          itemName.includes(keyword) ||
          variantName.includes(keyword) ||
          reason.includes(keyword) ||
          vendor.includes(keyword) ||
          note.includes(keyword) ||
          studentName.includes(keyword) ||
          refType.includes(keyword)
        );
      });
    }

    if (directionFilter !== "all") {
      result = result.filter(
        (row) => (row.direction || "").toLowerCase() === directionFilter
      );
    }

    if (reasonFilter !== "all") {
      result = result.filter(
        (row) => (row.reason || "").toLowerCase() === reasonFilter
      );
    }

    return result;
  }, [rows, search, directionFilter, reasonFilter]);

  const summary = useMemo(() => {
    const totalMovements = filteredRows.length;
    const totalIn = filteredRows
      .filter((row) => (row.direction || "").toLowerCase() === "in")
      .reduce((sum, row) => sum + Number(row.quantity || 0), 0);

    const totalOut = filteredRows
      .filter((row) => (row.direction || "").toLowerCase() === "out")
      .reduce((sum, row) => sum + Number(row.quantity || 0), 0);

    const purchaseValue = filteredRows
      .filter((row) => (row.direction || "").toLowerCase() === "in")
      .reduce((sum, row) => sum + Number(row.total_cost || 0), 0);

    return {
      totalMovements,
      totalIn,
      totalOut,
      purchaseValue,
    };
  }, [filteredRows]);

  if (loading) {
    return (
      <AppShell
        title="Inventory Log"
        description="Track all inventory movements including stock in, stock out, adjustments, and sales"
      >
        <LoadingBlock message="Loading inventory log..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell
        title="Inventory Log"
        description="Track all inventory movements including stock in, stock out, adjustments, and sales"
      >
        <ErrorBlock title="Failed to load inventory log" message={error} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Inventory Log"
      description="Track all inventory movements including stock in, stock out, adjustments, and sales"
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
          <Link href="/inventory/stock-in" style={buttonGhostStyle}>
            Stock In
          </Link>
          <Link href="/inventory/stock-out" style={buttonGhostStyle}>
            Stock Out
          </Link>
        </div>

        <PageCard title="Log Summary">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            <SummaryCard title="Total Movements" value={`${summary.totalMovements}`} />
            <SummaryCard title="Total In Units" value={`${summary.totalIn}`} tone="green" />
            <SummaryCard title="Total Out Units" value={`${summary.totalOut}`} tone="red" />
            <SummaryCard
              title="Inbound Cost Value"
              value={formatMoney(summary.purchaseValue)}
              tone="yellow"
            />
          </div>
        </PageCard>

        <PageCard title="Filters">
          <div style={filterGridStyle}>
            <Field label="Search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={inputStyle}
                placeholder="Item, variant, reason, vendor, student, note"
              />
            </Field>

            <Field label="Direction">
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="all">All</option>
                <option value="in">In</option>
                <option value="out">Out</option>
              </select>
            </Field>

            <Field label="Reason">
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="all">All</option>
                {reasonOptions.map((reason) => (
                  <option key={reason} value={reason.toLowerCase()}>
                    {reason}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </PageCard>

        <PageCard title="Movement Records">
          {filteredRows.length === 0 ? (
            <EmptyState
              title="No inventory movements found"
              description="No log records match the current filters."
            />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {filteredRows.map((row) => (
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
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <DirectionPill value={row.direction} />
                    </div>
                  </div>

                  <div style={metaGridStyle}>
                    <MetaItem label="Date" value={formatDate(row.movement_date)} />
                    <MetaItem label="Quantity" value={`${row.quantity}`} />
                    <MetaItem label="Reason" value={row.reason || "-"} />
                    <MetaItem label="Vendor" value={row.vendor_name || "-"} />
                    <MetaItem label="Student" value={getStudentName(row.students)} />
                    <MetaItem label="Ref Type" value={row.reference_type || "-"} />
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

function SummaryCard({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: string;
  tone?: "default" | "green" | "red" | "yellow";
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