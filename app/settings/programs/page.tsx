"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import EmptyState from "../../../components/ui/EmptyState";
import { supabase } from "../../../lib/supabase";
import { formatMoney } from "../../../lib/format";

type ProgramRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sort_order: number;
  active: boolean;
  created_at: string;
};

type ProgramForm = {
  name: string;
  description: string;
  price: string;
  sort_order: string;
  active: boolean;
};

const defaultForm: ProgramForm = {
  name: "",
  description: "",
  price: "0",
  sort_order: "0",
  active: true,
};

export default function SettingsProgramsPage() {
  const [rows, setRows] = useState<ProgramRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ProgramForm>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function loadPrograms() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("programs")
      .select("id, name, description, price, sort_order, active, created_at")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setError(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data || []) as ProgramRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadPrograms();
  }, []);

  function resetForm() {
    if (editingId) {
      const row = rows.find((r) => r.id === editingId);
      if (row) {
        setForm({
          name: row.name ?? "",
          description: row.description ?? "",
          price: String(row.price ?? 0),
          sort_order: String(row.sort_order ?? 0),
          active: row.active ?? true,
        });
        return;
      }
    }
    setForm(defaultForm);
    setEditingId(null);
  }

  function startEdit(row: ProgramRow) {
    setEditingId(row.id);
    setForm({
      name: row.name ?? "",
      description: row.description ?? "",
      price: String(row.price ?? 0),
      sort_order: String(row.sort_order ?? 0),
      active: row.active ?? true,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Program name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price || 0),
      sort_order: Number(form.sort_order || 0),
      active: form.active,
    };

    if (editingId) {
      const { error } = await supabase
        .from("programs")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("programs").insert(payload);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }

    resetForm();
    await loadPrograms();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("Delete this program? Cannot delete if used by student contracts.");
    if (!ok) return;

    setError(null);

    const { error } = await supabase.from("programs").delete().eq("id", id);

    if (error) {
      const msg = error.message ?? "";
      const isContractConstraint =
        /program_id|student_contracts|not-null|violates|foreign key|constraint/i.test(msg);
      if (isContractConstraint) {
        setError(
          "Cannot delete: used by student contracts. Change contracts to another program or use Disable instead."
        );
      } else {
        setError(error.message);
      }
      return;
    }

    if (editingId === id) {
      resetForm();
    }

    await loadPrograms();
  }

  async function toggleActive(row: ProgramRow) {
    setError(null);

    const { error } = await supabase
      .from("programs")
      .update({ active: !row.active })
      .eq("id", row.id);

    if (error) {
      setError(error.message);
      return;
    }

    await loadPrograms();
  }

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return rows;

    return rows.filter((row) => {
      return (
        row.name.toLowerCase().includes(keyword) ||
        (row.description || "").toLowerCase().includes(keyword)
      );
    });
  }, [rows, search]);

  return (
    <AppShell
      title="Programs"
      description="Manage program master data for contracts and pricing."
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
          gridTemplateColumns: "minmax(340px, 460px) minmax(0, 1fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        <PageCard title={editingId ? "Edit Program" : "New Program"}>
          <p style={subTextStyle}>
            Program master data. Base price is reference only. <span style={smallKoStyle}>기준 데이터, 참고용 가격</span>
          </p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Program Name <span style={smallKoStyle}>프로그램 이름</span></label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="ex) After School TKD"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Description <span style={smallKoStyle}>설명</span></label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="ex) Main after-school program"
                style={textareaStyle}
              />
            </div>

            <div style={twoColStyle}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle}>Base Price <span style={smallKoStyle}>기본 가격</span></label>
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, price: e.target.value }))
                  }
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle}>Display Order <span style={smallKoStyle}>표시 순서</span></label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sort_order: e.target.value }))
                  }
                  style={inputStyle}
                />
              </div>
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

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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

        <PageCard title="Program List">
          <p style={subTextStyle}>
            Stabilize programs before students, contracts, and payments. <span style={smallKoStyle}>학생·계약 전에 먼저 정리</span>
          </p>
          <p style={{ ...subTextStyle, marginTop: -8, fontSize: 13, color: "#64748b" }}>
            Prefer <strong style={{ color: "#94a3b8" }}>Disable</strong> over Delete when not in use. <span style={smallKoStyle}>삭제 대신 비활성화 권장</span>
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
              placeholder="Search name or description"
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
              title="No programs"
              description="Create your first program."
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Order</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Base Price</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Created</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td style={tdStyle}>{row.sort_order}</td>
                      <td style={tdStyle}>{row.name}</td>
                      <td style={tdStyle}>{row.description || "-"}</td>
                      <td style={tdStyle}>{formatMoney(row.price || 0)}</td>
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

const smallKoStyle: CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  fontWeight: 400,
  marginLeft: 4,
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

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 96,
  resize: "vertical",
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
  minWidth: 980,
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