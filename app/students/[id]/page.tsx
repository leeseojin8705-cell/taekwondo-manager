"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import EmptyState from "../../../components/ui/EmptyState";
import StudentAttendanceCalendar from "../../../components/StudentAttendanceCalendar";
import { supabase } from "../../../lib/supabase";

type StudentDetailRow = {
  id: string;
  name: string;
  english_name: string | null;
  photo_url: string | null;
  gender: string | null;
  birth_date: string | null;
  join_date: string | null;
  status: string | null;
  memo: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  class_id: string | null;
  current_belt_id: string | null;
  inactive_reason_id: string | null;
  classes: {
    id: string;
    name: string | null;
  } | null;
  belts: {
    id: string;
    name: string | null;
  } | null;
  inactive_reasons: {
    id: string;
    name: string | null;
  } | null;
};

type StudentMedicalRow = {
  id: string;
  allergies: string | null;
  medications: string | null;
  diagnosis: string | null;
  notes: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type StudentContractRow = {
  id: string;
  student_id: string;
  program_id: string | null;
  membership_duration_id: string | null;
  weekly_frequency_option_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  auto_renew: boolean | null;
  contract_price: number | null;
  discount_amount: number | null;
  final_price: number | null;
  registration_fee: number | null;
  uniform_fee: number | null;
  equipment_fee: number | null;
  other_fee: number | null;
  total_amount: number | null;
  note: string | null;
  created_at: string | null;
  programs: {
    name: string | null;
  } | null;
  membership_durations: {
    name: string | null;
  } | null;
  weekly_frequency_options: {
    name: string | null;
  } | null;
};

type StudentNoteRow = {
  id: string;
  note_type: string | null;
  title: string | null;
  note: string | null;
  created_at: string | null;
};

type StudentDocumentRow = {
  id: string;
  title: string | null;
  file_url: string | null;
  file_name: string | null;
  note: string | null;
  created_at: string | null;
  document_types: {
    name: string | null;
  } | null;
};

type StudentHoldRow = {
  id: string;
  hold_start_date: string | null;
  hold_end_date: string | null;
  status: string | null;
  reason_note: string | null;
  created_at: string | null;
  hold_reasons: {
    name: string | null;
  } | null;
};

type StudentAttendanceRow = {
  id: string;
  student_id: string;
  checkin_date: string | null;
  checkin_time: string | null;
  checkin_source: string | null;
  checkin_type: string | null;
};

type StudentPaymentRow = {
  id: string;
  payment_date: string | null;
  payment_amount: number | null;
  payment_status: string | null;
  payment_method: string | null;
};

type StudentInvoiceRow = {
  id: string;
  invoice_number: string | null;
  due_date: string | null;
  total_amount: number | null;
  balance_amount: number | null;
  invoice_status: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatMoney(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function getStatusColor(status: string | null | undefined) {
  const normalized = (status || "").toLowerCase();

  if (normalized === "active") {
    return {
      border: "1px solid #166534",
      background: "rgba(34,197,94,0.15)",
      color: "#bbf7d0",
    };
  }

  if (normalized === "hold") {
    return {
      border: "1px solid #92400e",
      background: "rgba(245,158,11,0.15)",
      color: "#fde68a",
    };
  }

  if (normalized === "inactive" || normalized === "expired" || normalized === "cancelled") {
    return {
      border: "1px solid #7f1d1d",
      background: "rgba(239,68,68,0.15)",
      color: "#fecaca",
    };
  }

  return {
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#cbd5e1",
  };
}

function StatusBadge({ value }: { value: string | null | undefined }) {
  const style = getStatusColor(value);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "6px 10px",
        fontSize: 12,
        fontWeight: 800,
        textTransform: "capitalize",
        ...style,
      }}
    >
      {value || "unknown"}
    </span>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #1e293b",
        background: "#0f172a",
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#94a3b8",
          marginBottom: 6,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          color: "#f8fafc",
          fontWeight: 600,
          lineHeight: 1.5,
          wordBreak: "break-word",
        }}
      >
        {value || "-"}
      </div>
    </div>
  );
}

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [student, setStudent] = useState<StudentDetailRow | null>(null);
  const [medical, setMedical] = useState<StudentMedicalRow | null>(null);
  const [contracts, setContracts] = useState<StudentContractRow[]>([]);
  const [notes, setNotes] = useState<StudentNoteRow[]>([]);
  const [documents, setDocuments] = useState<StudentDocumentRow[]>([]);
  const [holdLogs, setHoldLogs] = useState<StudentHoldRow[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendanceRow[]>([]);
  const [payments, setPayments] = useState<StudentPaymentRow[]>([]);
  const [invoices, setInvoices] = useState<StudentInvoiceRow[]>([]);
  const [holdStart, setHoldStart] = useState("");
  const [holdEnd, setHoldEnd] = useState("");
  const [holdNote, setHoldNote] = useState("");
  const [savingHold, setSavingHold] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [releasingHold, setReleasingHold] = useState(false);
  const [endingContractId, setEndingContractId] = useState<string | null>(null);
  const [deletingContractId, setDeletingContractId] = useState<string | null>(null);

  async function endContract(contractId: string) {
    setEndingContractId(contractId);
    try {
      const { error: updateError } = await supabase
        .from("student_contracts")
        .update({ status: "inactive" })
        .eq("id", contractId);
      if (updateError) throw updateError;
      setContracts((prev) =>
        prev.map((c) => (c.id === contractId ? { ...c, status: "inactive" } : c))
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to end contract.");
    } finally {
      setEndingContractId(null);
    }
  }

  async function deleteContract(contractId: string) {
    if (!confirm("Remove this contract from the list? This cannot be undone.")) return;
    setDeletingContractId(contractId);
    try {
      const { error: deleteError } = await supabase
        .from("student_contracts")
        .delete()
        .eq("id", contractId);
      if (deleteError) throw deleteError;
      setError(null);
      setContracts((prev) => prev.filter((c) => c.id !== contractId));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to delete contract. Run scripts/fix_student_contracts_delete.sql in Supabase if permission denied.");
    } finally {
      setDeletingContractId(null);
    }
  }

  useEffect(() => {
    if (!studentId) return;
    fetchStudentDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);
  async function fetchStudentDetail() {
    try {
      setLoading(true);
      setError(null);

      const [
        studentRes,
        medicalRes,
        contractsRes,
        notesRes,
        documentsRes,
        holdRes,
        attendanceRes,
        paymentsRes,
        invoicesRes,
        programsRes,
        beltsRes,
        classesRes,
        inactiveReasonsRes,
        durationsRes,
        freqOptionsRes,
      ] = await Promise.all([
        supabase
          .from("students")
          .select(
            "id,name,full_name,photo_url,gender,date_of_birth,join_date,status,memo,parent_name,phone,email,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship,current_belt_id"
          )
          .eq("id", studentId)
          .maybeSingle(),

        supabase
          .from("student_medical_body_notes")
          .select("id,allergies,medications,diagnosis,notes,created_at,updated_at")
          .eq("student_id", studentId)
          .maybeSingle(),

        supabase
          .from("student_contracts")
          .select(
            "id,student_id,program_id,membership_duration_id,weekly_frequency_option_id,start_date,end_date,status,auto_renew,contract_price,discount_amount,final_price,registration_fee,uniform_fee,equipment_fee,other_fee,total_amount,note,created_at,programs(name),membership_durations(name),weekly_frequency_options(label,name)"
          )
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(100),

        supabase
          .from("student_notes")
          .select("id,note_type,title,note,created_at")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),

        supabase
          .from("student_documents")
          .select("id,title,file_url,file_name,note,created_at")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),

        supabase
          .from("student_hold_logs")
          .select("id,hold_start_date,hold_end_date,status,reason_note,created_at")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),

        supabase
          .from("attendance_logs")
          .select("id,student_id,checkin_date,checkin_time,checkin_source,checkin_type")
          .eq("student_id", studentId)
          .order("checkin_time", { ascending: false })
          .limit(20),

        supabase
          .from("payments")
          .select("id,payment_date,payment_amount,payment_status,payment_method")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(10),

        supabase
          .from("invoices")
          .select("id,invoice_number,due_date,total_amount,balance_amount,invoice_status")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(10),

        supabase.from("programs").select("id,name"),
        supabase.from("belts").select("id,name"),
        supabase.from("classes").select("id,name"),
        supabase.from("inactive_reasons").select("id,name"),
        supabase.from("membership_durations").select("id,name"),
        supabase.from("weekly_frequency_options").select("id,name,label"),
      ]);

      if (studentRes.error || !studentRes.data) {
        throw new Error("Student not found");
      }

      const programs = (programsRes.data ?? []) as Array<{ id: string; name: string | null }>;
      const belts = (beltsRes.data ?? []) as Array<{ id: string; name: string | null }>;
      const classes = (classesRes.data ?? []) as Array<{ id: string; name: string | null }>;
      const inactiveReasons = (inactiveReasonsRes.data ?? []) as Array<{ id: string; name: string | null }>;
      const durations = (durationsRes?.data ?? []) as Array<{ id: string; name: string | null }>;
      const freqOptions = (freqOptionsRes?.data ?? []) as Array<{ id: string; name: string | null; label: string | null }>;

      const student = studentRes.data as Record<string, unknown>;
      const studentRow: StudentDetailRow = {
        ...(student as StudentDetailRow),
        birth_date: (student.date_of_birth ?? student.birth_date) as string | null,
        parent_phone: (student.phone ?? student.parent_phone) as string | null,
        parent_email: (student.email ?? student.parent_email) as string | null,
        english_name: (student.english_name ?? null) as string | null,
        class_id: (student.class_id ?? null) as string | null,
        inactive_reason_id: (student.inactive_reason_id ?? null) as string | null,
        classes: (student as any).class_id
          ? (classes.find((c) => c.id === (student as any).class_id) ?? null)
          : null,
        belts: (student as any).current_belt_id
          ? (belts.find((b) => b.id === (student as any).current_belt_id) ?? null)
          : null,
        inactive_reasons: (student as any).inactive_reason_id
          ? (inactiveReasons.find((r) => r.id === (student as any).inactive_reason_id) ?? null)
          : null,
      };

      const contractsMapped = (contractsRes.data ?? []).map((c: Record<string, unknown>) => {
        const row = c as any;
        const prog = row.programs ?? (row.program_id ? (programs.find((p) => p.id === row.program_id) ?? null) : null);
        const dur = row.membership_durations ?? (row.membership_duration_id && durations.find((d) => d.id === row.membership_duration_id) ? { name: durations.find((d) => d.id === row.membership_duration_id)?.name ?? null } : null);
        const freq = row.weekly_frequency_options != null
          ? { name: (row.weekly_frequency_options?.label ?? row.weekly_frequency_options?.name) ?? null }
          : (row.weekly_frequency_option_id && freqOptions.find((f) => f.id === row.weekly_frequency_option_id) ? { name: (freqOptions.find((f) => f.id === row.weekly_frequency_option_id)?.label ?? freqOptions.find((f) => f.id === row.weekly_frequency_option_id)?.name) ?? null } : null);
        return {
          ...(c as StudentContractRow),
          programs: prog ? { name: prog.name ?? null } : null,
          membership_durations: dur,
          weekly_frequency_options: freq,
        };
      });

      const documentsMapped = (documentsRes.error ? [] : (documentsRes.data ?? [])).map(
        (d: Record<string, unknown>) => ({
          ...(d as StudentDocumentRow),
          document_types: null,
        })
      );

      const holdLogsMapped = (holdRes.error ? [] : (holdRes.data ?? [])).map(
        (h: Record<string, unknown>) => ({
          ...(h as StudentHoldRow),
          hold_reasons: null,
        })
      );

      setStudent(studentRow);
      setMedical((medicalRes.error ? null : (medicalRes.data as StudentMedicalRow | null)) ?? null);
      setContracts(contractsMapped);
      setNotes((notesRes.error ? [] : (notesRes.data ?? [])) as StudentNoteRow[]);
      setDocuments(documentsMapped);
      setHoldLogs(holdLogsMapped);
      setAttendance(
        (attendanceRes.error ? [] : (attendanceRes.data ?? [])) as StudentAttendanceRow[]
      );
      setPayments(
        (paymentsRes.error ? [] : (paymentsRes.data ?? [])) as StudentPaymentRow[]
      );
      setInvoices(
        (invoicesRes.error ? [] : (invoicesRes.data ?? [])) as StudentInvoiceRow[]
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load student detail.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateHold() {
    if (!student) return;
    try {
      setSavingHold(true);
      setHoldError(null);
      if (!holdStart || !holdEnd) {
        throw new Error("Hold start and end dates are required.");
      }

      const payload: Record<string, unknown> = {
        student_id: student.id,
        hold_start_date: holdStart,
        hold_end_date: holdEnd,
        status: "hold",
        reason_note: holdNote.trim() || null,
      };

      const { error } = await supabase.from("student_hold_logs").insert(payload);
      if (error) throw error;

      await supabase
        .from("students")
        .update({ status: "hold" })
        .eq("id", student.id);

      setStudent({ ...student, status: "hold" });
      setHoldLogs((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          hold_start_date: holdStart,
          hold_end_date: holdEnd,
          status: "hold",
          reason_note: holdNote.trim() || null,
          created_at: new Date().toISOString(),
          hold_reasons: null,
        },
      ]);
      setHoldStart("");
      setHoldEnd("");
      setHoldNote("");
    } catch (err: unknown) {
      setHoldError(
        err instanceof Error ? err.message : "Failed to create hold. Check Supabase student_hold_logs table."
      );
    } finally {
      setSavingHold(false);
    }
  }

  async function handleReleaseHold() {
    if (!student) return;
    try {
      setReleasingHold(true);
      setHoldError(null);

      const today = new Date().toISOString().slice(0, 10);

      const { data: latestHold, error: latestHoldError } = await supabase
        .from("student_hold_logs")
        .select("id, hold_end_date")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestHoldError) {
        throw latestHoldError;
      }

      if (latestHold?.id && latestHold.hold_end_date === null) {
        const { error: holdUpdateError } = await supabase
          .from("student_hold_logs")
          .update({
            hold_end_date: today,
            release_method: "admin_detail",
            extension_status: "pending",
          })
          .eq("id", latestHold.id);

        if (holdUpdateError) {
          throw holdUpdateError;
        }

        setHoldLogs((prev) =>
          prev.map((h) =>
            h.id === latestHold.id
              ? { ...h, hold_end_date: today }
              : h
          )
        );
      }

      const { error: studentUpdateError } = await supabase
        .from("students")
        .update({ status: "active" })
        .eq("id", student.id);

      if (studentUpdateError) {
        throw studentUpdateError;
      }

      setStudent({ ...student, status: "active" });
    } catch (err: unknown) {
      setHoldError(
        err instanceof Error ? err.message : "Failed to release hold. Check Supabase student_hold_logs table."
      );
    } finally {
      setReleasingHold(false);
    }
  }

  const activeContract = useMemo(() => {
    return (
      contracts.find((row) => (row.status || "").toLowerCase() === "active") ??
      null
    );
  }, [contracts]);

  if (loading) {
    return (
      <AppShell title="Student Detail" description="Student operations hub">
        <LoadingBlock message="Loading student detail..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Student Detail" description="Student operations hub">
        <ErrorBlock title="Failed to load student" message={error} />
      </AppShell>
    );
  }

  if (!student) {
    return (
      <AppShell title="Student Detail" description="Student operations hub">
        <EmptyState
          title="Student not found"
          description="The requested student could not be found."
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Student Detail"
      description="Student profile, contracts, medical, notes, documents, and hold history"
    >
      <div style={{ display: "grid", gap: 20 }}>
        <PageCard title="Student Summary">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: 20,
              alignItems: "start",
            }}
          >
            <div>
              {student.photo_url ? (
                <img
                  src={student.photo_url}
                  alt={student.name}
                  style={{
                    width: 120,
                    height: 120,
                    objectFit: "cover",
                    borderRadius: 16,
                    border: "1px solid #334155",
                    background: "#0f172a",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 16,
                    border: "1px solid #334155",
                    background: "#0f172a",
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    textAlign: "center",
                    padding: 10,
                  }}
                >
                  No Photo
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: 18 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                  alignItems: "start",
                }}
              >
                <div style={{ display: "grid", gap: 8 }}>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 900,
                      color: "#f8fafc",
                    }}
                  >
                    {student.name}
                  </div>

                  {student.english_name ? (
                    <div
                      style={{
                        fontSize: 15,
                        color: "#94a3b8",
                        fontWeight: 600,
                      }}
                    >
                      {student.english_name}
                    </div>
                  ) : null}

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <StatusBadge value={student.status} />
                    <span style={pillStyle}>
                      Class: -
                    </span>
                    <span style={pillStyle}>
                      Belt: -
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <Link href="/students" style={buttonGhostStyle}>
                    Back to List
                  </Link>
                  <Link
                    href={`/students/${student.id}/print`}
                    style={{ ...buttonGhostStyle, borderColor: "#3b82f6", color: "#93c5fd" }}
                  >
                    Print / Save as PDF
                  </Link>
                  <Link href={`/students/${student.id}/edit`} style={buttonPrimaryStyle}>
                    Edit Student
                  </Link>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                }}
              >
                <InfoItem label="Student ID" value={student.id} />
                <InfoItem label="Gender" value={student.gender || "-"} />
                <InfoItem label="Birth Date" value={formatDate(student.birth_date)} />
                <InfoItem label="Join Date" value={formatDate(student.join_date)} />
                <InfoItem
                  label="Inactive Reason"
                  value="-"
                />
                <InfoItem
                  label="Active Contract"
                  value={activeContract?.programs?.name || "-"}
                />
              </div>
            </div>
          </div>
        </PageCard>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 20,
          }}
        >
          <PageCard title="Parent Contact">
            <div style={sectionGridStyle}>
              <InfoItem label="Parent Name" value={student.parent_name || "-"} />
              <InfoItem label="Parent Phone" value={student.parent_phone || "-"} />
              <InfoItem label="Parent Email" value={student.parent_email || "-"} />
            </div>
          </PageCard>

          <PageCard title="Emergency Contact">
            <div style={sectionGridStyle}>
              <InfoItem
                label="Contact Name"
                value={student.emergency_contact_name || "-"}
              />
              <InfoItem
                label="Phone"
                value={student.emergency_contact_phone || "-"}
              />
              <InfoItem
                label="Relationship"
                value={student.emergency_contact_relationship || "-"}
              />
            </div>
          </PageCard>
        </div>

        <PageCard title="Medical Information">
          {medical ? (
            <div style={sectionGridStyle}>
              <InfoItem label="Allergies" value={medical.allergies || "-"} />
              <InfoItem label="Medications" value={medical.medications || "-"} />
              <InfoItem label="Diagnosis / Condition" value={medical.diagnosis || "-"} />
              <InfoItem label="Medical Notes" value={medical.notes || "-"} />
            </div>
          ) : (
            <EmptyState
              title="No medical information"
              description="No medical notes have been recorded for this student."
            />
          )}
        </PageCard>

        <PageCard title="Program schedule (프로그램 일정)">
          {contracts.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 14 }}>No programs registered yet.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {contracts.map((c) => (
                <li key={c.id} style={{ color: "#e2e8f0", fontSize: 15 }}>
                  <strong>{c.programs?.name ?? "Unnamed"}</strong>
                  {" · "}
                  {c.weekly_frequency_options?.name ?? "-"}
                  {" · "}
                  {formatDate(c.start_date)} ~ {formatDate(c.end_date)}
                  {c.status ? (
                    <span style={{ marginLeft: 8, fontSize: 12, color: "#94a3b8" }}>
                      ({c.status})
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </PageCard>

        <PageCard
          title="Currently registered programs (현재 등록된 프로그램)"
          right={
            <Link href={`/student-programs/new?student_id=${student.id}`} style={buttonPrimaryStyle}>
              Add (추가)
            </Link>
          }
        >
          {contracts.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 14 }}>No programs yet. Click Add above to register a program.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #334155", textAlign: "left" }}>
                    <th style={{ padding: "12px 10px", color: "#94a3b8", fontWeight: 700 }}>Program</th>
                    <th style={{ padding: "12px 10px", color: "#94a3b8", fontWeight: 700 }}>Start</th>
                    <th style={{ padding: "12px 10px", color: "#94a3b8", fontWeight: 700 }}>End</th>
                    <th style={{ padding: "12px 10px", color: "#94a3b8", fontWeight: 700 }}>Duration</th>
                    <th style={{ padding: "12px 10px", color: "#94a3b8", fontWeight: 700 }}>Weekly</th>
                    <th style={{ padding: "12px 10px", color: "#94a3b8", fontWeight: 700 }}>Status</th>
                    <th style={{ padding: "12px 10px", color: "#94a3b8", fontWeight: 700 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => {
                    const isActive = (c.status || "").toLowerCase() === "active" || (c.status || "").toLowerCase() === "hold";
                    return (
                      <tr key={c.id} style={{ borderBottom: "1px solid #1e293b" }}>
                        <td style={{ padding: "12px 10px", color: "#f8fafc", fontWeight: 600 }}>
                          {c.programs?.name ?? "-"}
                        </td>
                        <td style={{ padding: "12px 10px", color: "#cbd5e1" }}>{formatDate(c.start_date)}</td>
                        <td style={{ padding: "12px 10px", color: "#cbd5e1" }}>{formatDate(c.end_date)}</td>
                        <td style={{ padding: "12px 10px", color: "#cbd5e1" }}>
                          {c.membership_durations?.name ?? "-"}
                        </td>
                        <td style={{ padding: "12px 10px", color: "#cbd5e1" }}>
                          {c.weekly_frequency_options?.name ?? "-"}
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <StatusBadge value={c.status} />
                        </td>
                        <td style={{ padding: "12px 10px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {isActive ? (
                            <>
                              <Link
                                href={`/student-programs/new?student_id=${student.id}&program_id=${c.program_id ?? ""}&renew=1`}
                                style={{
                                  ...buttonGhostStyle,
                                  padding: "8px 14px",
                                  fontSize: 13,
                                  color: "#22c55e",
                                  borderColor: "#16a34a",
                                  textDecoration: "none",
                                }}
                              >
                                Renew (리뉴)
                              </Link>
                              <button
                                type="button"
                                onClick={() => endContract(c.id)}
                                disabled={endingContractId === c.id || deletingContractId === c.id}
                                style={{
                                  ...buttonGhostStyle,
                                  padding: "8px 14px",
                                  fontSize: 13,
                                  color: "#f87171",
                                  borderColor: "#b91c1c",
                                }}
                              >
                                {endingContractId === c.id ? "Ending..." : "End contract"}
                              </button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => deleteContract(c.id)}
                            disabled={deletingContractId === c.id || endingContractId === c.id}
                            style={{
                              ...buttonGhostStyle,
                              padding: "8px 14px",
                              fontSize: 13,
                              color: "#94a3b8",
                              borderColor: "#64748b",
                            }}
                          >
                            {deletingContractId === c.id ? "Deleting..." : "Delete (삭제)"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PageCard>

        <PageCard title="Active Contract">
          {activeContract ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#f8fafc",
                  }}
                >
                  {activeContract.programs?.name || "Unnamed Program"}
                </div>
                <StatusBadge value={activeContract.status} />
              </div>

              <div style={contractGridStyle}>
                <InfoItem
                  label="Membership Duration"
                  value={activeContract.membership_durations?.name || "-"}
                />
                <InfoItem
                  label="Weekly Frequency"
                  value={activeContract.weekly_frequency_options?.name || "-"}
                />
                <InfoItem
                  label="Start Date"
                  value={formatDate(activeContract.start_date)}
                />
                <InfoItem
                  label="End Date"
                  value={formatDate(activeContract.end_date)}
                />
                <InfoItem
                  label="Contract Price"
                  value={formatMoney(activeContract.contract_price)}
                />
                <InfoItem
                  label="Discount"
                  value={formatMoney(activeContract.discount_amount)}
                />
                <InfoItem
                  label="Final Price"
                  value={formatMoney(activeContract.final_price)}
                />
                <InfoItem
                  label="Registration Fee"
                  value={formatMoney(activeContract.registration_fee)}
                />
                <InfoItem
                  label="Uniform Fee"
                  value={formatMoney(activeContract.uniform_fee)}
                />
                <InfoItem
                  label="Equipment Fee"
                  value={formatMoney(activeContract.equipment_fee)}
                />
                <InfoItem
                  label="Other Fee"
                  value={formatMoney(activeContract.other_fee)}
                />
                <InfoItem
                  label="Total Amount"
                  value={formatMoney(activeContract.total_amount)}
                />
                <InfoItem
                  label="Auto Renew"
                  value={activeContract.auto_renew ? "Yes" : "No"}
                />
                <InfoItem
                  label="Created At"
                  value={formatDateTime(activeContract.created_at)}
                />
              </div>

              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    marginBottom: 6,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Contract Note
                </div>
                <div style={textBoxStyle}>{activeContract.note || "-"}</div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No active contract"
              description="Add a program in the section above (Currently registered programs → Add)."
            />
          )}
        </PageCard>

        <PageCard title="Contract History">
          {contracts.length === 0 ? (
            <EmptyState
              title="No contracts found"
              description="No contract history has been recorded."
            />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  style={{
                    border: "1px solid #334155",
                    background: "#0f172a",
                    borderRadius: 14,
                    padding: 16,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "grid", gap: 4 }}>
                      <div
                        style={{
                          fontSize: 17,
                          fontWeight: 800,
                          color: "#f8fafc",
                        }}
                      >
                        {contract.programs?.name || "Unnamed Program"}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#94a3b8",
                        }}
                      >
                        {formatDate(contract.start_date)} ~ {formatDate(contract.end_date)}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <span style={pillStyle}>
                        {contract.membership_durations?.name || "No Duration"}
                      </span>
                      <span style={pillStyle}>
                        {contract.weekly_frequency_options?.name || "No Frequency"}
                      </span>
                      <StatusBadge value={contract.status} />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: 10,
                    }}
                  >
                    <InfoItem label="Final Price" value={formatMoney(contract.final_price)} />
                    <InfoItem label="Total Amount" value={formatMoney(contract.total_amount)} />
                    <InfoItem label="Created At" value={formatDateTime(contract.created_at)} />
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#94a3b8",
                        marginBottom: 6,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Note
                    </div>
                    <div style={textBoxStyle}>{contract.note || "-"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageCard>

        <PageCard title="Attendance">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 14, color: "#94a3b8" }}>Recent check-ins for this student</span>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/checkin" style={buttonPrimaryStyle}>Check In</Link>
              <Link href="/attendance" style={buttonGhostStyle}>View all</Link>
            </div>
          </div>
          {attendance.length === 0 ? (
            <EmptyState title="No attendance" description="No check-in records yet." />
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {attendance.slice(0, 15).map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "#0f172a",
                    borderRadius: 10,
                    border: "1px solid #1e293b",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{formatDate(row.checkin_date)}</span>
                  <span style={{ color: "#94a3b8", fontSize: 14 }}>
                    {row.checkin_time ? new Date(row.checkin_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "-"}
                  </span>
                  <span style={{ fontSize: 13, color: "#64748b" }}>{row.checkin_source || "-"}</span>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>
                    {(() => {
                    const t = (row.checkin_type || "regular").toLowerCase();
                    if (t === "makeup") return "Make-up";
                    if (t === "sparring") return "Sparring";
                    if (t === "poomsae") return "Poomsae";
                    if (t === "demonstration") return "Demonstration";
                    return "Regular";
                  })()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </PageCard>

        <PageCard title="Attendance Calendar">
          <StudentAttendanceCalendar
            studentId={student.id}
            holdRanges={holdLogs.map((h) => ({
              start: h.hold_start_date,
              end: h.hold_end_date,
            }))}
          />
        </PageCard>

        <PageCard title="Payments">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 14, color: "#94a3b8" }}>Recent payments for this student</span>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href={`/finance/payments/new?student_id=${student.id}${activeContract?.program_id ? `&program_id=${activeContract.program_id}` : ""}`} style={buttonPrimaryStyle}>New Payment</Link>
              <Link href="/finance/payments" style={buttonGhostStyle}>View all</Link>
            </div>
          </div>
          {payments.length === 0 ? (
            <EmptyState title="No payments" description="No payment records yet." />
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {payments.map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "#0f172a",
                    borderRadius: 10,
                    border: "1px solid #1e293b",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{formatDate(row.payment_date)}</span>
                  <span>{formatMoney(row.payment_amount)}</span>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>{row.payment_method || "-"}</span>
                  <StatusBadge value={row.payment_status} />
                  <Link href={`/finance/payments/${row.id}`} style={{ ...buttonGhostStyle, padding: "6px 12px", fontSize: 13 }}>Detail</Link>
                </div>
              ))}
            </div>
          )}
        </PageCard>

        <PageCard title="Invoices">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 14, color: "#94a3b8" }}>Invoices for this student</span>
            <Link href="/finance/invoices" style={buttonGhostStyle}>View all</Link>
          </div>
          {invoices.length === 0 ? (
            <EmptyState title="No invoices" description="No invoice records yet." />
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {invoices.map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "#0f172a",
                    borderRadius: 10,
                    border: "1px solid #1e293b",
                  }}
                >
                  <Link href={`/finance/invoices/${row.id}`} style={{ fontWeight: 700, color: "#93c5fd", textDecoration: "none" }}>
                    {row.invoice_number || row.id.slice(0, 8)}
                  </Link>
                  <span>{formatMoney(row.total_amount)}</span>
                  <span style={{ color: "#94a3b8" }}>Due {formatDate(row.due_date)}</span>
                  <span>Balance {formatMoney(row.balance_amount)}</span>
                  <StatusBadge value={row.invoice_status} />
                </div>
              ))}
            </div>
          )}
        </PageCard>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 20,
          }}
        >
          <PageCard title="Internal Notes">
            {notes.length === 0 ? (
              <EmptyState
                title="No notes found"
                description="No internal notes have been recorded."
              />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {notes.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: "1px solid #334155",
                      background: "#0f172a",
                      borderRadius: 14,
                      padding: 14,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: "#f8fafc",
                        }}
                      >
                        {item.title || "Untitled Note"}
                      </div>

                      <span style={pillStyle}>
                        {(item.note_type || "general").toUpperCase()}
                      </span>
                    </div>

                    <div style={textBoxStyle}>{item.note || "-"}</div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "#94a3b8",
                      }}
                    >
                      {formatDateTime(item.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageCard>

          <PageCard title="Documents">
            {documents.length === 0 ? (
              <EmptyState
                title="No documents found"
                description="No student documents have been uploaded."
              />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      border: "1px solid #334155",
                      background: "#0f172a",
                      borderRadius: 14,
                      padding: 14,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: "#f8fafc",
                        }}
                      >
                        {doc.title || doc.file_name || "Untitled Document"}
                      </div>

                      <span style={pillStyle}>
                        {doc.document_types?.name || "Document"}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        color: "#cbd5e1",
                        lineHeight: 1.6,
                        wordBreak: "break-word",
                      }}
                    >
                      {doc.note || "-"}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: "#94a3b8",
                        }}
                      >
                        {formatDateTime(doc.created_at)}
                      </div>

                      {doc.file_url ? (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          style={buttonGhostStyle}
                        >
                          Open File
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageCard>
        </div>

        <PageCard title="Hold History">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                border: "1px solid #334155",
                background: "#020617",
                borderRadius: 14,
                padding: 14,
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e5e7eb" }}>Create new hold</div>
              {holdError ? (
                <div
                  style={{
                    borderRadius: 8,
                    border: "1px solid #7f1d1d",
                    background: "rgba(127,29,29,0.3)",
                    color: "#fecaca",
                    padding: 8,
                    fontSize: 12,
                  }}
                >
                  {holdError}
                </div>
              ) : null}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 8,
                }}
              >
                <div>
                  <label style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4, display: "block" }}>
                    Start date
                  </label>
                  <input
                    type="date"
                    value={holdStart}
                    onChange={(e) => setHoldStart(e.target.value)}
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      border: "1px solid #334155",
                      background: "#020617",
                      color: "#e5e7eb",
                      padding: "6px 8px",
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4, display: "block" }}>
                    End date
                  </label>
                  <input
                    type="date"
                    value={holdEnd}
                    onChange={(e) => setHoldEnd(e.target.value)}
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      border: "1px solid #334155",
                      background: "#020617",
                      color: "#e5e7eb",
                      padding: "6px 8px",
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4, display: "block" }}>
                  Reason / note
                </label>
                <textarea
                  value={holdNote}
                  onChange={(e) => setHoldNote(e.target.value)}
                  rows={2}
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    border: "1px solid #334155",
                    background: "#020617",
                    color: "#e5e7eb",
                    padding: 8,
                    fontSize: 13,
                    resize: "vertical",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleCreateHold}
                  disabled={savingHold || !holdStart || !holdEnd}
                  style={{
                    borderRadius: 999,
                    border: "none",
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: 700,
                    background: savingHold ? "#facc15" : "#eab308",
                    color: "#422006",
                    cursor: savingHold || !holdStart || !holdEnd ? "not-allowed" : "pointer",
                    opacity: savingHold || !holdStart || !holdEnd ? 0.6 : 1,
                  }}
                >
                  {savingHold ? "Saving..." : "Start hold"}
                </button>
                {student?.status?.toLowerCase() === "hold" && (
                  <button
                    type="button"
                    onClick={handleReleaseHold}
                    disabled={releasingHold}
                    style={{
                      borderRadius: 999,
                      border: "1px solid #38bdf8",
                      padding: "8px 14px",
                      fontSize: 13,
                      fontWeight: 700,
                      background: releasingHold ? "rgba(8,47,73,0.6)" : "rgba(8,47,73,1)",
                      color: "#e0f2fe",
                      cursor: releasingHold ? "not-allowed" : "pointer",
                      opacity: releasingHold ? 0.7 : 1,
                    }}
                  >
                    {releasingHold ? "Releasing..." : "Release hold now"}
                  </button>
                )}
              </div>
            </div>
          </div>
          {holdLogs.length === 0 ? (
            <EmptyState
              title="No hold history"
              description="No hold records have been recorded."
            />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {holdLogs.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid #334155",
                    background: "#0f172a",
                    borderRadius: 14,
                    padding: 16,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#f8fafc",
                      }}
                    >
                      {item.hold_reasons?.name || "Hold"}
                    </div>

                    <StatusBadge value={item.status} />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: 10,
                    }}
                  >
                    <InfoItem
                      label="Hold Start"
                      value={formatDate(item.hold_start_date)}
                    />
                    <InfoItem
                      label="Hold End"
                      value={formatDate(item.hold_end_date)}
                    />
                    <InfoItem
                      label="Created At"
                      value={formatDateTime(item.created_at)}
                    />
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#94a3b8",
                        marginBottom: 6,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Reason Note
                    </div>
                    <div style={textBoxStyle}>{item.reason_note || "-"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageCard>

        <PageCard title="Internal Memo">
          <div style={textBoxStyle}>{student.memo || "-"}</div>
        </PageCard>
      </div>
    </AppShell>
  );
}

const sectionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const contractGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

const textBoxStyle: React.CSSProperties = {
  border: "1px solid #1e293b",
  background: "#0f172a",
  borderRadius: 12,
  padding: 14,
  color: "#e2e8f0",
  lineHeight: 1.7,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  minHeight: 52,
};

const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 800,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#cbd5e1",
};

const buttonPrimaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "#22c55e",
  color: "#052e16",
  borderRadius: 10,
  padding: "12px 18px",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
};

const buttonGhostStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#e2e8f0",
  borderRadius: 10,
  padding: "12px 18px",
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
};