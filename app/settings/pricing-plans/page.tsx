"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import { supabase } from "../../../lib/supabase";
import { formatMoney } from "../../../lib/format";

type PricingPlanRow = {
  id: string;
  name: string;
  billing_cycle: "monthly" | "term" | "package" | "custom";
  duration_months: number;
  sessions_per_week: number | null;
  base_price: number;
  registration_fee: number;
  discount_percent: number;
  display_order: number;
  active: boolean;
  created_at: string;
};

type PricingPlanForm = {
  name: string;
  billing_cycle: "monthly" | "term" | "package" | "custom";
  duration_months: string;
  sessions_per_week: string;
  base_price: string;
  registration_fee: string;
  discount_percent: string;
  display_order: string;
  active: boolean;
};

const defaultForm: PricingPlanForm = {
  name: "",
  billing_cycle: "monthly",
  duration_months: "1",
  sessions_per_week: "",
  base_price: "0",
  registration_fee: "0",
  discount_percent: "0",
  display_order: "0",
  active: true,
};

export default function PricingPlansPage() {
  const [rows, setRows] = useState<PricingPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<PricingPlanForm>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function loadPricingPlans() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("pricing_plans")
      .select(
        "id, name, billing_cycle, duration_months, sessions_per_week, base_price, registration_fee, discount_percent, display_order, active, created_at"
      )
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setError(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data || []) as PricingPlanRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadPricingPlans();
  }, []);

  function resetForm() {
    setForm(defaultForm);
    setEditingId(null);
  }

  function startEdit(row: PricingPlanRow) {
    setEditingId(row.id);
    setForm({
      name: row.name ?? "",
      billing_cycle: row.billing_cycle ?? "monthly",
      duration_months: String(row.duration_months ?? 1),
      sessions_per_week:
        row.sessions_per_week === null || row.sessions_per_week === undefined
          ? ""
          : String(row.sessions_per_week),
      base_price: String(row.base_price ?? 0),
      registration_fee: String(row.registration_fee ?? 0),
      discount_percent: String(row.discount_percent ?? 0),
      display_order: String(row.display_order ?? 0),
      active: row.active ?? true,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Plan name is required.");
      return;
    }

    const durationMonths = Number(form.duration_months || 1);
    const sessionsPerWeek =
      form.sessions_per_week.trim() === "" ? null : Number(form.sessions_per_week);
    const basePrice = Number(form.base_price || 0);
    const registrationFee = Number(form.registration_fee || 0);
    const discountPercent = Number(form.discount_percent || 0);
    const displayOrder = Number(form.display_order || 0);

    if (durationMonths < 1) {
      setError("Duration months must be 1 or more.");
      return;
    }

    if (sessionsPerWeek !== null && sessionsPerWeek < 0) {
      setError("Sessions per week cannot be negative.");
      return;
    }

    if (basePrice < 0 || registrationFee < 0) {
      setError("Price and registration fee cannot be negative.");
      return;
    }

    if (discountPercent < 0 || discountPercent > 100) {
      setError("Discount percent must be between 0 and 100.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      billing_cycle: form.billing_cycle,
      duration_months: durationMonths,
      sessions_per_week: sessionsPerWeek,
      base_price: basePrice,
      registration_fee: registrationFee,
      discount_percent: discountPercent,
      display_order: displayOrder,
      active: form.active,
    };

    if (editingId) {
      const { error } = await supabase
        .from("pricing_plans")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("pricing_plans").insert(payload);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }

    resetForm();
    await loadPricingPlans();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("Delete this pricing plan?");
    if (!ok) return;

    setError(null);

    const { error } = await supabase
      .from("pricing_plans")
      .delete()
      .eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    if (editingId === id) {
      resetForm();
    }

    await loadPricingPlans();
  }

  async function toggleActive(row: PricingPlanRow) {
    setError(null);

    const { error } = await supabase
      .from("pricing_plans")
      .update({ active: !row.active })
      .eq("id", row.id);

    if (error) {
      setError(error.message);
      return;
    }

    await loadPricingPlans();
  }

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return rows;

    return rows.filter((row) => {
      return (
        row.name.toLowerCase().includes(keyword) ||
        row.billing_cycle.toLowerCase().includes(keyword)
      );
    });
  }, [rows, search]);

  return (
    <AppShell
      title="Pricing Plans"
      description="Manage pricing master data used later by contracts, renewals, and payment records."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(360px, 500px) minmax(0, 1fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        <PageCard title={editingId ? "Edit Pricing Plan" : "New Pricing Plan"}>
          <p style={subTextStyle}>
            This is base pricing master data. Existing contracts should keep their
            own snapshot later.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Plan Name</label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="ex) Monthly 3 Times"
                style={inputStyle}
              />
            </div>

            <div style={twoColStyle}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle}>Billing Cycle</label>
                <select
                  value={form.billing_cycle}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      billing_cycle: e.target.value as PricingPlanForm["billing_cycle"],
                    }))
                  }
                  style={inputStyle}
                >
                  <option value="monthly">monthly</option>
                  <option value="term">term</option>
                  <option value="package">package</option>
                  <option value="custom">custom</option>
                </select>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle}>Duration Months</label>
                <input
                  type="number"
                  value={form.duration_months}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      duration_months: e.target.value,
                    }))
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={twoColStyle}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle}>Sessions Per Week</label>
                <input
                  type="number"
                  value={form.sessions_per_week}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sessions_per_week: e.target.value,
                    }))
                  }
                  placeholder="leave blank if not fixed"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle}>Display Order</label>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      display_order: e.target.value,
                    }))
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={twoColStyle}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle}>Base Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.base_price}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, base_price: e.target.value }))
                  }
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle}>Registration Fee</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.registration_fee}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      registration_fee: e.target.value,
                    }))
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Discount Percent</label>
              <input
                type="number"
                step="0.01"
                value={form.discount_percent}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    discount_percent: e.target.value,
                  }))
                }
                style={inputStyle}
              />
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                color: "#cbd5e1",
              }}
            >
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, active: e.target.checked }))
                }
              />
              Active
            </label>

            {error ? <ErrorBlock message={error} /> : null}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" disabled={saving} style={primaryButtonStyle}>
                {saving ? "Saving..." : editingId ? "Update Plan" : "Create Plan"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                style={secondaryButtonStyle}
              >
                Reset
              </button>
            </div>
          </form>
        </PageCard>

        <PageCard title="Pricing Plan List">
          <p style={subTextStyle}>
            Pricing plans must be stable before contracts and payment records are
            built.
          </p>

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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plan name or cycle"
              style={{
                ...inputStyle,
                maxWidth: 320,
              }}
            />
          </div>

          {loading ? (
            <div style={infoBoxStyle}>Loading pricing plans...</div>
          ) : filteredRows.length === 0 ? (
            <div style={infoBoxStyle}>No pricing plans found. Create your first pricing master data.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Order</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Cycle</th>
                    <th style={thStyle}>Months</th>
                    <th style={thStyle}>Per Week</th>
                    <th style={thStyle}>Base Price</th>
                    <th style={thStyle}>Reg Fee</th>
                    <th style={thStyle}>Discount</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Created</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td style={tdStyle}>{row.display_order}</td>
                      <td style={tdStyle}>{row.name}</td>
                      <td style={tdStyle}>{row.billing_cycle}</td>
                      <td style={tdStyle}>{row.duration_months}</td>
                      <td style={tdStyle}>{row.sessions_per_week ?? "-"}</td>
                      <td style={tdStyle}>{formatMoney(row.base_price || 0)}</td>
                      <td style={tdStyle}>
                        {formatMoney(row.registration_fee || 0)}
                      </td>
                      <td style={tdStyle}>{row.discount_percent}%</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            background: row.active
                              ? "rgba(34,197,94,0.15)"
                              : "rgba(148,163,184,0.15)",
                            color: row.active ? "#4ade80" : "#cbd5e1",
                          }}
                        >
                          {row.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {new Date(row.created_at).toLocaleDateString()}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            style={miniButtonStyle}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(row)}
                            style={miniButtonStyle}
                          >
                            {row.active ? "Disable" : "Enable"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            style={dangerMiniButtonStyle}
                          >
                            Delete
                          </button>
                        </div>
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

const twoColStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const subTextStyle: CSSProperties = {
  margin: "0 0 14px 0",
  fontSize: 14,
  color: "#94a3b8",
  lineHeight: 1.5,
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#cbd5e1",
};

const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#f8fafc",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 14,
  outline: "none",
};

const infoBoxStyle: CSSProperties = {
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#cbd5e1",
  borderRadius: 12,
  padding: "16px 18px",
  fontSize: 14,
};

const primaryButtonStyle: CSSProperties = {
  border: "none",
  background: "#22c55e",
  color: "#052e16",
  borderRadius: 10,
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  border: "1px solid #334155",
  background: "#111827",
  color: "#e5e7eb",
  borderRadius: 10,
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const miniButtonStyle: CSSProperties = {
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#f8fafc",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const dangerMiniButtonStyle: CSSProperties = {
  border: "1px solid rgba(239,68,68,0.35)",
  background: "rgba(127,29,29,0.2)",
  color: "#fecaca",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 1200,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "1px solid #334155",
  color: "#94a3b8",
  fontSize: 12,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const tdStyle: CSSProperties = {
  padding: "14px 10px",
  borderBottom: "1px solid rgba(51,65,85,0.6)",
  color: "#f8fafc",
  fontSize: 14,
};