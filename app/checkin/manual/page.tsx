"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import EmptyState from "../../../components/ui/EmptyState";
import { supabase } from "../../../lib/supabase";

type StudentRow = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  phone?: string | null;
  parent_phone?: string | null;
  photo_url: string | null;
  status: string | null;
};

type ProgramRow = {
  id: string;
  name: string | null;
};

type ContractRow = {
  id: string;
  student_id: string;
  program_id: string | null;
  weekly_frequency_option_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  programs: {
    name: string | null;
  } | null;
  weekly_frequency_options: {
    label?: string | null;
    frequency_value?: number | null;
  } | null;
};

function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStartLocalDate() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);

  const year = monday.getFullYear();
  const month = `${monday.getMonth() + 1}`.padStart(2, "0");
  const date = `${monday.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${date}`;
}

function getStudentName(student: StudentRow | null) {
  if (!student) return "-";
  return student.name || student.full_name || "Unknown Student";
}

function isExpired(endDate: string | null | undefined, today: string) {
  if (!endDate) return false;
  return endDate < today;
}

export default function ManualCheckInPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);

  const [form, setForm] = useState({
    program_id: "",
    checkin_type: "regular",
    note: "",
    allow_duplicate: false,
  });

  const today = useMemo(() => getTodayLocalDate(), []);
  const weekStart = useMemo(() => getWeekStartLocalDate(), []);

  useEffect(() => {
    fetchPrograms();
  }, []);

  async function fetchPrograms() {
    try {
      const { data, error } = await supabase
        .from("programs")
        .select("id, name")
        .eq("active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setPrograms((data ?? []) as unknown as ProgramRow[]);
    } catch (err: any) {
      setError(err?.message || "Failed to load programs.");
    }
  }

  async function handleStudentSearch() {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const keyword = searchKeyword.trim();

      if (keyword.length < 2) {
        setError("Search requires at least 2 characters.");
        setStudents([]);
        return;
      }

      const { data, error } = await supabase
        .from("students")
        .select(`
          id,
          name,
          full_name,
          phone,
          parent_phone,
          photo_url,
          status
        `)
        .or(`name.ilike.%${keyword}%,full_name.ilike.%${keyword}%,phone.ilike.%${keyword}%,parent_phone.ilike.%${keyword}%`)
        .eq("active", true)
        .order("full_name", { ascending: true })
        .limit(20);

      if (error) throw error;

      setStudents((data ?? []) as unknown as StudentRow[]);
    } catch (err: any) {
      setError(err?.message || "Failed to search students.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectStudent(student: StudentRow) {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      setSelectedStudent(student);

      const { data, error } = await supabase
        .from("student_contracts")
        .select(`
          id,
          student_id,
          program_id,
          weekly_frequency_option_id,
          start_date,
          end_date,
          status,
          programs (
            name
          ),
          weekly_frequency_options (
            label,
            frequency_value
          )
        `)
        .eq("student_id", student.id)
        .in("status", ["active", "hold"])
        .order("start_date", { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as unknown as ContractRow[];
      setContracts(rows);

      const firstProgramId =
        rows.find((row) => row.program_id)?.program_id || "";

      setForm((prev) => ({
        ...prev,
        program_id: firstProgramId,
      }));
    } catch (err: any) {
      setError(err?.message || "Failed to load student contracts.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveManualCheckIn() {
    if (!selectedStudent) {
      setError("Please select a student.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const matchingContract =
        contracts.find((row) => row.program_id === form.program_id) ||
        contracts[0] ||
        null;

      if (!form.allow_duplicate) {
        const { data: alreadyCheckedIn, error: duplicateError } = await supabase
          .from("daily_checkin_status")
          .select("id, checked_in")
          .eq("student_id", selectedStudent.id)
          .eq("checkin_date", today)
          .maybeSingle();

        if (duplicateError) throw duplicateError;

        if (alreadyCheckedIn?.checked_in) {
          setError("Already checked in today.");
          return;
        }
      }

      const warnings: string[] = [];

      if (matchingContract?.end_date && isExpired(matchingContract.end_date, today)) {
        warnings.push("expired_membership");
      }

      if (matchingContract?.id) {
        const { count, error: weeklyCountError } = await supabase
          .from("attendance_logs")
          .select("id", { count: "exact", head: true })
          .eq("student_id", selectedStudent.id)
          .gte("checkin_date", weekStart)
          .lte("checkin_date", today);

        if (weeklyCountError) throw weeklyCountError;

        const weeklyLimit =
          matchingContract.weekly_frequency_options?.frequency_value ?? null;

        if (weeklyLimit && weeklyLimit < 900 && (count ?? 0) >= weeklyLimit) {
          warnings.push("over_weekly_limit");
        }
      }

      let studentStatusAtCheckin = selectedStudent.status || null;

      if ((selectedStudent.status || "").toLowerCase() === "hold") {
        warnings.push("auto_released_hold");

        const { error: studentUpdateError } = await supabase
          .from("students")
          .update({ status: "active" })
          .eq("id", selectedStudent.id);

        if (studentUpdateError) throw studentUpdateError;

        const { data: latestHold, error: latestHoldError } = await supabase
          .from("student_hold_logs")
          .select("id")
          .eq("student_id", selectedStudent.id)
          .is("hold_end_date", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestHoldError) throw latestHoldError;

        if (latestHold?.id) {
          const { error: holdUpdateError } = await supabase
            .from("student_hold_logs")
            .update({
              hold_end_date: today,
              release_method: "manual",
              extension_status: "pending",
            })
            .eq("id", latestHold.id);

          if (holdUpdateError) throw holdUpdateError;
        }

        studentStatusAtCheckin = "active";
      }

      const attendancePayload = {
        student_id: selectedStudent.id,
        student_contract_id: matchingContract?.id ?? null,
        program_id: form.program_id || matchingContract?.program_id || null,
        checkin_date: today,
        checkin_time: new Date().toISOString(),
        checkin_source: "manual",
        checkin_type: form.checkin_type,
        status_at_checkin: studentStatusAtCheckin,
        warning_flags: warnings,
        note: form.note.trim() || null,
      };

      const { data: insertedAttendance, error: attendanceError } = await supabase
        .from("attendance_logs")
        .insert(attendancePayload)
        .select("id, checkin_time")
        .single();

      if (attendanceError) throw attendanceError;

      if (!form.allow_duplicate) {
        const { error: dailyStatusError } = await supabase
          .from("daily_checkin_status")
          .insert({
            student_id: selectedStudent.id,
            checkin_date: today,
            checked_in: true,
            attendance_log_id: insertedAttendance.id,
          });

        if (dailyStatusError) throw dailyStatusError;
      }

      const { error: studentLastCheckinError } = await supabase
        .from("students")
        .update({
          last_checkin_at: insertedAttendance.checkin_time,
        })
        .eq("id", selectedStudent.id);

      if (studentLastCheckinError) throw studentLastCheckinError;

      setSuccessMessage(
        `${getStudentName(selectedStudent)} manual check-in saved successfully.`
      );

      setForm({
        program_id: matchingContract?.program_id || "",
        checkin_type: "regular",
        note: "",
        allow_duplicate: false,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to save manual check-in.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Manual Check-in"
      description="Admin attendance input for kiosk issues, missed attendance, and make-up visits"
    >
      <div style={{ display: "grid", gap: 20 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Link href="/checkin" style={buttonGhostStyle}>
            Back to Check-in Home
          </Link>
          <Link href="/attendance" style={buttonGhostStyle}>
            Attendance Log
          </Link>
        </div>

        {loading ? <LoadingBlock message="Loading..." /> : null}
        {error ? <ErrorBlock title="Error" message={error} /> : null}
        {successMessage ? (
          <div style={successBoxStyle}>{successMessage}</div>
        ) : null}

        <PageCard title="Search Student">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleStudentSearch();
                }
              }}
              placeholder="Search by name or phone"
              style={inputStyle}
            />
            <button type="button" onClick={handleStudentSearch} style={buttonPrimaryStyle}>
              Search
            </button>
          </div>

          <div style={{ marginTop: 16 }}>
            {students.length === 0 ? (
              <EmptyState
                title="No student selected"
                description="Search for a student to begin manual check-in."
              />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {students.map((student) => {
                  const isSelected = selectedStudent?.id === student.id;

                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => handleSelectStudent(student)}
                      style={{
                        ...studentButtonStyle,
                        border: isSelected ? "1px solid #22c55e" : "1px solid #334155",
                        background: isSelected ? "rgba(34,197,94,0.10)" : "#0f172a",
                      }}
                    >
                      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                        {student.photo_url ? (
                          <img
                            src={student.photo_url}
                            alt={getStudentName(student)}
                            style={avatarStyle}
                          />
                        ) : (
                          <div style={avatarFallbackStyle}>No Photo</div>
                        )}

                        <div style={{ display: "grid", gap: 4, textAlign: "left" }}>
                          <div style={studentNameStyle}>{getStudentName(student)}</div>
                          <div style={subTextStyle}>
                            {student.phone || student.parent_phone || "-"}
                          </div>
                          <div style={subTextStyle}>
                            Status: {student.status || "-"}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </PageCard>

        <PageCard title="Manual Check-in Form">
          {!selectedStudent ? (
            <EmptyState
              title="Student required"
              description="Select a student first."
            />
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={formGridStyle}>
                <Field label="Selected Student">
                  <div style={readBoxStyle}>{getStudentName(selectedStudent)}</div>
                </Field>

                <Field label="Program">
                  <select
                    value={form.program_id}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, program_id: e.target.value }))
                    }
                    style={inputStyle}
                  >
                    <option value="">Select program</option>
                    {contracts.length > 0
                      ? contracts.map((row) => (
                          <option
                            key={row.id}
                            value={row.program_id || ""}
                          >
                            {row.programs?.name || "Unnamed Program"}
                          </option>
                        ))
                      : programs.map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.name || "Unnamed Program"}
                          </option>
                        ))}
                  </select>
                </Field>

                <Field label="Check-in Type">
                  <select
                    value={form.checkin_type}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, checkin_type: e.target.value }))
                    }
                    style={inputStyle}
                  >
                    <option value="regular">Regular</option>
                    <option value="makeup">Make-up</option>
                    <option value="sparring">Sparring</option>
                    <option value="poomsae">Poomsae</option>
                    <option value="demonstration">Demonstration</option>
                  </select>
                </Field>
              </div>

              <Field label="Memo">
                <textarea
                  value={form.note}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, note: e.target.value }))
                  }
                  placeholder="Optional note"
                  style={textareaStyle}
                />
              </Field>

              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  color: "#e2e8f0",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.allow_duplicate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      allow_duplicate: e.target.checked,
                    }))
                  }
                />
                Allow same-day duplicate check-in
              </label>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={handleSaveManualCheckIn}
                  disabled={saving}
                  style={buttonPrimaryStyle}
                >
                  {saving ? "Saving..." : "Save Manual Check-in"}
                </button>
              </div>
            </div>
          )}
        </PageCard>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#e2e8f0",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#f8fafc",
  borderRadius: 10,
  padding: "12px 14px",
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 100,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#f8fafc",
  borderRadius: 10,
  padding: "12px 14px",
  outline: "none",
  resize: "vertical",
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

const studentButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: 14,
  borderRadius: 14,
  cursor: "pointer",
  textDecoration: "none",
};

const avatarStyle: React.CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: 12,
  objectFit: "cover",
  border: "1px solid #334155",
  background: "#111827",
};

const avatarFallbackStyle: React.CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: 12,
  border: "1px solid #334155",
  background: "#111827",
  color: "#94a3b8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 800,
  textAlign: "center",
  padding: 6,
};

const studentNameStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 800,
  color: "#f8fafc",
};

const subTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#94a3b8",
};

const readBoxStyle: React.CSSProperties = {
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#f8fafc",
  borderRadius: 10,
  padding: "12px 14px",
  minHeight: 46,
  display: "flex",
  alignItems: "center",
};

const successBoxStyle: React.CSSProperties = {
  border: "1px solid #166534",
  background: "rgba(34,197,94,0.12)",
  color: "#dcfce7",
  borderRadius: 14,
  padding: 16,
  fontWeight: 700,
};