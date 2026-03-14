"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageCard from "../../../../components/ui/PageCard";
import LoadingBlock from "../../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../../components/ui/ErrorBlock";
import { supabase } from "../../../../lib/supabase";

type StudentRow = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  student_code?: string | null;
  status?: string | null;
};

type ContractRow = {
  id: string;
  student_id: string;
  program_id: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  final_tuition_fee: number | null;
  programs?: {
    name?: string | null;
  } | null;
};

type PaymentMethodRow = {
  id: string;
  name: string;
  active: boolean | null;
  requires_reference: boolean | null;
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function NewPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdFromUrl = searchParams.get("student_id") ?? "";
  const programIdFromUrl = searchParams.get("program_id") ?? "";

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentId, setStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentContractId, setStudentContractId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [note, setNote] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [periodPrices, setPeriodPrices] = useState<{ period_months: number; amount: number }[]>([]);

  async function loadPage() {
    try {
      setLoading(true);
      setError(null);

      const [
        { data: studentData, error: studentError },
        { data: contractData, error: contractError },
        { data: methodData, error: methodError },
      ] = await Promise.all([
        supabase
          .from("students")
          .select("id, full_name, name, student_code, status")
          .order("full_name", { ascending: true }),
        supabase
          .from("student_contracts")
          .select(`
            id,
            student_id,
            program_id,
            status,
            start_date,
            end_date,
            final_tuition_fee,
            programs (
              name
            )
          `)
          .in("status", ["active", "hold", "scheduled"])
          .order("start_date", { ascending: false }),
        supabase
          .from("payment_methods")
          .select("id, name, active, requires_reference")
          .eq("active", true)
          .order("display_order", { ascending: true }),
      ]);

      if (studentError) throw studentError;
      if (contractError) throw contractError;
      if (methodError) throw methodError;

      setStudents((studentData ?? []) as StudentRow[]);
      setContracts((contractData ?? []) as unknown as ContractRow[]);
      setPaymentMethods((methodData ?? []) as PaymentMethodRow[]);
    } catch (err) {
      console.error(err);
      setError("Failed to load payment form data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (studentIdFromUrl && students.length > 0 && !studentId) {
      const exists = students.some((s) => s.id === studentIdFromUrl);
      if (exists) setStudentId(studentIdFromUrl);
    }
  }, [studentIdFromUrl, students, studentId]);

  useEffect(() => {
    if (!programIdFromUrl || !studentId || contracts.length === 0) return;
    const match = contracts.find((c) => c.program_id === programIdFromUrl && c.student_id === studentId);
    if (match) setStudentContractId(match.id);
  }, [programIdFromUrl, contracts, studentId]);

  const filteredStudents = useMemo(() => {
    const keyword = studentSearch.trim().toLowerCase();

    if (!keyword) return students.slice(0, 50);

    return students
      .filter((student) => {
        const displayName = student.full_name ?? student.name ?? "";
        return (
          displayName.toLowerCase().includes(keyword) ||
          (student.student_code ?? "").toLowerCase().includes(keyword)
        );
      })
      .slice(0, 50);
  }, [students, studentSearch]);

  const selectedStudent = useMemo(() => {
    return students.find((student) => student.id === studentId) ?? null;
  }, [students, studentId]);

  const studentContracts = useMemo(() => {
    return contracts.filter((contract) => contract.student_id === studentId);
  }, [contracts, studentId]);

  const selectedContract = useMemo(() => {
    return studentContracts.find((contract) => contract.id === studentContractId) ?? null;
  }, [studentContracts, studentContractId]);

  useEffect(() => {
    const programId = selectedContract?.program_id ?? null;
    if (!programId) {
      setPeriodPrices([]);
      return;
    }
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("program_period_prices")
        .select("period_months, amount")
        .eq("program_id", programId)
        .eq("active", true)
        .order("period_months", { ascending: true });
      if (!mounted) return;
      const rows = (data ?? []).filter(
        (r: { period_months?: number; amount?: number | null }) =>
          typeof r.period_months === "number" && typeof r.amount === "number"
      ) as { period_months: number; amount: number }[];
      setPeriodPrices(rows);
    })();
    return () => {
      mounted = false;
    };
  }, [selectedContract?.program_id]);

  const selectedMethod = useMemo(() => {
    return paymentMethods.find((method) => method.id === paymentMethodId) ?? null;
  }, [paymentMethods, paymentMethodId]);

  async function handleSave(autoAllocate: boolean) {
    try {
      setSaving(true);
      setError(null);

      const parsedAmount = Number(amount);

      if (!studentId) {
        throw new Error("Student is required.");
      }

      if (!parsedAmount || parsedAmount <= 0) {
        throw new Error("Amount must be greater than 0.");
      }

      let createdPaymentId: string | null = null;

      if (autoAllocate) {
        const { data, error } = await supabase.rpc("create_payment_and_auto_allocate", {
          p_student_id: studentId,
          p_student_contract_id: studentContractId || null,
          p_amount: parsedAmount,
          p_payment_date: paymentDate || null,
          p_payment_method_id: paymentMethodId || null,
          p_payment_method: selectedMethod?.name ?? null,
          p_reference_number: referenceNumber || null,
          p_note: note || null,
          p_received_by: receivedBy || null,
        });

        if (error) throw error;
        createdPaymentId = data ?? null;
      } else {
        const { data, error } = await supabase.rpc("create_payment", {
          p_student_id: studentId,
          p_student_contract_id: studentContractId || null,
          p_amount: parsedAmount,
          p_payment_date: paymentDate || null,
          p_payment_method_id: paymentMethodId || null,
          p_payment_method: selectedMethod?.name ?? null,
          p_reference_number: referenceNumber || null,
          p_note: note || null,
          p_received_by: receivedBy || null,
        });

        if (error) throw error;
        createdPaymentId = data ?? null;
      }

      router.push("/finance/payments");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save payment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "#38bdf8",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 700,
              }}
            >
              Finance
            </p>
            <h1
              style={{
                margin: "8px 0 0 0",
                fontSize: 30,
                fontWeight: 900,
                color: "white",
              }}
            >
              New Payment
            </h1>
            <p
              style={{
                margin: "10px 0 0 0",
                color: "#94a3b8",
                fontSize: 14,
              }}
            >
              Create a payment record and optionally auto allocate it to open invoices.
            </p>
            <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#64748b" }}>
              For registered programs: confirm the amount (or use full amount) and save to register the payment. Alerts on Dashboard when action is needed.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/finance/payments" style={buttonSecondary}>
              Back to Payments
            </Link>
            <Link href="/finance/invoices" style={buttonPrimary}>
              Invoices
            </Link>
          </div>
        </div>

        {loading ? (
          <LoadingBlock />
        ) : (
          <>
            {error ? <ErrorBlock message={error} /> : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: 20,
              }}
            >
              <PageCard title="Student Selection">
                <div style={formGrid}>
                  <div>
                    <label style={labelStyle}>Search Student</label>
                    <input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search by student name or code"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Student</label>
                    <select
                      value={studentId}
                      onChange={(e) => {
                        setStudentId(e.target.value);
                        setStudentContractId("");
                      }}
                      style={inputStyle}
                    >
                      <option value="">Select student</option>
                      {filteredStudents.map((student) => {
                        const displayName = student.full_name ?? student.name ?? "Unnamed Student";
                        return (
                          <option key={student.id} value={student.id}>
                            {displayName}
                            {student.student_code ? ` (${student.student_code})` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Contract</label>
                    <select
                      value={studentContractId}
                      onChange={(e) => setStudentContractId(e.target.value)}
                      style={inputStyle}
                      disabled={!studentId}
                    >
                      <option value="">No contract selected</option>
                      {studentContracts.map((contract) => (
                        <option key={contract.id} value={contract.id}>
                          {(contract.programs?.name ?? "Program") +
                            ` | ${contract.status ?? "-"} | ${contract.start_date ?? "-"} ~ ${contract.end_date ?? "-"}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={infoBox}>
                    <div style={infoRow}>
                      <span>Selected Student</span>
                      <strong>{selectedStudent?.full_name ?? selectedStudent?.name ?? "-"}</strong>
                    </div>
                    <div style={infoRow}>
                      <span>Active Contracts</span>
                      <strong>{studentContracts.length}</strong>
                    </div>
                    <div style={infoRow}>
                      <span>Selected Contract Fee</span>
                      <strong>{formatMoney(selectedContract?.final_tuition_fee)}</strong>
                    </div>
                  </div>
                </div>
              </PageCard>

              <PageCard title="Payment Info">
                <div style={formGrid}>
                  <div>
                    <label style={labelStyle}>Amount to register (confirm to save)</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        style={inputStyle}
                      />
                      {selectedContract != null && (selectedContract.final_tuition_fee ?? 0) > 0 ? (
                        <>
                          <span style={{ fontSize: 13, color: "#94a3b8" }}>
                            Due: {formatMoney(selectedContract.final_tuition_fee)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setAmount(String(selectedContract.final_tuition_fee ?? 0))}
                            style={{
                              padding: "8px 12px",
                              borderRadius: 8,
                              border: "1px solid #334155",
                              background: "#1e293b",
                              color: "#e2e8f0",
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Use full amount
                          </button>
                        </>
                      ) : null}
                    {periodPrices.length > 0 ? (
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 4 }}>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>Period:</span>
                        {periodPrices.map((p) => (
                          <button
                            key={p.period_months}
                            type="button"
                            onClick={() => setAmount(String(p.amount))}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 8,
                              border: "1px solid #334155",
                              background: "#1e293b",
                              color: "#e2e8f0",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {p.period_months}mo {formatMoney(p.amount)}
                          </button>
                        ))}
                      </span>
                    ) : null}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                      Confirm amount and save to register. Partial OK; rest stays as balance.
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Payment Date</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Payment Method</label>
                    <select
                      value={paymentMethodId}
                      onChange={(e) => setPaymentMethodId(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select payment method</option>
                      {paymentMethods.map((method) => (
                        <option key={method.id} value={method.id}>
                          {method.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Reference Number</label>
                    <input
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Optional reference"
                      style={inputStyle}
                    />
                    {selectedMethod?.requires_reference ? (
                      <div style={helperText}>This payment method usually needs a reference.</div>
                    ) : null}
                  </div>

                  <div>
                    <label style={labelStyle}>Received By</label>
                    <input
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      placeholder="Admin name"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Note</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Optional note"
                      style={textareaStyle}
                      rows={4}
                    />
                  </div>
                </div>
              </PageCard>
            </div>

            <PageCard title="Save Options">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div style={actionCard}>
                  <div style={actionTitle}>Save Only</div>
                  <div style={actionText}>
                    Create payment record only. Allocation can be done later.
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    style={buttonActionSecondary}
                  >
                    {saving ? "Saving..." : "Save Payment"}
                  </button>
                </div>

                <div style={actionCard}>
                  <div style={actionTitle}>Save + Auto Allocate</div>
                  <div style={actionText}>
                    Create payment and automatically apply it to open invoices for this student.
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    style={buttonActionPrimary}
                  >
                    {saving ? "Saving..." : "Save and Auto Allocate"}
                  </button>
                </div>
              </div>
            </PageCard>
          </>
        )}
      </div>
    </div>
  );
}

export default function NewPaymentPage() {
  return (
    <Suspense fallback={<LoadingBlock message="Loading..." />}>
      <NewPaymentContent />
    </Suspense>
  );
}

const buttonPrimary: CSSProperties = {
  textDecoration: "none",
  padding: "10px 14px",
  borderRadius: 12,
  background: "#2563eb",
  color: "white",
  fontWeight: 700,
  fontSize: 14,
};

const buttonSecondary: CSSProperties = {
  textDecoration: "none",
  padding: "10px 14px",
  borderRadius: 12,
  background: "#1e293b",
  color: "white",
  fontWeight: 700,
  fontSize: 14,
};

const formGrid: CSSProperties = {
  display: "grid",
  gap: 14,
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontSize: 13,
  color: "#94a3b8",
  fontWeight: 700,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "white",
  outline: "none",
};

const textareaStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "white",
  outline: "none",
  resize: "vertical",
};

const helperText: CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  color: "#f59e0b",
};

const infoBox: CSSProperties = {
  marginTop: 4,
  padding: 14,
  borderRadius: 14,
  background: "#0f172a",
  border: "1px solid #1e293b",
  display: "grid",
  gap: 10,
};

const infoRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 14,
  color: "#e2e8f0",
};

const actionCard: CSSProperties = {
  padding: 18,
  borderRadius: 16,
  background: "#0f172a",
  border: "1px solid #1e293b",
  display: "grid",
  gap: 12,
};

const actionTitle: CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: "white",
};

const actionText: CSSProperties = {
  fontSize: 14,
  color: "#94a3b8",
  lineHeight: 1.5,
};

const buttonActionPrimary: CSSProperties = {
  border: "none",
  padding: "12px 14px",
  borderRadius: 12,
  background: "#2563eb",
  color: "white",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const buttonActionSecondary: CSSProperties = {
  border: "none",
  padding: "12px 14px",
  borderRadius: 12,
  background: "#334155",
  color: "white",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};