"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "../../components/ui/AppShell";
import PageCard from "../../components/ui/PageCard";
import { supabase } from "../../lib/supabase";

type PaymentMethodRow = {
  id: string;
  name: string;
  code: string | null;
  method_type: string | null;
  display_order: number | null;
  active: boolean | null;
  requires_reference: boolean | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

type FormState = {
  name: string;
  code: string;
  method_type: string;
  display_order: string;
  active: boolean;
  requires_reference: boolean;
  note: string;
};

const emptyForm: FormState = {
  name: "",
  code: "",
  method_type: "other",
  display_order: "0",
  active: true,
  requires_reference: false,
  note: "",
};

function normalizeCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export default function PaymentMethodsPage() {
  const [rows, setRows] = useState<PaymentMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(true);

  async function fetchPaymentMethods() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setError(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data as PaymentMethodRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (!showInactive && !row.active) return false;
      if (!keyword) return true;

      return (
        row.name.toLowerCase().includes(keyword) ||
        (row.code ?? "").toLowerCase().includes(keyword) ||
        (row.method_type ?? "").toLowerCase().includes(keyword) ||
        (row.note ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [rows, search, showInactive]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
  }

  function startEdit(row: PaymentMethodRow) {
    setEditingId(row.id);
    setForm({
      name: row.name ?? "",
      code: row.code ?? "",
      method_type: row.method_type ?? "other",
      display_order: String(row.display_order ?? 0),
      active: row.active ?? true,
      requires_reference: row.requires_reference ?? false,
      note: row.note ?? "",
    });

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmedName = form.name.trim();
    const finalCode = normalizeCode(form.code || form.name);
    const finalDisplayOrder = Number(form.display_order || 0);

    if (!trimmedName) {
      setError("Payment method name is required.");
      return;
    }

    if (Number.isNaN(finalDisplayOrder)) {
      setError("Display order must be a valid number.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: trimmedName,
      code: finalCode || null,
      method_type: form.method_type.trim() || "other",
      display_order: finalDisplayOrder,
      active: form.active,
      requires_reference: form.requires_reference,
      note: form.note.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("payment_methods")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("payment_methods").insert(payload);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }

    resetForm();
    await fetchPaymentMethods();
    setSaving(false);
  }

  async function handleToggleActive(row: PaymentMethodRow) {
    setError(null);

    const { error } = await supabase
      .from("payment_methods")
      .update({ active: !(row.active ?? true) })
      .eq("id", row.id);

    if (error) {
      setError(error.message);
      return;
    }

    await fetchPaymentMethods();
  }

  async function handleDelete(row: PaymentMethodRow) {
    setError(null);

    const { count, error: countError } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("payment_method_id", row.id);

    if (countError) {
      setError(countError.message);
      return;
    }

    if ((count ?? 0) > 0) {
      setError(
        `"${row.name}" is already used in payments. Delete is blocked. Set it inactive instead.`
      );
      return;
    }

    const { error } = await supabase
      .from("payment_methods")
      .delete()
      .eq("id", row.id);

    if (error) {
      setError(error.message);
      return;
    }

    if (editingId === row.id) {
      resetForm();
    }

    await fetchPaymentMethods();
  }

  const totalCount = rows.length;
  const activeCount = rows.filter((row) => row.active).length;
  const inactiveCount = rows.filter((row) => !row.active).length;

  return (
    <AppShell
      title="Payment Methods"
      description="Master data for payment method management"
    >
      <div style={{ display: "grid", gap: 16 }}>
        <PageCard title={editingId ? "Edit Payment Method" : "New Payment Method"}>
          <div style={{ display: "grid", gap: 16 }}>
            <p style={sectionDescription}>
              Create and manage the base payment methods used by Payments.
            </p>

            {error && <div style={errorBoxStyle}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                }}
              >
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={labelStyle}>Method Name</span>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="ex) Card"
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={labelStyle}>Code</span>
                  <input
                    value={form.code}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, code: e.target.value }))
                    }
                    placeholder="ex) card"
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={labelStyle}>Method Type</span>
                  <select
                    value={form.method_type}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, method_type: e.target.value }))
                    }
                    style={inputStyle}
                  >
                    <option value="cash">cash</option>
                    <option value="card">card</option>
                    <option value="bank_transfer">bank_transfer</option>
                    <option value="check">check</option>
                    <option value="auto_pay">auto_pay</option>
                    <option value="other">other</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={labelStyle}>Display Order</span>
                  <input
                    type="number"
                    value={form.display_order}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        display_order: e.target.value,
                      }))
                    }
                    placeholder="0"
                    style={inputStyle}
                  />
                </label>
              </div>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={labelStyle}>Note</span>
                <textarea
                  value={form.note}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, note: e.target.value }))
                  }
                  rows={3}
                  placeholder="Optional memo"
                  style={textareaStyle}
                />
              </label>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#e2e8f0",
                    fontWeight: 700,
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

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#e2e8f0",
                    fontWeight: 700,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.requires_reference}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        requires_reference: e.target.checked,
                      }))
                    }
                  />
                  Requires Reference
                </label>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="submit" disabled={saving} style={primaryButtonStyle}>
                  {saving
                    ? editingId
                      ? "Saving..."
                      : "Creating..."
                    : editingId
                    ? "Update Method"
                    : "Create Method"}
                </button>

                <button type="button" onClick={resetForm} style={secondaryButtonStyle}>
                  Reset
                </button>
              </div>
            </form>
          </div>
        </PageCard>

        <PageCard title="Payment Methods List">
          <div style={{ display: "grid", gap: 16 }}>
            <p style={sectionDescription}>
              These values should be referenced by payments and finance reporting.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={badgeStyle}>Total: {totalCount}</div>
                <div style={badgeStyle}>Active: {activeCount}</div>
                <div style={badgeStyle}>Inactive: {inactiveCount}</div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search payment method"
                  style={{ ...inputStyle, minWidth: 220 }}
                />

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#e2e8f0",
                    fontWeight: 700,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                  />
                  Show inactive
                </label>
              </div>
            </div>

            {loading ? (
              <div style={infoBoxStyle}>Loading payment methods...</div>
            ) : filteredRows.length === 0 ? (
              <div style={emptyBoxStyle}>No payment methods found.</div>
            ) : (
              <div
                style={{
                  overflowX: "auto",
                  border: "1px solid #1e293b",
                  borderRadius: 16,
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 1100,
                  }}
                >
                  <thead style={{ background: "#0f172a" }}>
                    <tr>
                      <th style={thStyle}>Order</th>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>Code</th>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Reference</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Note</th>
                      <th style={thStyle}>Updated</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr
                        key={row.id}
                        style={{
                          borderTop: "1px solid #1e293b",
                          background: row.active ? "#020617" : "#111827",
                        }}
                      >
                        <td style={tdStyle}>{row.display_order ?? 0}</td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 800 }}>{row.name}</div>
                        </td>
                        <td style={tdStyle}>{row.code || "-"}</td>
                        <td style={tdStyle}>{row.method_type || "-"}</td>
                        <td style={tdStyle}>
                          {row.requires_reference ? "YES" : "NO"}
                        </td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 800,
                              background: row.active ? "#052e16" : "#3f3f46",
                              color: row.active ? "#86efac" : "#d4d4d8",
                            }}
                          >
                            {row.active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td style={tdStyle}>{row.note || "-"}</td>
                        <td style={tdStyle}>
                          {new Date(row.updated_at).toLocaleString()}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => startEdit(row)}
                              style={smallButtonStyle}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleActive(row)}
                              style={smallButtonStyle}
                            >
                              {row.active ? "Deactivate" : "Activate"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              style={dangerButtonStyle}
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
          </div>
        </PageCard>
      </div>
    </AppShell>
  );
}

const sectionDescription: React.CSSProperties = {
  margin: 0,
  color: "#94a3b8",
  fontSize: 14,
  lineHeight: 1.6,
};

const labelStyle: React.CSSProperties = {
  fontWeight: 700,
  color: "#e2e8f0",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0f172a",
  color: "#f8fafc",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: "12px 14px",
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  background: "#0f172a",
  color: "#f8fafc",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: "12px 14px",
  outline: "none",
  resize: "vertical",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: 12,
  padding: "12px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "#1e293b",
  color: "#f8fafc",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: "12px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const smallButtonStyle: React.CSSProperties = {
  background: "#1e293b",
  color: "#f8fafc",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  background: "#7f1d1d",
  color: "#fee2e2",
  border: "1px solid #991b1b",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "14px 12px",
  fontSize: 13,
  color: "#94a3b8",
  fontWeight: 800,
};

const tdStyle: React.CSSProperties = {
  padding: "14px 12px",
  verticalAlign: "top",
  color: "#e2e8f0",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#e2e8f0",
  fontSize: 13,
  fontWeight: 700,
};

const errorBoxStyle: React.CSSProperties = {
  background: "#7f1d1d",
  color: "#fee2e2",
  border: "1px solid #991b1b",
  borderRadius: 12,
  padding: "12px 14px",
  fontWeight: 700,
};

const infoBoxStyle: React.CSSProperties = {
  background: "#0f172a",
  color: "#cbd5e1",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: "14px 16px",
  fontWeight: 600,
};

const emptyBoxStyle: React.CSSProperties = {
  background: "#0f172a",
  color: "#94a3b8",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: "18px 16px",
  textAlign: "center",
  fontWeight: 600,
};