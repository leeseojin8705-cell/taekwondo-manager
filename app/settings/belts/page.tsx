"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import EmptyState from "../../../components/ui/EmptyState";
import { supabase } from "../../../lib/supabase";

type BeltRow = {
  id: string;
  name: string;
  color: string | null;
  stripes: number;
  active: boolean;
  created_at: string;
};

type BeltForm = {
  name: string;
  color: string;
  stripes: string;
  active: boolean;
};

const defaultForm: BeltForm = {
  name: "",
  color: "",
  stripes: "0",
  active: true,
};

export default function SettingsBeltsPage() {
  const [rows, setRows] = useState<BeltRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<BeltForm>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [hasStripesColumn, setHasStripesColumn] = useState<boolean | null>(null);

  async function loadBelts() {
    setLoading(true);
    setError(null);

    const withStripes = await supabase
      .from("belts")
      .select("id, name, color, stripes, active, created_at")
      .order("name", { ascending: true });

    if (withStripes.error) {
      const code = String((withStripes.error as { code?: string }).code ?? "");
      const msg = withStripes.error.message ?? "";
      if (code === "42703" || msg.includes("stripes") || msg.includes("does not exist")) {
        setHasStripesColumn(false);
        const withoutStripes = await supabase
          .from("belts")
          .select("id, name, color, active, created_at")
          .order("name", { ascending: true });
        if (withoutStripes.error) {
          setError(withoutStripes.error.message);
          setRows([]);
          setLoading(false);
          return;
        }
        setRows(
          (withoutStripes.data || []).map((r) => ({ ...r, stripes: 0 })) as BeltRow[]
        );
        setLoading(false);
        return;
      }
      setError(withStripes.error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setHasStripesColumn(true);
    setRows((withStripes.data || []) as BeltRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadBelts();
  }, []);

  function resetForm() {
    if (editingId) {
      const row = rows.find((r) => r.id === editingId);
      if (row) {
        setForm({
          name: row.name ?? "",
          color: row.color ?? "",
          stripes: String(row.stripes ?? 0),
          active: row.active ?? true,
        });
        return;
      }
    }
    setForm(defaultForm);
    setEditingId(null);
  }

  function startEdit(row: BeltRow) {
    setEditingId(row.id);
    setForm({
      name: row.name ?? "",
      color: row.color ?? "",
      stripes: String(row.stripes ?? 0),
      active: row.active ?? true,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Belt name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      color: form.color.trim() || null,
      active: form.active,
    };
    if (hasStripesColumn === true) {
      payload.stripes = Math.max(0, parseInt(form.stripes, 10) || 0);
    }

    if (editingId) {
      const { error } = await supabase
        .from("belts")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("belts").insert(payload);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }

    resetForm();
    await loadBelts();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("Delete this belt?");
    if (!ok) return;

    setError(null);

    const { error } = await supabase.from("belts").delete().eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    if (editingId === id) {
      resetForm();
    }

    await loadBelts();
  }

  async function toggleActive(row: BeltRow) {
    setError(null);

    const { error } = await supabase
      .from("belts")
      .update({ active: !row.active })
      .eq("id", row.id);

    if (error) {
      setError(error.message);
      return;
    }

    await loadBelts();
  }

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return rows;

    return rows.filter((row) => {
      return (
        row.name.toLowerCase().includes(keyword) ||
        (row.color || "").toLowerCase().includes(keyword)
      );
    });
  }, [rows, search]);

  return (
    <AppShell
      title="Belts"
      description="Manage belt master data for students, promotions, and reports."
    >
      <div style={{ marginBottom: 12 }}>
        <Link
          href="/settings"
          style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none" }}
        >
          ← Settings
        </Link>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        <PageCard title={editingId ? "Edit Belt" : "New Belt"}>
          <p style={subTextStyle}>
            Belt master data. Set order before use. <span style={smallKoStyle}>띠 기준 데이터</span>
          </p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Belt Name <span style={smallKoStyle}>띠 이름</span></label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="ex) White Belt"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Color <span style={smallKoStyle}>색상</span></label>
              <input
                value={form.color}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, color: e.target.value }))
                }
                placeholder="ex) White"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Stripes <span style={smallKoStyle}>줄 수</span></label>
              <input
                type="number"
                min={0}
                value={form.stripes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, stripes: e.target.value }))
                }
                placeholder="0"
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
              Active <span style={smallKoStyle}>사용 중</span>
            </label>

            {error ? <ErrorBlock message={error} /> : null}

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button type="submit" disabled={saving} style={primaryButtonStyle}>
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                style={secondaryButtonStyle}
              >
                {editingId ? "Revert" : "Reset"}
              </button>
            </div>
          </form>
        </PageCard>

        <PageCard title="Belt List">
          <p style={subTextStyle}>
            Master values should be stable before students and promotions. <span style={smallKoStyle}>학생·승급 전에 정리</span>
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
              placeholder="Search belt name or color"
              style={{
                ...inputStyle,
                maxWidth: 320,
              }}
            />
          </div>

          {loading ? (
            <LoadingBlock message="Loading..." />
          ) : filteredRows.length === 0 ? (
            <EmptyState
              title="No belts"
              description="Create your first belt."
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Color</th>
                    <th style={thStyle}>Stripes</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Created</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td style={tdStyle}>{row.name}</td>
                      <td style={tdStyle}>{row.color || "-"}</td>
                      <td style={tdStyle}>{row.stripes ?? 0}</td>
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

const subTextStyle: CSSProperties = {
  margin: "0 0 14px 0",
  fontSize: 14,
  color: "#94a3b8",
  lineHeight: 1.5,
};

const smallKoStyle: CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  fontWeight: 400,
  marginLeft: 4,
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
  minWidth: 760,
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