"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import EmptyState from "../../../components/ui/EmptyState";
import { supabase } from "../../../lib/supabase";

type TestingTypeRow = {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
  created_at: string;
};

type FormState = {
  name: string;
  active: boolean;
  sort_order: string;
};

const defaultForm: FormState = {
  name: "",
  active: true,
  sort_order: "0",
};

const smallKoStyle = { fontSize: 11, color: "#64748b", fontWeight: 400, marginLeft: 4 } as const;
const subTextStyle: CSSProperties = { fontSize: 13, color: "#94a3b8", marginBottom: 16, lineHeight: 1.5 };
const labelStyle: CSSProperties = { fontSize: 13, fontWeight: 700, color: "#cbd5e1" };
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
const tableStyle: CSSProperties = { width: "100%", borderCollapse: "collapse", minWidth: 400 };
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

export default function SettingsTestingPage() {
  const [rows, setRows] = useState<TestingTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  const [form, setForm] = useState<FormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadTestingTypes() {
    setLoading(true);
    setError(null);
    setTableMissing(false);

    const { data, error: err } = await supabase
      .from("testing_types")
      .select("id, name, active, sort_order, created_at")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (err) {
      const msg = err.message ?? "";
      if (err.code === "PGRST205" || msg.includes("testing_types") || msg.includes("does not exist")) {
        setTableMissing(true);
        setRows([]);
      } else {
        setError(err.message);
        setRows([]);
      }
      setLoading(false);
      return;
    }

    setRows((data ?? []) as TestingTypeRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadTestingTypes();
  }, []);

  function resetForm() {
    if (editingId) {
      const row = rows.find((r) => r.id === editingId);
      if (row) {
        setForm({
          name: row.name ?? "",
          active: row.active ?? true,
          sort_order: String(row.sort_order ?? 0),
        });
        return;
      }
    }
    setForm(defaultForm);
    setEditingId(null);
  }

  function startEdit(row: TestingTypeRow) {
    setEditingId(row.id);
    setForm({
      name: row.name ?? "",
      active: row.active ?? true,
      sort_order: String(row.sort_order ?? 0),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      active: form.active,
      sort_order: Math.max(0, parseInt(form.sort_order, 10) || 0),
    };

    if (editingId) {
      const { error: updateErr } = await supabase
        .from("testing_types")
        .update(payload)
        .eq("id", editingId);

      if (updateErr) {
        setError(updateErr.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertErr } = await supabase.from("testing_types").insert(payload);

      if (insertErr) {
        setError(insertErr.message);
        setSaving(false);
        return;
      }
    }

    resetForm();
    await loadTestingTypes();
    setSaving(false);
  }

  async function toggleActive(row: TestingTypeRow) {
    setError(null);
    const { error: err } = await supabase
      .from("testing_types")
      .update({ active: !row.active })
      .eq("id", row.id);

    if (err) {
      setError(err.message);
      return;
    }
    await loadTestingTypes();
  }

  return (
    <AppShell
      title="Testing Settings"
      description="Manage testing types, defaults, and rules for promotion events."
    >
      <div style={{ marginBottom: 12 }}>
        <Link
          href="/settings"
          style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none" }}
        >
          ← Settings
        </Link>
        <span style={{ marginLeft: 8, fontSize: 13, color: "#64748b" }}>·</span>
        <Link
          href="/promotions"
          style={{ marginLeft: 8, fontSize: 13, color: "#94a3b8", textDecoration: "none" }}
        >
          Promotions
        </Link>
      </div>

      {tableMissing && (
        <ErrorBlock
          message="testing_types table not found. Run scripts/testing_types_table.sql in Supabase SQL Editor, then refresh."
        />
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 380px) minmax(0, 1fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        <PageCard title={editingId ? "Edit Testing Type" : "New Testing Type"}>
          <p style={subTextStyle}>
            Types shown when creating a testing event (e.g. Belt Test). <span style={smallKoStyle}>승급 이벤트 생성 시 선택</span>
          </p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Name <span style={smallKoStyle}>이름</span></label>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Belt Test"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Sort order <span style={smallKoStyle}>정렬 순서</span></label>
              <input
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) => setForm((prev) => ({ ...prev, sort_order: e.target.value }))}
                style={inputStyle}
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#cbd5e1" }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
              />
              Active <span style={smallKoStyle}>사용 중</span>
            </label>

            {error ? <ErrorBlock message={error} /> : null}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" disabled={saving} style={primaryButtonStyle}>
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
              <button type="button" onClick={resetForm} style={secondaryButtonStyle}>
                {editingId ? "Revert" : "Reset"}
              </button>
            </div>
          </form>
        </PageCard>

        <PageCard title="Testing Types">
          <p style={subTextStyle}>
            These options appear in the &quot;Testing type&quot; dropdown when creating a promotion event.
          </p>

          {loading ? (
            <LoadingBlock message="Loading..." />
          ) : rows.length === 0 && !tableMissing ? (
            <EmptyState
              title="No testing types"
              description="Add a type (e.g. Belt Test) to use when creating testing events."
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Order</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td style={tdStyle}>{row.name}</td>
                      <td style={tdStyle}>{row.sort_order}</td>
                      <td style={tdStyle}>{row.active ? "Active" : "Inactive"}</td>
                      <td style={tdStyle}>
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
                          {row.active ? "Deactivate" : "Activate"}
                        </button>
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
