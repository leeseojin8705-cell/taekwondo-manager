"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import EmptyState from "../../../components/ui/EmptyState";
import { supabase } from "../../../lib/supabase";

type StudentSearchRow = {
  id: string;
  student_code: string | null;
  full_name: string | null;
  phone: string | null;
  photo_url: string | null;
  status: string | null;
  current_belt_id: string | null;
  belts: {
    name: string | null;
  } | null;
};

type ActiveContractRow = {
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
    label: string | null;
    frequency_value: number | null;
  } | null;
};

type KioskResultCard = {
  student: StudentSearchRow;
  /** All active/hold contracts so student can choose which program to check in for */
  activeContracts: ActiveContractRow[];
  expiredMembership: boolean;
  overWeeklyLimit: boolean;
  noPhoto: boolean;
};

type SuccessState = {
  studentName: string;
  checkedInAt: string;
  warnings: string[];
  photoUrl: string | null;
  phone: string | null;
  beltName: string | null;
  programName: string | null;
};

const SEARCH_MIN_CHARS = 1;
const SEARCH_DEBOUNCE_MS = 280;
const CLICK_COOLDOWN_SECONDS = 5;
const AUTO_RETURN_SECONDS = 3;

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

function formatTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Show Sparring/Poomsae/Demonstration only when student's program name matches (e.g. you register "Sparring", "품새" as programs). */
function programMatchesSpecializedType(
  programName: string | null | undefined,
  type: "sparring" | "poomsae" | "demonstration"
): boolean {
  const n = (programName || "").toLowerCase().trim();
  if (type === "sparring") return n.includes("sparring") || n.includes("겨루기");
  if (type === "poomsae") return n.includes("poomsae") || n.includes("품새");
  if (type === "demonstration") return n.includes("demonstration") || n.includes("시범");
  return false;
}

function escapeOrLike(value: string) {
  return value.replaceAll(",", " ").trim();
}

function isExpired(endDate: string | null | undefined, today: string) {
  if (!endDate) return false;
  return endDate < today;
}

function getStudentName(student: StudentSearchRow) {
  return student.full_name || "Unknown Student";
}

function WarningBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        border: "1px solid #92400e",
        background: "rgba(245,158,11,0.2)",
        color: "#fde68a",
        padding: "8px 14px",
        fontSize: 14,
        fontWeight: 800,
      }}
    >
      {label}
    </span>
  );
}

export default function KioskCheckInPage() {
  const [search, setSearch] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<KioskResultCard[]>([]);
  const [processingStudentId, setProcessingStudentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [selectedCard, setSelectedCard] = useState<KioskResultCard | null>(null);
  const [cooldownMap, setCooldownMap] = useState<Record<string, number>>({});
  const [kioskCheckinType, setKioskCheckinType] = useState<"regular" | "makeup" | "sparring" | "poomsae" | "demonstration">("regular");
  /** Which contract (program) the student is checking in for; set when opening detail or clicking a program */
  const [selectedContract, setSelectedContract] = useState<ActiveContractRow | null>(null);
  const [kioskMakeupForRegular, setKioskMakeupForRegular] = useState(false);
  const [pressedProgramId, setPressedProgramId] = useState<string | null>(null);
  const [checkinPressed, setCheckinPressed] = useState(false);
  const [backPressed, setBackPressed] = useState(false);

  const today = useMemo(() => getTodayLocalDate(), []);
  const weekStart = useMemo(() => getWeekStartLocalDate(), []);

  useEffect(() => {
    if (success) {
      const timer = window.setTimeout(() => {
        setSuccess(null);
        setSearch("");
        setResults([]);
        setSelectedCard(null);
        setActionError(null);
        setKioskCheckinType("regular");
        setSelectedContract(null);
        setKioskMakeupForRegular(false);
      }, AUTO_RETURN_SECONDS * 1000);

      return () => window.clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length < SEARCH_MIN_CHARS) {
      setResults([]);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void runSearch(trimmed, () => cancelled);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search]);

  async function runSearch(trimmed: string, isCancelled?: () => boolean) {
    try {
      setSearchError(null);
      setActionError(null);
      setLoadingSearch(true);

      const keyword = escapeOrLike(trimmed);

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select(`
          id,
          student_code,
          full_name,
          phone,
          photo_url,
          status,
          current_belt_id,
          belts (
            name
          )
        `)
        .or(`full_name.ilike.%${keyword}%,phone.ilike.%${keyword}%`)
        .eq("active", true)
        .order("full_name", { ascending: true })
        .limit(20);

      if (studentsError) throw studentsError;
      if (isCancelled?.()) return;

      const students = ((studentsData ?? []) as unknown as StudentSearchRow[]) || [];

      if (students.length === 0) {
        setResults([]);
        return;
      }

      const builtResults: KioskResultCard[] = [];

      for (const student of students) {
        const { data: contractsData, error: contractError } = await supabase
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
          .order("start_date", { ascending: false })
          .limit(20);

        if (contractError) throw contractError;

        const activeContracts = ((contractsData ?? []) as unknown as ActiveContractRow[]) || [];
        const primaryContract = activeContracts[0] ?? null;

        let overWeeklyLimit = false;
        for (const c of activeContracts) {
          if (!c?.id) continue;
          const { count, error: weeklyCountError } = await supabase
            .from("attendance_logs")
            .select("id", { count: "exact", head: true })
            .eq("student_id", student.id)
            .eq("student_contract_id", c.id)
            .gte("checkin_date", weekStart)
            .lte("checkin_date", today);
          if (weeklyCountError) break;
          const weeklyLimit = c.weekly_frequency_options?.frequency_value ?? null;
          if (weeklyLimit != null && weeklyLimit < 900 && (count ?? 0) >= weeklyLimit) {
            overWeeklyLimit = true;
            break;
          }
        }

        builtResults.push({
          student,
          activeContracts,
          expiredMembership: isExpired(primaryContract?.end_date, today),
          overWeeklyLimit,
          noPhoto: !student.photo_url,
        });
      }
      if (isCancelled?.()) return;
      setResults(builtResults);
    } catch (err: any) {
      if (isCancelled?.()) return;
      setSearchError(err?.message || "Failed to search students.");
      setResults([]);
    } finally {
      if (!isCancelled?.()) setLoadingSearch(false);
    }
  }

  async function handleCheckIn(
    card: KioskResultCard,
    contract: ActiveContractRow,
    checkinType: "regular" | "makeup" | "sparring" | "poomsae" | "demonstration"
  ) {
    const studentId = card.student.id;
    const nowTs = Date.now();
    const cooldownUntil = cooldownMap[studentId] ?? 0;

    if (cooldownUntil > nowTs) {
      setActionError("Please wait a few seconds before clicking this student again.");
      return;
    }

    try {
      setProcessingStudentId(studentId);
      setActionError(null);

      const { data: existingDaily, error: dailyStatusError } = await supabase
        .from("daily_checkin_status")
        .select("id, checked_in")
        .eq("student_id", studentId)
        .eq("checkin_date", today)
        .maybeSingle();

      if (dailyStatusError) throw dailyStatusError;

      const warnings: string[] = [];
      const activeContract = contract;

      if (isExpired(activeContract.end_date, today)) {
        warnings.push("expired_membership");
      }

      const { count: weeklyCount, error: weeklyCountError } = await supabase
        .from("attendance_logs")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .eq("student_contract_id", activeContract.id)
        .gte("checkin_date", weekStart)
        .lte("checkin_date", today);
      if (weeklyCountError) throw weeklyCountError;
      const weeklyLimit = activeContract.weekly_frequency_options?.frequency_value ?? null;
      if (weeklyLimit != null && weeklyLimit < 900 && (weeklyCount ?? 0) >= weeklyLimit) {
        warnings.push("over_weekly_limit");
      }

      let studentStatusAtCheckin = card.student.status || null;

      if ((card.student.status || "").toLowerCase() === "hold") {
        warnings.push("auto_released_hold");

        const { error: studentUpdateError } = await supabase
          .from("students")
          .update({
            status: "active",
          })
          .eq("id", studentId);

        if (studentUpdateError) throw studentUpdateError;

        const { data: latestHold, error: latestHoldError } = await supabase
          .from("student_hold_logs")
          .select("id")
          .eq("student_id", studentId)
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
              release_method: "checkin_auto",
              extension_status: "pending",
            })
            .eq("id", latestHold.id);

          if (holdUpdateError) throw holdUpdateError;
        }

        studentStatusAtCheckin = "active";
      }

      const attendancePayload = {
        student_id: studentId,
        student_contract_id: activeContract?.id ?? null,
        program_id: activeContract?.program_id ?? null,
        checkin_date: today,
        checkin_time: new Date().toISOString(),
        checkin_source: "kiosk",
        checkin_type: checkinType,
        status_at_checkin: studentStatusAtCheckin,
        warning_flags: warnings,
        note: isExpired(activeContract.end_date, today)
          ? "Membership expired. Renewal recommended."
          : null,
      };

      const { data: attendanceInsert, error: attendanceError } = await supabase
        .from("attendance_logs")
        .insert(attendancePayload)
        .select("id, checkin_time")
        .single();

      if (attendanceError) throw attendanceError;

      if (existingDaily?.id) {
        const { error: dailyUpdateError } = await supabase
          .from("daily_checkin_status")
          .update({ attendance_log_id: attendanceInsert.id })
          .eq("id", existingDaily.id);
        if (dailyUpdateError) throw dailyUpdateError;
      } else {
        const { error: dailyInsertError } = await supabase
          .from("daily_checkin_status")
          .insert({
            student_id: studentId,
            checkin_date: today,
            checked_in: true,
            attendance_log_id: attendanceInsert.id,
          });
        if (dailyInsertError) throw dailyInsertError;
      }

      const { error: studentLastCheckinError } = await supabase
        .from("students")
        .update({
          last_checkin_at: attendanceInsert.checkin_time,
        })
        .eq("id", studentId);

      if (studentLastCheckinError) throw studentLastCheckinError;

      setCooldownMap((prev) => ({
        ...prev,
        [studentId]: nowTs + CLICK_COOLDOWN_SECONDS * 1000,
      }));

      setSuccess({
        studentName: getStudentName(card.student),
        checkedInAt: formatTime(attendanceInsert.checkin_time),
        warnings,
        photoUrl: card.student.photo_url ?? null,
        phone: card.student.phone ?? null,
        beltName: card.student.belts?.name ?? null,
        programName: activeContract.programs?.name ?? null,
      });
    } catch (err: any) {
      setActionError(err?.message || "Failed to complete check-in.");
    } finally {
      setProcessingStudentId(null);
    }
  }

  const kioskLayoutStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#020617",
    color: "#e5e7eb",
    position: "relative",
  };

  const dashboardBackStyle: React.CSSProperties = {
    position: "fixed",
    top: 8,
    left: 12,
    zIndex: 100,
    fontSize: 12,
    fontWeight: 600,
    color: "#64748b",
    textDecoration: "none",
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #334155",
    background: "rgba(15,23,42,0.9)",
  };

  if (success) {
    return (
      <main style={kioskLayoutStyle}>
        <Link href="/" style={dashboardBackStyle}>
          ← Dashboard
        </Link>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 720,
              border: "4px solid #166534",
              background: "rgba(15,23,42,0.95)",
              borderRadius: 32,
              padding: "48px 56px",
              display: "grid",
              gap: 28,
              textAlign: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 24,
                left: "50%",
                transform: "translateX(-50%)",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 24px",
                background: "rgba(34,197,94,0.25)",
                border: "2px solid #166534",
                borderRadius: 999,
                fontSize: "clamp(22px, 3vw, 28px)",
                fontWeight: 900,
                color: "#dcfce7",
              }}
            >
              <span style={{ fontSize: 32 }}>✅</span>
              Check-in Complete
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 24,
                paddingTop: 56,
              }}
            >
              {success.photoUrl ? (
                <img
                  src={success.photoUrl}
                  alt={success.studentName}
                  style={{
                    width: 220,
                    height: 220,
                    objectFit: "cover",
                    borderRadius: 28,
                    border: "4px solid #166534",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 220,
                    height: 220,
                    borderRadius: 28,
                    border: "4px solid #334155",
                    background: "#1e293b",
                    color: "#94a3b8",
                    fontSize: 28,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  No Photo
                </div>
              )}
              <div
                style={{
                  fontSize: "clamp(32px, 4.5vw, 44px)",
                  fontWeight: 900,
                  color: "#f8fafc",
                  lineHeight: 1.2,
                }}
              >
                {success.studentName}
              </div>
              {success.phone ? (
                <div style={{ fontSize: 26, color: "#94a3b8", fontWeight: 700 }}>
                  {success.phone}
                </div>
              ) : null}
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {success.beltName ? (
                  <span
                    style={{
                      padding: "10px 20px",
                      borderRadius: 999,
                      background: "rgba(51,65,85,0.8)",
                      color: "#e2e8f0",
                      fontSize: 20,
                      fontWeight: 800,
                    }}
                  >
                    Belt: {success.beltName}
                  </span>
                ) : null}
                {success.programName ? (
                  <span
                    style={{
                      padding: "10px 20px",
                      borderRadius: 999,
                      background: "rgba(51,65,85,0.8)",
                      color: "#e2e8f0",
                      fontSize: 20,
                      fontWeight: 800,
                    }}
                  >
                    {success.programName}
                  </span>
                ) : null}
              </div>
              <div
                style={{
                  fontSize: 26,
                  color: "#86efac",
                  fontWeight: 800,
                }}
              >
                Checked in at {success.checkedInAt}
              </div>
              {success.warnings.length > 0 ? (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                  {success.warnings.includes("expired_membership") ? (
                    <WarningBadge label="Expired" />
                  ) : null}
                  {success.warnings.includes("over_weekly_limit") ? (
                    <WarningBadge label="Over limit" />
                  ) : null}
                  {success.warnings.includes("auto_released_hold") ? (
                    <WarningBadge label="Hold released" />
                  ) : null}
                </div>
              ) : null}
              <div style={{ fontSize: 20, color: "#94a3b8", fontWeight: 600, marginTop: 8 }}>
                Returning in {AUTO_RETURN_SECONDS} seconds...
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (selectedCard) {
    const card = selectedCard;
    const contracts = card.activeContracts;
    const selectedContractForView =
      selectedContract && contracts.some((c) => c.id === selectedContract.id) ? selectedContract : contracts[0] ?? null;
    const isSpecialized = (c: ActiveContractRow) =>
      programMatchesSpecializedType(c.programs?.name, "sparring") ||
      programMatchesSpecializedType(c.programs?.name, "poomsae") ||
      programMatchesSpecializedType(c.programs?.name, "demonstration");
    const effectiveType: "regular" | "makeup" | "sparring" | "poomsae" | "demonstration" = selectedContractForView
      ? programMatchesSpecializedType(selectedContractForView.programs?.name, "sparring")
        ? "sparring"
        : programMatchesSpecializedType(selectedContractForView.programs?.name, "poomsae")
          ? "poomsae"
          : programMatchesSpecializedType(selectedContractForView.programs?.name, "demonstration")
            ? "demonstration"
            : kioskMakeupForRegular
              ? "makeup"
              : "regular"
      : "regular";

    const studentName = getStudentName(card.student);
    const isProcessing = processingStudentId === card.student.id;
    const cooldownUntil = cooldownMap[card.student.id] ?? 0;
    const isCoolingDown = cooldownUntil > Date.now();

    return (
      <main style={kioskLayoutStyle}>
        <Link href="/" style={dashboardBackStyle}>
          ← Dashboard
        </Link>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            marginTop: "-2cm",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 720,
              border: "4px solid #475569",
              background: "rgba(15,23,42,0.95)",
              borderRadius: 32,
              padding: "48px 56px",
              display: "grid",
              gap: 32,
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 24,
              }}
            >
              {card.student.photo_url ? (
                <img
                  src={card.student.photo_url}
                  alt={studentName}
                  style={{
                    width: 260,
                    height: 260,
                    objectFit: "cover",
                    borderRadius: 28,
                    border: "4px solid #475569",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 260,
                    height: 260,
                    borderRadius: 28,
                    border: "4px solid #334155",
                    background: "#1e293b",
                    color: "#94a3b8",
                    fontSize: 32,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  No Photo
                </div>
              )}
              <div
                style={{
                  fontSize: "clamp(36px, 5vw, 48px)",
                  fontWeight: 900,
                  color: "#f8fafc",
                  lineHeight: 1.2,
                }}
              >
                {studentName}
              </div>
              {card.student.phone ? (
                <div style={{ fontSize: 28, color: "#94a3b8", fontWeight: 700 }}>
                  {card.student.phone}
                </div>
              ) : null}
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    padding: "10px 20px",
                    borderRadius: 999,
                    background: "rgba(51,65,85,0.8)",
                    color: "#e2e8f0",
                    fontSize: 20,
                    fontWeight: 800,
                  }}
                >
                  Belt: {card.student.belts?.name || "-"}
                </span>
                <span
                  style={{
                    padding: "10px 20px",
                    borderRadius: 999,
                    background: "rgba(51,65,85,0.8)",
                    color: "#e2e8f0",
                    fontSize: 20,
                    fontWeight: 800,
                  }}
                >
                  {selectedContractForView?.programs?.name ?? (contracts.length > 1 ? "Select program below" : "-")}
                </span>
              </div>
              {(card.expiredMembership || card.overWeeklyLimit || (card.student.status || "").toLowerCase() === "hold") ? (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                  {card.expiredMembership ? <WarningBadge label="Expired" /> : null}
                  {card.overWeeklyLimit ? <WarningBadge label="Over limit" /> : null}
                  {(card.student.status || "").toLowerCase() === "hold" ? <WarningBadge label="Hold" /> : null}
                </div>
              ) : null}
              {actionError ? (
                <div
                  style={{
                    padding: "16px 24px",
                    background: "rgba(239,68,68,0.2)",
                    border: "2px solid #b91c1c",
                    borderRadius: 16,
                    color: "#fecaca",
                    fontSize: 18,
                    fontWeight: 700,
                    width: "100%",
                    maxWidth: 480,
                  }}
                >
                  {actionError}
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onMouseDown={() => setBackPressed(true)}
                  onMouseUp={() => setBackPressed(false)}
                  onMouseLeave={() => setBackPressed(false)}
                  onClick={() => {
                    setActionError(null);
                    setKioskCheckinType("regular");
                    setSelectedCard(null);
                    setSelectedContract(null);
                    setKioskMakeupForRegular(false);
                  }}
                  style={{
                    ...buttonGhostStyle,
                    padding: "18px 28px",
                    fontSize: 18,
                    background: backPressed ? "#1e293b" : buttonGhostStyle.background,
                    transform: backPressed ? "scale(0.97)" : "scale(1)",
                    boxShadow: backPressed ? "inset 0 2px 6px rgba(0,0,0,0.3)" : undefined,
                    transition: "transform 0.08s ease, background 0.08s ease",
                  }}
                >
                  Back
                </button>
                {contracts.length === 0 ? (
                  <span style={{ fontSize: 18, color: "#94a3b8", fontWeight: 600 }}>No program registered (등록된 프로그램 없음)</span>
                ) : (
                  <>
                    <span style={{ fontSize: 14, color: "#94a3b8", fontWeight: 600 }}>등록된 프로그램 · Select program to check in</span>
                    {contracts.map((c) => {
                    const name = c.programs?.name ?? "Program";
                    const selected = selectedContractForView?.id === c.id;
                    const pressed = pressedProgramId === c.id;
                    const spec = isSpecialized(c);
                    const border = selected
                      ? (spec ? "#3b82f6" : "#22c55e")
                      : (spec ? "#1d4ed8" : "#475569");
                    let bg = selected
                      ? (spec ? "rgba(59,130,246,0.55)" : "rgba(34,197,94,0.5)")
                      : "rgba(30,41,59,0.5)";
                    if (pressed) bg = selected ? (spec ? "rgba(37,99,235,0.85)" : "rgba(22,163,74,0.8)") : "rgba(51,65,85,0.9)";
                    const textColor = selected ? "#fff" : "#94a3b8";
                    const glow = selected
                      ? (spec
                          ? "0 0 0 4px rgba(59,130,246,0.5), 0 0 20px rgba(59,130,246,0.25)"
                          : "0 0 0 4px rgba(34,197,94,0.5), 0 0 20px rgba(34,197,94,0.25)")
                      : undefined;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => setPressedProgramId(c.id)}
                        onMouseUp={() => setPressedProgramId(null)}
                        onMouseLeave={() => setPressedProgramId(null)}
                        onClick={() => {
                          setSelectedContract(c);
                          if (!isSpecialized(c)) setKioskMakeupForRegular(false);
                        }}
                        style={{
                          ...buttonGhostStyle,
                          padding: "18px 28px",
                          fontSize: selected ? 20 : 18,
                          fontWeight: selected ? 800 : 700,
                          borderWidth: selected ? 4 : 2,
                          borderColor: border,
                          background: bg,
                          color: textColor,
                          boxShadow: pressed
                            ? "inset 0 2px 8px rgba(0,0,0,0.4)"
                            : selected
                              ? glow
                              : undefined,
                          transform: pressed ? "scale(0.96)" : selected ? "scale(1.02)" : "scale(1)",
                          transition: "transform 0.12s ease, background 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease",
                        }}
                      >
                        {selected ? "✓ " : ""}{name}
                      </button>
                    );
                  })}
                  </>
                )}
              </div>
              {selectedContractForView && !isSpecialized(selectedContractForView) ? (
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#e2e8f0",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={kioskMakeupForRegular}
                    onChange={(e) => setKioskMakeupForRegular(e.target.checked)}
                    style={{ width: 24, height: 24, accentColor: "#22c55e" }}
                  />
                  Make-up class
                </label>
              ) : null}
              <button
                type="button"
                onMouseDown={() => !isProcessing && !isCoolingDown && setCheckinPressed(true)}
                onMouseUp={() => setCheckinPressed(false)}
                onMouseLeave={() => setCheckinPressed(false)}
                onClick={() => selectedContractForView && handleCheckIn(card, selectedContractForView, effectiveType)}
                disabled={!selectedContractForView || isProcessing || isCoolingDown}
                style={{
                  ...buttonPrimaryStyle,
                  padding: "22px 48px",
                  fontSize: 24,
                  background:
                    checkinPressed && selectedContractForView && !isProcessing && !isCoolingDown
                      ? "#16a34a"
                      : selectedContractForView && !isProcessing && !isCoolingDown
                        ? "#22c55e"
                        : "#334155",
                  color: selectedContractForView && !isProcessing && !isCoolingDown ? "#052e16" : "#94a3b8",
                  border:
                    selectedContractForView && !isProcessing && !isCoolingDown
                      ? "3px solid #16a34a"
                      : "2px solid #475569",
                  boxShadow:
                    checkinPressed && selectedContractForView && !isProcessing && !isCoolingDown
                      ? "inset 0 3px 12px rgba(0,0,0,0.35)"
                      : selectedContractForView && !isProcessing && !isCoolingDown
                        ? "0 0 0 3px rgba(34,197,94,0.4)"
                        : undefined,
                  transform: checkinPressed ? "scale(0.97)" : "scale(1)",
                  transition: "transform 0.08s ease, background 0.08s ease, box-shadow 0.08s ease",
                  opacity: isProcessing || isCoolingDown ? 0.7 : 1,
                  cursor: isProcessing || isCoolingDown ? "not-allowed" : "pointer",
                }}
              >
                {isProcessing ? "Processing..." : isCoolingDown ? "Please wait..." : "Check in"}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={kioskLayoutStyle}>
      <Link href="/" style={dashboardBackStyle}>
        ← Dashboard
      </Link>
      <div style={{ display: "grid", gap: 20, paddingTop: 40 }}>
        <PageCard title="">
          <div
            style={{
              padding: "24px 0",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
                alignItems: "stretch",
                justifyContent: "center",
                width: "100%",
                maxWidth: 900,
              }}
            >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone"
              style={inputStyle}
              autoFocus
            />
            {loadingSearch ? (
              <span style={{ alignSelf: "center", fontSize: 16, color: "#94a3b8", fontWeight: 600 }}>Searching...</span>
            ) : null}
            </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
              marginTop: 14,
            }}
          >
            <button
              type="button"
              onClick={() => {
                const t = search.trim();
                if (t.length >= SEARCH_MIN_CHARS) void runSearch(t, () => false);
              }}
              disabled={loadingSearch || search.trim().length < SEARCH_MIN_CHARS}
              style={{ ...buttonGhostStyle, opacity: search.trim().length < SEARCH_MIN_CHARS ? 0.6 : 1 }}
            >
              Refresh (새로고침)
            </button>
            <Link
              href="/students/new?kiosk=1"
              style={{ ...buttonGhostStyle, textDecoration: "none" }}
            >
              New Student
            </Link>
            <Link href="/checkin" style={buttonGhostStyle}>
              Close
            </Link>
          </div>
          {loadingSearch ? <LoadingBlock message="Searching..." /> : null}
          {searchError ? (
            <ErrorBlock title="Search error" message={searchError} />
          ) : null}
          {actionError ? (
            <ErrorBlock title="Check-in error" message={actionError} />
          ) : null}
          </div>
        </PageCard>

        <PageCard title="Results">
          {search.trim().length < SEARCH_MIN_CHARS ? (
            <EmptyState
              title="Type to search"
              description="Enter name or phone to see matching students."
            />
          ) : loadingSearch ? null : results.length === 0 ? (
            <EmptyState
              title="No students found"
              description="No matching students."
            />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 22,
              }}
            >
              {results.map((card) => {
                const studentName = getStudentName(card.student);
                const isProcessing = processingStudentId === card.student.id;
                const cooldownUntil = cooldownMap[card.student.id] ?? 0;
                const isCoolingDown = cooldownUntil > Date.now();

                return (
                  <button
                    key={card.student.id}
                    type="button"
                    onClick={() => {
                      setSelectedCard(card);
                      setSelectedContract(card.activeContracts[0] ?? null);
                      setKioskMakeupForRegular(false);
                      setKioskCheckinType("regular");
                    }}
                    disabled={isProcessing || isCoolingDown}
                    style={{
                      border: "2px solid #475569",
                      background: isProcessing || isCoolingDown ? "#0f172a" : "#0f172a",
                      borderRadius: 24,
                      padding: 24,
                      cursor: isProcessing || isCoolingDown ? "not-allowed" : "pointer",
                      display: "grid",
                      gap: 18,
                      textAlign: "left",
                      opacity: isProcessing || isCoolingDown ? 0.7 : 1,
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isProcessing && !isCoolingDown) {
                        e.currentTarget.style.borderColor = "#22c55e";
                        e.currentTarget.style.boxShadow = "0 0 0 2px rgba(34,197,94,0.3)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#475569";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      {card.student.photo_url ? (
                        <img
                          src={card.student.photo_url}
                          alt={studentName}
                          style={{
                            width: 180,
                            height: 180,
                            objectFit: "cover",
                            borderRadius: 24,
                            border: "3px solid #334155",
                            background: "#111827",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 180,
                            height: 180,
                            borderRadius: 24,
                            border: "3px solid #334155",
                            background: "#111827",
                            color: "#94a3b8",
                            fontSize: 18,
                            fontWeight: 900,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            padding: 16,
                          }}
                        >
                          No Photo
                        </div>
                      )}
                    </div>

                    <div style={{ display: "grid", gap: 12 }}>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          color: "#f8fafc",
                          textAlign: "center",
                          lineHeight: 1.2,
                        }}
                      >
                        {studentName}
                      </div>

                      <div
                        style={{
                          fontSize: 14,
                          color: "#cbd5e1",
                          textAlign: "center",
                        }}
                      >
                        {card.student.phone || "-"}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 10,
                          justifyContent: "center",
                        }}
                      >
                        <span style={pillStyle}>
                          Belt: {card.student.belts?.name || "-"}
                        </span>
                        <span style={pillStyle}>
                          Program: {card.activeContracts[0]?.programs?.name ?? (card.activeContracts.length > 1 ? `${card.activeContracts.length} programs` : "-")}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 10,
                          justifyContent: "center",
                        }}
                      >
                        {card.expiredMembership ? (
                          <WarningBadge label="Expired" />
                        ) : null}
                        {card.overWeeklyLimit ? (
                          <WarningBadge label="Over limit" />
                        ) : null}
                        {card.noPhoto ? (
                          <WarningBadge label="No photo" />
                        ) : null}
                        {(card.student.status || "").toLowerCase() === "hold" ? (
                          <WarningBadge label="Hold" />
                        ) : null}
                      </div>

                      <div
                        style={{
                          textAlign: "center",
                          fontSize: 14,
                          fontWeight: 700,
                          color: isProcessing || isCoolingDown ? "#64748b" : "#22c55e",
                          padding: "8px 0 0",
                        }}
                      >
                        {isProcessing
                          ? "Processing..."
                          : isCoolingDown
                          ? "Please wait..."
                          : "Tap to check in"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </PageCard>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 320,
  border: "3px solid #475569",
  background: "#0f172a",
  color: "#f8fafc",
  borderRadius: 16,
  padding: "24px 28px",
  outline: "none",
  fontSize: 28,
  fontWeight: 600,
};

const buttonPrimaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "#22c55e",
  color: "#052e16",
  borderRadius: 16,
  padding: "24px 40px",
  fontSize: 26,
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
};

const buttonGhostStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "2px solid #475569",
  background: "#0f172a",
  color: "#e2e8f0",
  borderRadius: 14,
  padding: "18px 26px",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
};

const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  border: "1px solid #475569",
  background: "#0b1220",
  color: "#cbd5e1",
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 800,
};