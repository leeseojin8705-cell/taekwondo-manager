"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../../../components/ui/AppShell";
import PageCard from "../../../../components/ui/PageCard";
import LoadingBlock from "../../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../../components/ui/ErrorBlock";
import { supabase } from "../../../../lib/supabase";

type StudentRow = {
  id: string;
  full_name?: string | null;
  name?: string | null;
};

const formGrid: CSSProperties = { display: "grid", gap: 16 };
const labelStyle: CSSProperties = { display: "block", marginBottom: 6, fontWeight: 700, fontSize: 14 };
const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#fff",
  fontSize: 15,
};

export default function NewInvoicePage() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("tuition");

  useEffect(() => {
    (async () => {
      try {
        const { data, error: e } = await supabase
          .from("students")
          .select("id, full_name, name")
          .order("full_name", { ascending: true });
        if (e) throw e;
        setStudents((data ?? []) as StudentRow[]);
      } catch (err) {
        setError("Failed to load students.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleCreate() {
    try {
      setSaving(true);
      setError(null);
      const num = Number(amount);
      if (!studentId) throw new Error("Select a student.");
      if (!num || num <= 0) throw new Error("Amount must be greater than 0.");

      const student = students.find((s) => s.id === studentId);
      const studentName = student?.full_name ?? student?.name ?? null;

      const payload = {
        student_id: studentId,
        student_name: studentName,
        student_contract_id: null,
        student_program_id: null,
        payment_category: category,
        description: description.trim() || "Invoice",
        base_amount: num,
        discount_amount: 0,
        final_amount: num,
        paid_amount: 0,
        balance_amount: num,
        payment_status: "unpaid",
        payment_method: null,
        due_date: dueDate || null,
        paid_at: null,
        note: null,
      };

      const { data, error: insertError } = await supabase
        .from("invoices")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) throw insertError;
      router.push(data?.id ? `/finance/invoices/${data.id}` : "/finance/invoices");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="New Invoice (청구하기)" description="Create an invoice to mark as billed. No payment is recorded yet.">
        <LoadingBlock message="Loading..." />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="New Invoice (청구하기)"
      description="Create an invoice = 청구. Record payment later when money is received."
    >
      <div style={{ maxWidth: 640, display: "grid", gap: 20 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/finance/invoices"
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #334155",
              background: "#1e293b",
              color: "#e2e8f0",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Back to Invoices
          </Link>
        </div>

        {error ? <ErrorBlock message={error} /> : null}

        <PageCard title="Invoice details (청구 내용)">
          <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#94a3b8" }}>
            This only creates a “billed” record. Record payment later in Finance → Payments.
          </p>
          <div style={formGrid}>
            <div>
              <label style={labelStyle}>Student</label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name ?? s.name ?? s.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={inputStyle}
              >
                <option value="tuition">Tuition</option>
                <option value="registration">Registration</option>
                <option value="uniform">Uniform</option>
                <option value="testing_fee">Testing fee</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Amount (청구 금액)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Monthly tuition March"
                style={inputStyle}
              />
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              style={{
                padding: "14px 20px",
                borderRadius: 12,
                border: "none",
                background: "#22c55e",
                color: "#052e16",
                fontWeight: 800,
                fontSize: 15,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Creating..." : "Create invoice (청구하기)"}
            </button>
          </div>
        </PageCard>
      </div>
    </AppShell>
  );
}
