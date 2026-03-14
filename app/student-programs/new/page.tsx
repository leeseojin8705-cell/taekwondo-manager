"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type ProgramRow = {
  id: string;
  name: string;
  price: number | null;
};

type StudentRow = {
  id: string;
  name: string;
};

type MembershipDurationRow = {
  id: string;
  name: string | null;
  duration_value?: number | null;
};

type WeeklyFrequencyRow = {
  id: string;
  label: string | null;
  frequency_value?: number | null;
};

const PAGE_STYLE: CSSProperties = {
  minHeight: "100vh",
  background: "#020617",
  color: "#f8fafc",
  padding: 24,
};

const WRAPPER_STYLE: CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
};

const CARD_STYLE: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

const LABEL_STYLE: CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontSize: 14,
  color: "#cbd5e1",
  fontWeight: 700,
};

const INPUT_STYLE: CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #334155",
  background: "#020617",
  color: "#f8fafc",
  outline: "none",
  fontSize: 16,
};

const BUTTON_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid #334155",
  background: "#111827",
  color: "#f8fafc",
  fontWeight: 800,
  textDecoration: "none",
  cursor: "pointer",
};

const PRIMARY_BUTTON_STYLE: CSSProperties = {
  ...BUTTON_STYLE,
  background: "#2563eb",
  border: "1px solid #3b82f6",
};

function addMonthsToDate(dateString: string, months: number) {
  const date = new Date(dateString);
  const originalDay = date.getDate();

  date.setMonth(date.getMonth() + months);

  if (date.getDate() < originalDay) {
    date.setDate(0);
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayLocalString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toWholeNumber(value: string) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  return Math.max(Math.round(num), 0);
}

function NewStudentProgramContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const studentIdFromQuery = searchParams.get("student_id") || searchParams.get("studentId") || "";
  const programIdFromQuery = searchParams.get("program_id") || "";
  const isRenew = searchParams.get("renew") === "1";

  const [student, setStudent] = useState<StudentRow | null>(null);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [membershipDurations, setMembershipDurations] = useState<MembershipDurationRow[]>([]);
  const [weeklyFrequencyOptions, setWeeklyFrequencyOptions] = useState<WeeklyFrequencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [programId, setProgramId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [weeklyFrequency, setWeeklyFrequency] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentDay, setPaymentDay] = useState("");
  const [paymentDate, setPaymentDate] = useState(getTodayLocalString());
  const [useClassDeduction, setUseClassDeduction] = useState(false);
  const [totalClasses, setTotalClasses] = useState("");
  const [remainingClasses, setRemainingClasses] = useState("");
  const [status, setStatus] = useState("active");

  const [tuitionAmount, setTuitionAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountNote, setDiscountNote] = useState("");
  const [uniformPrice, setUniformPrice] = useState("");
  const [equipmentPrice, setEquipmentPrice] = useState("");
  const [tshirtPrice, setTshirtPrice] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, [studentIdFromQuery]);

  useEffect(() => {
    if (!programIdFromQuery || programs.length === 0) return;
    const exists = programs.some((p) => p.id === programIdFromQuery);
    if (exists) setProgramId(programIdFromQuery);
  }, [programIdFromQuery, programs]);

  async function fetchInitialData() {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (studentIdFromQuery) params.set("student_id", studentIdFromQuery);
    const res = await fetch(`/api/student-programs/new-data?${params.toString()}`);
    const data = await res.json().catch(() => ({
      student: null,
      programs: [],
      membershipDurations: [],
      weeklyFrequencyOptions: [],
    }));

    setPrograms((data.programs ?? []) as ProgramRow[]);
    setStudent((data.student ?? null) as StudentRow | null);
    setMembershipDurations((data.membershipDurations ?? []) as MembershipDurationRow[]);
    setWeeklyFrequencyOptions((data.weeklyFrequencyOptions ?? []) as WeeklyFrequencyRow[]);
    setLoading(false);
  }

  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === programId) ?? null,
    [programs, programId]
  );

  useEffect(() => {
    if (!selectedProgram) return;
    const price = selectedProgram.price ?? 0;
    setTuitionAmount(String(Math.round(price)));
  }, [selectedProgram?.id]);

  const resolvedEndDate = useMemo(() => {
    if (endDate) return endDate;
    if (!startDate) return "";
    if (!durationMonths) return "";
    const months = Number(durationMonths);
    if (!months || months < 1) return "";
    return addMonthsToDate(startDate, months);
  }, [startDate, endDate, durationMonths]);

  const tuitionAmountNumber = useMemo(
    () => toWholeNumber(tuitionAmount),
    [tuitionAmount]
  );
  const discountAmountNumber = useMemo(
    () => toWholeNumber(discountAmount),
    [discountAmount]
  );
  const uniformPriceNumber = useMemo(
    () => toWholeNumber(uniformPrice),
    [uniformPrice]
  );
  const equipmentPriceNumber = useMemo(
    () => toWholeNumber(equipmentPrice),
    [equipmentPrice]
  );
  const tshirtPriceNumber = useMemo(
    () => toWholeNumber(tshirtPrice),
    [tshirtPrice]
  );

  const tuitionAfterDiscount = Math.max(
    tuitionAmountNumber - discountAmountNumber,
    0
  );

  const merchandiseTotal =
    uniformPriceNumber + equipmentPriceNumber + tshirtPriceNumber;

  const finalTotal = tuitionAfterDiscount + merchandiseTotal;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!studentIdFromQuery) {
      setError(
        "Student ID is missing. Please open this page again from the student detail page."
      );
      return;
    }

    if (!programId) {
      setError("Please select a program.");
      return;
    }

    if (!startDate) {
      setError("Please enter a start date.");
      return;
    }

    if (!resolvedEndDate) {
      setError("Please enter an end date or duration in months.");
      return;
    }

    if (!paymentMethod) {
      setError("Please select a payment method.");
      return;
    }

    if (!paymentDate) {
      setError("Please enter a payment date.");
      return;
    }

    if (discountAmountNumber > tuitionAmountNumber) {
      setError("Discount amount cannot be greater than tuition amount.");
      return;
    }

    if (useClassDeduction) {
      if (!totalClasses || Number(totalClasses) < 1) {
        setError("Please enter total classes.");
        return;
      }
      if (!remainingClasses || Number(remainingClasses) < 0) {
        setError("Please enter remaining classes.");
        return;
      }
      if (Number(remainingClasses) > Number(totalClasses)) {
        setError("Remaining classes cannot be greater than total classes.");
        return;
      }
    }

    setSaving(true);
    setError("");

    try {
      const monthsNum = durationMonths ? Number(durationMonths) : null;
      const freqNum = weeklyFrequency ? Number(weeklyFrequency) : null;
      const monthsStr = monthsNum != null ? String(monthsNum) : "";
      const membershipDurationId =
        monthsNum != null && monthsNum > 0
          ? (membershipDurations.find((d) => {
              if (d.duration_value != null && d.duration_value === monthsNum) return true;
              if (d.name != null && String(d.name).replace(/\D/g, "").includes(monthsStr)) return true;
              return false;
            })?.id ?? null)
          : null;
      const weeklyFrequencyOptionId =
        freqNum != null && freqNum > 0
          ? (weeklyFrequencyOptions.find((f) => {
              return f.frequency_value != null && Number(f.frequency_value) === freqNum;
            })?.id ?? null)
          : null;

      const contractPayload = {
        student_id: studentIdFromQuery,
        program_id: programId,
        start_date: startDate,
        end_date: resolvedEndDate,
        weekly_frequency_option_id: weeklyFrequencyOptionId || null,
        membership_duration_id: membershipDurationId || null,
        contract_type: "membership",
        status,
        total_amount: finalTotal,
      };

      const { error: contractInsertError } = await supabase
        .from("student_contracts")
        .insert(contractPayload);

      if (contractInsertError) throw contractInsertError;

      if (tuitionAmountNumber > 0) {
        const { error: tuitionError } = await supabase.rpc(
          "create_payment_record",
          {
            p_student_id: studentIdFromQuery,
            p_payment_date: paymentDate,
            p_payment_method: paymentMethod,
            p_note: `${selectedProgram?.name || "Program"} tuition`,
            p_status: "paid",
            p_original_amount: tuitionAmountNumber,
            p_discount_amount: discountAmountNumber,
            p_discount_note: discountNote || null,
            p_billing_start_date: startDate,
            p_billing_end_date: resolvedEndDate,
            p_is_renewal: false,
            p_income_category: "tuition",
          }
        );

        if (tuitionError) throw tuitionError;
      }

      if (uniformPriceNumber > 0) {
        const { error: uniformError } = await supabase.rpc(
          "create_payment_record",
          {
            p_student_id: studentIdFromQuery,
            p_payment_date: paymentDate,
            p_payment_method: paymentMethod,
            p_note: "Uniform purchase",
            p_status: "paid",
            p_original_amount: uniformPriceNumber,
            p_discount_amount: 0,
            p_discount_note: null,
            p_billing_start_date: startDate,
            p_billing_end_date: resolvedEndDate,
            p_is_renewal: false,
            p_income_category: "uniform_sale",
          }
        );

        if (uniformError) throw uniformError;
      }

      if (equipmentPriceNumber > 0) {
        const { error: equipmentError } = await supabase.rpc(
          "create_payment_record",
          {
            p_student_id: studentIdFromQuery,
            p_payment_date: paymentDate,
            p_payment_method: paymentMethod,
            p_note: "Equipment purchase",
            p_status: "paid",
            p_original_amount: equipmentPriceNumber,
            p_discount_amount: 0,
            p_discount_note: null,
            p_billing_start_date: startDate,
            p_billing_end_date: resolvedEndDate,
            p_is_renewal: false,
            p_income_category: "equipment_sale",
          }
        );

        if (equipmentError) throw equipmentError;
      }

      if (tshirtPriceNumber > 0) {
        const { error: tshirtError } = await supabase.rpc(
          "create_payment_record",
          {
            p_student_id: studentIdFromQuery,
            p_payment_date: paymentDate,
            p_payment_method: paymentMethod,
            p_note: "T-shirt purchase",
            p_status: "paid",
            p_original_amount: tshirtPriceNumber,
            p_discount_amount: 0,
            p_discount_note: null,
            p_billing_start_date: startDate,
            p_billing_end_date: resolvedEndDate,
            p_is_renewal: false,
            p_income_category: "t_shirt_sale",
          }
        );

        if (tshirtError) throw tshirtError;
      }

      router.push(`/students/${studentIdFromQuery}`);
    } catch (submitError: unknown) {
      const err = submitError as { message?: string };
      let message =
        err?.message && typeof err.message === "string"
          ? err.message
          : "Failed to save the program.";
      if (message.includes("create_payment_record") && message.includes("schema cache")) {
        message =
          "Payment record could not be created: the database function create_payment_record is missing. Run the script scripts/create_payment_record_rpc.sql in the Supabase SQL Editor, then try again. The program (contract) was saved; only the payment log step failed.";
      }
      if (
        message.includes("student_contracts_active_program_uidx") ||
        (message.includes("duplicate key") && message.includes("student_contracts"))
      ) {
        message =
          "This student already has an active registration for this program. Choose a different program, or end the current contract for this program first (e.g. from the student detail page), then register again.";
      }
      setError(message);
      return;
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={PAGE_STYLE}>
      <div style={WRAPPER_STYLE}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                margin: 0,
                color: "#67e8f9",
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Taekwondo Manager
            </div>
            <h1 style={{ margin: "8px 0 0 0", fontSize: 38, fontWeight: 900 }}>
              {isRenew ? "Renew Program (리뉴)" : "Register Program"}
            </h1>
            <div style={{ margin: "10px 0 0 0", color: "#94a3b8" }}>
              {isRenew
                ? "Extend or renew this program and register payment for this student."
                : "Register a program and payment details for this student."}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href={studentIdFromQuery ? `/students/${studentIdFromQuery}` : "/students"}
              style={BUTTON_STYLE}
            >
              Back
            </Link>
            <Link href="/students" style={BUTTON_STYLE}>
              Students
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={CARD_STYLE}>Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} style={CARD_STYLE}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Student</h2>
              <div style={{ margin: "10px 0 0 0", color: "#94a3b8" }}>
                {student
                  ? student.name || "(No name)"
                  : studentIdFromQuery
                    ? "Student information could not be found. The student ID may be invalid."
                    : "Open this page from a student's detail page (Back → choose a student)."}
              </div>
            </div>

            {error ? (
              <div
                style={{
                  marginBottom: 20,
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #7f1d1d",
                  background: "#450a0a",
                  color: "#fecaca",
                  fontWeight: 700,
                }}
              >
                {error}
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={LABEL_STYLE}>Program</label>
                <select
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                  style={INPUT_STYLE}
                >
                  <option value="">Select Program</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={LABEL_STYLE}>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={INPUT_STYLE}
                />
              </div>

              <div>
                <label style={LABEL_STYLE}>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={INPUT_STYLE}
                />
              </div>

              <div>
                <label style={LABEL_STYLE}>Duration Months (Optional)</label>
                <select
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  style={INPUT_STYLE}
                >
                  <option value="">Select Duration</option>
                  <option value="1">1 month</option>
                  <option value="3">3 months</option>
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                </select>
              </div>

              <div>
                <label style={LABEL_STYLE}>Weekly Frequency</label>
                <select
                  value={weeklyFrequency}
                  onChange={(e) => setWeeklyFrequency(e.target.value)}
                  style={INPUT_STYLE}
                >
                  <option value="1">Once a week</option>
                  <option value="2">Twice a week</option>
                  <option value="3">3 times a week</option>
                  <option value="4">4 times a week</option>
                  <option value="5">5 times a week</option>
                  <option value="6">6 times a week</option>
                  <option value="7">Every day</option>
                </select>
              </div>

              <div>
                <label style={LABEL_STYLE}>Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={INPUT_STYLE}
                >
                  <option value="">Select Payment Method</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="zelle">Zelle</option>
                  <option value="venmo">Venmo</option>
                  <option value="check">Check</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label style={LABEL_STYLE}>Payment Day (1-31)</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={paymentDay}
                  onChange={(e) => setPaymentDay(e.target.value)}
                  placeholder="Optional"
                  style={INPUT_STYLE}
                />
              </div>

              <div>
                <label style={LABEL_STYLE}>Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  style={INPUT_STYLE}
                />
              </div>

              <div>
                <label style={LABEL_STYLE}>Program Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={INPUT_STYLE}
                >
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                  <option value="expired">expired</option>
                </select>
              </div>
            </div>

            <div
              style={{
                marginTop: 22,
                border: "1px solid #1e293b",
                borderRadius: 16,
                padding: 18,
                background: "#111827",
              }}
            >
              <div style={{ marginBottom: 16, fontSize: 20, fontWeight: 900 }}>
                Tuition / Discount
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 16,
                }}
              >
                <div>
                  <label style={LABEL_STYLE}>Tuition Amount</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={tuitionAmount}
                    onChange={(e) => setTuitionAmount(e.target.value)}
                    placeholder="Enter tuition amount"
                    style={INPUT_STYLE}
                  />
                </div>

                <div>
                  <label style={LABEL_STYLE}>Discount Amount</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder="Enter discount amount"
                    style={INPUT_STYLE}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={LABEL_STYLE}>Discount Note</label>
                  <input
                    type="text"
                    value={discountNote}
                    onChange={(e) => setDiscountNote(e.target.value)}
                    placeholder="Optional discount reason"
                    style={INPUT_STYLE}
                  />
                </div>

                <div>
                  <label style={LABEL_STYLE}>Tuition After Discount</label>
                  <input
                    type="text"
                    value={String(tuitionAfterDiscount)}
                    readOnly
                    style={{
                      ...INPUT_STYLE,
                      background: "#0b1220",
                      color: "#67e8f9",
                      fontWeight: 800,
                    }}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 22,
                border: "1px solid #1e293b",
                borderRadius: 16,
                padding: 18,
                background: "#111827",
              }}
            >
              <div style={{ marginBottom: 16, fontSize: 20, fontWeight: 900 }}>
                Merchandise / Equipment Purchase
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 16,
                }}
              >
                <div>
                  <label style={LABEL_STYLE}>Uniform Price</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={uniformPrice}
                    onChange={(e) => setUniformPrice(e.target.value)}
                    placeholder="Enter uniform price"
                    style={INPUT_STYLE}
                  />
                </div>

                <div>
                  <label style={LABEL_STYLE}>Equipment Price</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={equipmentPrice}
                    onChange={(e) => setEquipmentPrice(e.target.value)}
                    placeholder="Enter equipment price"
                    style={INPUT_STYLE}
                  />
                </div>

                <div>
                  <label style={LABEL_STYLE}>T-Shirt Price</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={tshirtPrice}
                    onChange={(e) => setTshirtPrice(e.target.value)}
                    placeholder="Enter T-shirt price"
                    style={INPUT_STYLE}
                  />
                </div>

                <div>
                  <label style={LABEL_STYLE}>Merchandise Total</label>
                  <input
                    type="text"
                    value={String(merchandiseTotal)}
                    readOnly
                    style={{
                      ...INPUT_STYLE,
                      background: "#0b1220",
                      color: "#67e8f9",
                      fontWeight: 800,
                    }}
                  />
                </div>

                <div>
                  <label style={LABEL_STYLE}>Final Total</label>
                  <input
                    type="text"
                    value={String(finalTotal)}
                    readOnly
                    style={{
                      ...INPUT_STYLE,
                      background: "#082f49",
                      color: "#bae6fd",
                      fontWeight: 900,
                    }}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 22,
                border: "1px solid #1e293b",
                borderRadius: 16,
                padding: 18,
                background: "#111827",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontWeight: 800,
                  color: "#f8fafc",
                  marginBottom: 16,
                }}
              >
                <input
                  type="checkbox"
                  checked={useClassDeduction}
                  onChange={(e) => setUseClassDeduction(e.target.checked)}
                />
                Use Class Deduction
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 16,
                }}
              >
                <div>
                  <label style={LABEL_STYLE}>Total Classes</label>
                  <input
                    type="number"
                    min={0}
                    value={totalClasses}
                    onChange={(e) => setTotalClasses(e.target.value)}
                    disabled={!useClassDeduction}
                    placeholder="Total Classes"
                    style={{
                      ...INPUT_STYLE,
                      opacity: useClassDeduction ? 1 : 0.5,
                    }}
                  />
                </div>

                <div>
                  <label style={LABEL_STYLE}>Remaining Classes</label>
                  <input
                    type="number"
                    min={0}
                    value={remainingClasses}
                    onChange={(e) => setRemainingClasses(e.target.value)}
                    disabled={!useClassDeduction}
                    placeholder="Remaining Classes"
                    style={{
                      ...INPUT_STYLE,
                      opacity: useClassDeduction ? 1 : 0.5,
                    }}
                  />
                </div>
              </div>
            </div>

            {resolvedEndDate ? (
              <div
                style={{
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 12,
                  background: "#082f49",
                  border: "1px solid #0ea5e9",
                  color: "#bae6fd",
                  fontWeight: 700,
                }}
              >
                Saved end date: {resolvedEndDate}
              </div>
            ) : null}

            <div
              style={{
                marginTop: 24,
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Link
                href={studentIdFromQuery ? `/students/${studentIdFromQuery}` : "/students"}
                style={BUTTON_STYLE}
              >
                Cancel
              </Link>
              <button type="submit" disabled={saving} style={PRIMARY_BUTTON_STYLE}>
                {saving ? "Saving..." : "Save Program"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function NewStudentProgramPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "#94a3b8" }}>Loading...</div>}>
      <NewStudentProgramContent />
    </Suspense>
  );
}