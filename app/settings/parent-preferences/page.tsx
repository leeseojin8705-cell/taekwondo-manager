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
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import EmptyState from "../../../components/ui/EmptyState";
import { supabase } from "../../../lib/supabase";

type TagRow = {
  id: string;
  name: string;
  color: string | null;
  active: boolean | null;
  sort_order: number | null;
  created_at?: string;
};

type FormState = {
  name: string;
  color: string;
  active: boolean;
};

const defaultForm: FormState = {
  name: "",
  color: "",
  active: true,
};

export default function SettingsParentPreferencesPage() {
  const [rows, setRows] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function loadTags() {
    setLoading(true);
    setError(null);

    const res = await supabase
      .from("student_tags")
      .select("id, name, color, active, sort_order, created_at")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (res.error) {
      const msg = res.error.message ?? "";
      if (msg.includes("sort_order") || msg.includes("does not exist")) {
        const fallback = await supabase
          .from("student_tags")
          .select("id, name, color, active, created_at")
          .order("name", { ascending: true });
        if (fallback.error) {
          setError(fallback.error.message);
          setRows([]);
        } else {
          setRows((fallback.data ?? []).map((r) => ({ ...r, sort_order: null })) as TagRow[]);
        }
      } else {
        setError(res.error.message);
        setRows([]);
      }
    } else {
      setRows((res.data ?? []) as TagRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadTags();
  }, []);

  function resetForm() {
    setForm(defaultForm);
    setEditingId(null);
  }

  function startEdit(row: TagRow) {
    setEditingId(row.id);
    setForm({
      name: row.name ?? "",
      color: row.color ?? "",
      active: row.active ?? true,
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      color: form.color.trim() || null,
      active: form.active,
    };

    if (editingId) {
      const { error } = await supabase
        .from("student_tags")
        .update(payload)
        .eq("id", editingId);
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("student_tags").insert(payload);
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }

    resetForm();
    await loadTags();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("Remove this parent preference option? It will be unlinked from students.");
    if (!ok) return;
    setError(null);

    const { error } = await supabase.from("student_tags").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    if (editingId === id) resetForm();
    await loadTags();
  }

  async function toggleActive(row: TagRow) {
    setError(null);
    const { error } = await supabase
      .from("student_tags")
      .update({ active: !row.active })
      .eq("id", row.id);
    if (error) {
      setError(error.message);
      return;
    }
    await loadTags();
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.color ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <AppShell
      title="Parent Preferences"
      description="Options that reflect what the parent or guardian wants (e.g. private lessons, competition focus). These appear when adding or editing a student."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        <PageCard title={editingId ? "Edit option" : "New option"}>
          <p style={subTextStyle}>
            Add options that staff can select when recording what the parent wants for the student.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Name</label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Private lessons, Competition focus"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Color (optional)</label>
              <input
                value={form.color}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, color: e.target.value }))
                }
                placeholder="e.g. #3b82f6"
                style={inputStyle}
              />
            </div>

            <label style={checkboxLabelStyle}>
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
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
              <button type="button" onClick={resetForm} style={secondaryButtonStyle}>
                Reset
              </button>
            </div>
          </form>
        </PageCard>

        <PageCard title="Parent preference options">
          <p style={subTextStyle}>
            These options are shown on New Student and Edit Student. Select which apply to each student based on parent requests.
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
              placeholder="Search by name or color"
              style={{ ...inputStyle, maxWidth: 320 }}
            />
          </div>

          {loading ? (
            <LoadingBlock message="Loading options..." />
          ) : filteredRows.length === 0 ? (
            <EmptyState
              title="No options yet"
              description="Create parent preference options above. They will appear when adding or editing students."
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Color</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td style={tdStyle}>{row.name}</td>
                      <td style={tdStyle}>
                        {row.color ? (
                          <span
                            style={{
                              display: "inline-block",
                              width: 14,
                              height: 14,
                              borderRadius: 4,
                              background: row.color,
                              verticalAlign: "middle",
                              marginRight: 6,
                            }}
                          />
                        ) : null}
                        {row.color || "-"}
                      </td>
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

const checkboxLabelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
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
  minWidth: 520,
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
