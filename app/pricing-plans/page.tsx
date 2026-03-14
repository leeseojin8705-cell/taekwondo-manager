"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/ui/AppShell";
import PageCard from "../../components/ui/PageCard";
import LoadingBlock from "../../components/ui/LoadingBlock";
import ErrorBlock from "../../components/ui/ErrorBlock";
import EmptyState from "../../components/ui/EmptyState";
import { supabase } from "../../lib/supabase";

type PricingPlanRow = {
  id: string;
  program_id: string | null;
  name: string;
  billing_type: string;
  contract_months: number;
  weekly_frequency: number | null;
  sessions_per_week: number | null;
  amount: number;
  registration_fee: number;
  late_fee: number;
  sort_order: number;
  active: boolean;
  note: string | null;
  programs: {
    name: string | null;
  } | null;
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatBillingType(value: string | null) {
  if (!value) return "-";

  const map: Record<string, string> = {
    monthly: "Monthly",
    contract: "Contract",
    weekly: "Weekly",
    one_time: "One Time",
  };

  return map[value] ?? value;
}

export default function PricingPlansPage() {
  const [rows, setRows] = useState<PricingPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadPricingPlans() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("pricing_plans")
        .select(`
          id,
          program_id,
          name,
          billing_type,
          contract_months,
          weekly_frequency,
          sessions_per_week,
          amount,
          registration_fee,
          late_fee,
          sort_order,
          active,
          note,
          programs (
            name
          )
        `)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (!mounted) return;

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as unknown as PricingPlanRow[]);
      }

      setLoading(false);
    }

    loadPricingPlans();

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
        (row.programs?.name ?? "").toLowerCase().includes(q) ||
        row.billing_type.toLowerCase().includes(q) ||
        (row.note ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, keyword]);

  const summary = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((row) => row.active).length;
    const inactive = rows.filter((row) => !row.active).length;
    const avgAmount =
      rows.length > 0
        ? rows.reduce((sum, row) => sum + Number(row.amount || 0), 0) / rows.length
        : 0;

    return { total, active, inactive, avgAmount };
  }, [rows]);

  return (
    <AppShell title="Pricing Plans" description="Program pricing plans">
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
              Pricing Plans
            </h1>
            <p
              style={{
                marginTop: 8,
                marginBottom: 0,
                color: "#9ca3af",
                fontSize: 14,
              }}
            >
              Manage tuition plans by program, contract term, and billing type.
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
          <PageCard title="Total Plans">
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

          <PageCard title="Active Plans">
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

          <PageCard title="Inactive Plans">
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

          <PageCard title="Average Amount">
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#60a5fa",
              }}
            >
              {formatMoney(summary.avgAmount)}
            </div>
          </PageCard>
        </div>

        <PageCard title="Plan List">
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
              placeholder="Search pricing plans"
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
            <LoadingBlock message="Loading pricing plans..." />
          ) : error ? (
            <ErrorBlock message={error} />
          ) : filteredRows.length === 0 ? (
            <EmptyState
              title="No pricing plans found"
              description="There is no pricing plan data yet or no result matches your search."
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
                  minWidth: 1280,
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
                      "Plan Name",
                      "Program",
                      "Billing Type",
                      "Months",
                      "Weekly Frequency",
                      "Amount",
                      "Registration Fee",
                      "Late Fee",
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
                      <td style={{ padding: "14px 16px", color: "#e5e7eb" }}>
                        {row.sort_order}
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

                      <td style={{ padding: "14px 16px", color: "#d1d5db" }}>
                        {row.programs?.name ?? "-"}
                      </td>

                      <td style={{ padding: "14px 16px", color: "#d1d5db" }}>
                        {formatBillingType(row.billing_type)}
                      </td>

                      <td style={{ padding: "14px 16px", color: "#d1d5db" }}>
                        {row.contract_months}
                      </td>

                      <td style={{ padding: "14px 16px", color: "#d1d5db" }}>
                        {row.weekly_frequency ?? row.sessions_per_week ?? "-"}
                      </td>

                      <td
                        style={{
                          padding: "14px 16px",
                          color: "#e5e7eb",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatMoney(row.amount)}
                      </td>

                      <td
                        style={{
                          padding: "14px 16px",
                          color: "#e5e7eb",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatMoney(row.registration_fee)}
                      </td>

                      <td
                        style={{
                          padding: "14px 16px",
                          color: "#e5e7eb",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatMoney(row.late_fee)}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "6px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            background: row.active
                              ? "rgba(34,197,94,0.15)"
                              : "rgba(239,68,68,0.15)",
                            color: row.active ? "#4ade80" : "#f87171",
                            border: row.active
                              ? "1px solid rgba(34,197,94,0.35)"
                              : "1px solid rgba(239,68,68,0.35)",
                          }}
                        >
                          {row.active ? "Active" : "Inactive"}
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