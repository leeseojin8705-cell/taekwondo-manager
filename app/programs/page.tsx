"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/ui/AppShell";
import PageCard from "../../components/ui/PageCard";
import LoadingBlock from "../../components/ui/LoadingBlock";
import ErrorBlock from "../../components/ui/ErrorBlock";
import EmptyState from "../../components/ui/EmptyState";
import { supabase } from "../../lib/supabase";

type ProgramRow = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  sort_order: number | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function ProgramsPage() {
  const [rows, setRows] = useState<ProgramRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadPrograms() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("programs")
        .select(`
          id,
          name,
          description,
          price,
          sort_order,
          active,
          created_at,
          updated_at
        `)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (!mounted) return;

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as ProgramRow[]);
      }

      setLoading(false);
    }

    loadPrograms();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) => {
      return (
        row.name.toLowerCase().includes(q) ||
        (row.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, keyword]);

  const summary = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((row) => row.active === true).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [rows]);

  return (
    <AppShell
      title="Programs"
      description="Manage program master data used by students, pricing, contracts, and payments."
    >
      <div
        style={{
          display: "grid",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 800,
                color: "#f9fafb",
              }}
            >
              Programs
            </h1>
            <p
              style={{
                marginTop: 8,
                marginBottom: 0,
                color: "#9ca3af",
                fontSize: 14,
              }}
            >
              Manage program master data used by students, pricing, contracts,
              and payments.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <PageCard title="Total Programs">
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#f9fafb",
              }}
            >
              {summary.total}
            </div>
          </PageCard>

          <PageCard title="Active Programs">
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#22c55e",
              }}
            >
              {summary.active}
            </div>
          </PageCard>

          <PageCard title="Inactive Programs">
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#f87171",
              }}
            >
              {summary.inactive}
            </div>
          </PageCard>
        </div>

        <PageCard title="Program List">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search programs"
              style={{
                width: "100%",
                maxWidth: 360,
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #374151",
                background: "#0f172a",
                color: "#f9fafb",
                outline: "none",
              }}
            />
          </div>

          {loading ? (
            <LoadingBlock message="Loading programs..." />
          ) : error ? (
            <ErrorBlock message={error} />
          ) : filteredRows.length === 0 ? (
            <EmptyState
              title="No programs found"
              description="There is no program data yet or no result matches your search."
            />
          ) : (
            <div
              style={{
                overflowX: "auto",
                border: "1px solid #1f2937",
                borderRadius: 14,
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 980,
                  background: "#0b1220",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#111827",
                      borderBottom: "1px solid #1f2937",
                    }}
                  >
                    {[
                      "Order",
                      "Program Name",
                      "Description",
                      "Base Price",
                      "Status",
                    ].map((label) => (
                      <th
                        key={label}
                        style={{
                          textAlign: "left",
                          padding: "14px 16px",
                          fontSize: 13,
                          color: "#9ca3af",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: "1px solid #1f2937",
                      }}
                    >
                      <td
                        style={{
                          padding: "14px 16px",
                          color: "#e5e7eb",
                        }}
                      >
                        {row.sort_order ?? "-"}
                      </td>

                      <td
                        style={{
                          padding: "14px 16px",
                          color: "#f9fafb",
                          fontWeight: 700,
                        }}
                      >
                        {row.name}
                      </td>

                      <td
                        style={{
                          padding: "14px 16px",
                          color: "#d1d5db",
                        }}
                      >
                        {row.description || "-"}
                      </td>

                      <td
                        style={{
                          padding: "14px 16px",
                          color: "#e5e7eb",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatMoney(row.price)}
                      </td>

                      <td
                        style={{
                          padding: "14px 16px",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "6px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            background: row.active === true
                              ? "rgba(34,197,94,0.15)"
                              : "rgba(239,68,68,0.15)",
                            color: row.active === true ? "#4ade80" : "#f87171",
                            border: row.active === true
                              ? "1px solid rgba(34,197,94,0.35)"
                              : "1px solid rgba(239,68,68,0.35)",
                          }}
                        >
                          {row.active === true ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PageCard>
      </div>
    </AppShell>
  );
}