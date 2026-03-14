"use client";

import { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { supabase } from "../lib/supabase";

const PROGRAM_PALETTE = [
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#eab308",
];

type AttendanceRow = {
  checkin_date: string | null;
  program_id: string | null;
  checkin_type: string | null;
  programs: { name: string | null } | null;
};

type HoldRange = {
  start: string | null;
  end: string | null;
};

type Props = {
  studentId: string;
  holdRanges?: HoldRange[];
};

function getProgramColor(programId: string | null, programIndexMap: Map<string, number>): string {
  if (!programId) return PROGRAM_PALETTE[0];
  const idx = programIndexMap.get(programId) ?? 0;
  return PROGRAM_PALETTE[idx % PROGRAM_PALETTE.length];
}

export default function StudentAttendanceCalendar({ studentId, holdRanges = [] }: Props) {
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    void fetchAttendance();
  }, [studentId]);

  async function fetchAttendance() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("attendance_logs")
        .select("checkin_date, program_id, checkin_type, programs(name)")
        .eq("student_id", studentId)
        .order("checkin_date", { ascending: true });

      if (error) {
        console.error("fetchAttendance error:", error);
        return;
      }

      setAttendanceRows((data as unknown as AttendanceRow[] | null) ?? []);
    } catch (error) {
      console.error("fetchAttendance unexpected error:", error);
    } finally {
      setLoading(false);
    }
  }

  const { attendanceDateSet, dateToEntries, programOrder, programNames } = useMemo(() => {
    const dates = new Set<string>();
    const byDate: Record<string, Array<{ program_id: string | null; checkin_type: string | null; program_name: string | null }>> = {};
    const seenProgramIds = new Map<string, number>();
    const names: Record<string, string> = {};
    let nextIndex = 0;
    for (const row of attendanceRows) {
      const d = row.checkin_date ? row.checkin_date.slice(0, 10) : "";
      if (!d) continue;
      dates.add(d);
      if (!byDate[d]) byDate[d] = [];
      const pid = row.program_id ?? null;
      if (pid != null && !seenProgramIds.has(pid)) {
        seenProgramIds.set(pid, nextIndex++);
      }
      if (pid != null) names[pid] = row.programs?.name ?? "Program";
      byDate[d].push({
        program_id: pid,
        checkin_type: row.checkin_type ?? "regular",
        program_name: pid != null ? (row.programs?.name ?? "Program") : null,
      });
    }
    const order = Array.from(seenProgramIds.entries()).sort((a, b) => a[1] - b[1]).map(([id]) => id);
    return {
      attendanceDateSet: dates,
      dateToEntries: byDate,
      programOrder: order,
      programNames: names,
    };
  }, [attendanceRows]);

  const programIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    programOrder.forEach((id, i) => m.set(id, i));
    return m;
  }, [programOrder]);

  const holdDateSet = useMemo(() => {
    const set = new Set<string>();
    holdRanges.forEach((range) => {
      if (!range.start || !range.end) return;
      const start = new Date(range.start);
      const end = new Date(range.end);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
      const cursor = new Date(start);
      for (let i = 0; i < 366 && cursor <= end; i++) {
        set.add(formatDate(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return set;
  }, [holdRanges]);

  const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const isCheckedInDate = (date: Date) => {
    return attendanceDateSet.has(formatDate(date));
  };

  const isHoldDate = (date: Date) => {
    return holdDateSet.has(formatDate(date));
  };

  const selectedDateString = formatDate(selectedDate);
  const isSelectedDateCheckedIn = attendanceDateSet.has(selectedDateString);

  const monthlyAttendanceCount = useMemo(() => {
    const selectedYear = String(selectedDate.getFullYear());
    const selectedMonth = String(selectedDate.getMonth() + 1).padStart(2, "0");
    return Object.keys(dateToEntries).filter((dateStr) => {
      const [y, m] = dateStr.split("-");
      return y === selectedYear && m === selectedMonth;
    }).length;
  }, [selectedDate, dateToEntries]);

  const selectedDateEntries = dateToEntries[selectedDateString] ?? [];

  return (
    <div
      style={{
        marginTop: 24,
        padding: 20,
        border: "2px solid rgba(255,255,255,0.2)",
        borderRadius: 16,
        background: "linear-gradient(180deg, #0f172a 0%, #0c1222 100%)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "white" }}>
          Attendance Calendar
        </h2>

        <button
          type="button"
          onClick={fetchAttendance}
          style={{
            border: "none",
            borderRadius: 10,
            padding: "10px 14px",
            background: "#22d3ee",
            color: "#083344",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      <Calendar
        onChange={(value) => {
          if (value instanceof Date) {
            setSelectedDate(value);
          }
        }}
        value={selectedDate}
        tileClassName={({ date, view }) => {
          if (view !== "month") return "";
          if (isHoldDate(date)) return "hold-day";
          if (isCheckedInDate(date)) return "attendance-day";
          return "";
        }}
        tileContent={({ date, view }) => {
          if (view !== "month") return null;
          const d = formatDate(date);
          const entries = dateToEntries[d] ?? [];
          if (entries.length === 0) return null;
          return (
            <div
              style={{
                marginTop: 4,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 3,
                flexWrap: "wrap",
              }}
            >
              {entries.map((e, i) => {
                const isMakeup = (e.checkin_type || "").toLowerCase() === "makeup";
                const color = getProgramColor(e.program_id, programIndexMap);
                return (
                  <div
                    key={i}
                    title={[e.program_name, isMakeup ? "Make-up" : ""].filter(Boolean).join(" · ")}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: isMakeup ? 2 : "50%",
                      background: isMakeup ? "transparent" : color,
                      border: `2px solid ${color}`,
                      borderStyle: isMakeup ? "dashed" : "solid",
                    }}
                  />
                );
              })}
            </div>
          );
        }}
      />

      <p style={{ marginTop: 12, fontSize: 14, color: "#d1d5db" }}>
        This month attendance: <strong>{monthlyAttendanceCount}</strong>
      </p>

      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", fontSize: 12, color: "#e5e7eb" }}>
        {programOrder.map((pid) => (
          <span key={pid} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: getProgramColor(pid, programIndexMap),
                flexShrink: 0,
              }}
            />
            <span>{programNames[pid] ?? "Program"}</span>
          </span>
        ))}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, border: "2px dashed #94a3b8", background: "transparent" }} />
          Make-up
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, border: "2px solid #facc15" }} />
          Hold
        </span>
      </div>

      <p
        style={{
          marginTop: 10,
          fontSize: 14,
          color: isSelectedDateCheckedIn ? "#22c55e" : isHoldDate(selectedDate) ? "#facc15" : "#f87171",
        }}
      >
        Selected date: <strong>{selectedDateString}</strong> —{" "}
        {isSelectedDateCheckedIn
          ? selectedDateEntries.length > 0
            ? selectedDateEntries.map((e) => {
                const isMakeup = (e.checkin_type || "").toLowerCase() === "makeup";
                const label = (e.program_name ?? "Program") + (isMakeup ? " (Make-up)" : "");
                return label;
              }).join(", ")
            : "Present"
          : isHoldDate(selectedDate)
            ? "On hold"
            : "No attendance"}
      </p>

      {loading && (
        <p style={{ marginTop: 8, fontSize: 13, color: "#94a3b8" }}>
          Loading...
        </p>
      )}

      <style jsx global>{`
        .react-calendar {
          width: 100%;
          max-width: 420px;
          background: #1e293b !important;
          color: #f1f5f9 !important;
          border: 2px solid #475569 !important;
          border-radius: 14px !important;
          padding: 16px !important;
          font-size: 16px !important;
        }

        .react-calendar,
        .react-calendar *,
        .react-calendar *:before,
        .react-calendar *:after {
          box-sizing: border-box;
        }

        .react-calendar button {
          color: #f1f5f9 !important;
          font-size: 15px !important;
          font-weight: 600;
        }

        .react-calendar__navigation {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #475569;
        }

        .react-calendar__navigation button {
          min-width: 48px;
          min-height: 48px;
          background: #334155 !important;
          border: 1px solid #475569 !important;
          border-radius: 10px !important;
          font-size: 18px !important;
          font-weight: 700;
          color: #f8fafc !important;
        }

        .react-calendar__navigation button:hover {
          background: #475569 !important;
        }

        .react-calendar__navigation button:disabled {
          opacity: 0.5;
        }

        .react-calendar__month-view__weekdays {
          font-size: 14px !important;
          font-weight: 700 !important;
          color: #94a3b8 !important;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .react-calendar__month-view__weekdays__weekday {
          padding: 10px 0;
        }

        .react-calendar__tile {
          background: #334155 !important;
          color: #f8fafc !important;
          border-radius: 10px !important;
          height: 56px !important;
          font-size: 16px !important;
          font-weight: 600;
          border: 1px solid rgba(255,255,255,0.06);
        }

        .attendance-day {
          background: rgba(30, 41, 59, 0.9) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .hold-day {
          background: #111827 !important;
          box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.7) inset;
        }

        .react-calendar__tile:hover {
          background: #475569 !important;
        }

        .react-calendar__tile--now {
          background: #1e40af !important;
          border: 2px solid #3b82f6 !important;
          color: #fff !important;
        }

        .react-calendar__tile--active {
          background: #2563eb !important;
          color: #fff !important;
        }

        .react-calendar__month-view__days__day--neighboringMonth {
          color: #64748b !important;
          background: #1e293b !important;
        }
      `}</style>
    </div>
  );
}