"use client";

import { useMemo, useState } from "react";
import AppShell from "../../../components/ui/AppShell";
import { supabase } from "../../../lib/supabase";
import {
  exportMultiSheetExcel,
  exportSingleSheetExcel,
  type ExcelColumn,
} from "../../../lib/exportExcel";

type AttendanceExportType =
  | "attendance-log"
  | "daily-checkin"
  | "student-attendance-history"
  | "monthly-attendance-summary";

type AttendanceStatusFilter = "all" | "present" | "absent" | "late" | "excused";

type AttendanceRow = {
  id: string;
  student_id: string | null;
  attendance_date: string | null;
  status: string | null;
  check_in_time: string | null;
  note: string | null;
  created_at: string | null;
  students: {
    full_name: string | null;
  } | null;
  class_name?: string | null;
};

type AttendanceExportRow = {
  attendanceDate: string;
  studentName: string;
  studentStatus: string;
  className: string;
  attendanceStatus: string;
  checkInTime: string;
  note: string;
  createdAt: string;
};

type MonthlyAttendanceSummaryRow = {
  month: string;
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
};

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #1e293b",
        background: "#0f172a",
        borderRadius: 18,
        padding: 20,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            color: "#ffffff",
          }}
        >
          {title}
        </h2>

        {description ? (
          <p
            style={{
              margin: "8px 0 0 0",
              fontSize: 14,
              lineHeight: 1.6,
              color: "#94a3b8",
            }}
          >
            {description}
          </p>
        ) : null}
      </div>

      {children}
    </div>
  );
}

function ExportOptionCard({
  title,
  description,
  value,
  selected,
  onSelect,
}: {
  title: string;
  description: string;
  value: AttendanceExportType;
  selected: boolean;
  onSelect: (value: AttendanceExportType) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 16,
        padding: 18,
        cursor: "pointer",
        background: selected ? "#172554" : "#111827",
        border: selected ? "1px solid #3b82f6" : "1px solid #1f2937",
        color: "#f8fafc",
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          marginBottom: 8,
          color: "#ffffff",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: "#94a3b8",
        }}
      >
        {description}
      </div>
    </button>
  );
}

function formatExportTypeLabel(type: AttendanceExportType) {
  switch (type) {
    case "attendance-log":
      return "Attendance Log";
    case "daily-checkin":
      return "Daily Check In";
    case "student-attendance-history":
      return "Student Attendance History";
    case "monthly-attendance-summary":
      return "Monthly Attendance Summary";
    default:
      return "";
  }
}

function formatStatusLabel(status: AttendanceStatusFilter) {
  switch (status) {
    case "all":
      return "All";
    case "present":
      return "Present";
    case "absent":
      return "Absent";
    case "late":
      return "Late";
    case "excused":
      return "Excused";
    default:
      return "";
  }
}

function getDefaultStartDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function getDefaultEndDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStudentName(value: AttendanceRow["students"] | undefined): string {
  if (!value) return "";
  return value.full_name ?? "";
}

function getStudentStatus(): string {
  // attendance_logs currently do not store per-student status snapshot; leave empty.
  return "";
}

function getStudentClassName(value: AttendanceRow["class_name"] | undefined): string {
  return value ?? "";
}

function normalizeAttendanceStatus(value: string | null): string {
  if (!value) return "";
  return value.toLowerCase();
}

function getMonthKey(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return value.slice(0, 7);
}

function buildAttendanceColumns(): ExcelColumn<AttendanceExportRow>[] {
  return [
    { header: "Attendance Date", key: "attendanceDate", width: 16 },
    { header: "Student Name", key: "studentName", width: 24 },
    { header: "Student Status", key: "studentStatus", width: 16 },
    { header: "Class", key: "className", width: 20 },
    { header: "Attendance Status", key: "attendanceStatus", width: 18 },
    { header: "Check In Time", key: "checkInTime", width: 16 },
    { header: "Note", key: "note", width: 28 },
    { header: "Created At", key: "createdAt", width: 22 },
  ];
}

function buildMonthlyAttendanceSummaryColumns(): ExcelColumn<MonthlyAttendanceSummaryRow>[] {
  return [
    { header: "Month", key: "month", width: 14 },
    { header: "Total Records", key: "totalRecords", width: 14 },
    { header: "Present Count", key: "presentCount", width: 14 },
    { header: "Absent Count", key: "absentCount", width: 14 },
    { header: "Late Count", key: "lateCount", width: 14 },
    { header: "Excused Count", key: "excusedCount", width: 16 },
  ];
}

function buildAttendanceExportRows(rows: AttendanceRow[]): AttendanceExportRow[] {
  return rows.map((row) => ({
    attendanceDate: row.attendance_date ?? "",
    studentName: getStudentName(row.students),
    studentStatus: getStudentStatus(),
    className: getStudentClassName(row.class_name),
    attendanceStatus: normalizeAttendanceStatus(row.status),
    checkInTime: row.check_in_time ?? "",
    note: row.note ?? "",
    createdAt: row.created_at ?? "",
  }));
}

function filterAttendanceRows(params: {
  rows: AttendanceExportRow[];
  exportType: AttendanceExportType;
  statusFilter: AttendanceStatusFilter;
}): AttendanceExportRow[] {
  const { rows, exportType, statusFilter } = params;

  let nextRows = [...rows];

  if (statusFilter !== "all") {
    nextRows = nextRows.filter(
      (row) => row.attendanceStatus === statusFilter
    );
  }

  if (exportType === "daily-checkin") {
    nextRows = nextRows.filter((row) => row.checkInTime !== "");
  }

  return nextRows;
}

function buildMonthlyAttendanceSummaryRows(
  rows: AttendanceExportRow[]
): MonthlyAttendanceSummaryRow[] {
  const monthlyMap: Record<string, MonthlyAttendanceSummaryRow> = {};

  for (const row of rows) {
    const month = getMonthKey(row.attendanceDate);

    if (!monthlyMap[month]) {
      monthlyMap[month] = {
        month,
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
      };
    }

    monthlyMap[month].totalRecords += 1;

    if (row.attendanceStatus === "present") {
      monthlyMap[month].presentCount += 1;
    }

    if (row.attendanceStatus === "absent") {
      monthlyMap[month].absentCount += 1;
    }

    if (row.attendanceStatus === "late") {
      monthlyMap[month].lateCount += 1;
    }

    if (row.attendanceStatus === "excused") {
      monthlyMap[month].excusedCount += 1;
    }
  }

  return Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
}

async function fetchAttendanceForExport(params: {
  startDate: string;
  endDate: string;
}): Promise<AttendanceRow[]> {
  const { startDate, endDate } = params;

  const paramsObj = new URLSearchParams();
  if (startDate) paramsObj.set("startDate", startDate);
  if (endDate) paramsObj.set("endDate", endDate);
  paramsObj.set("limit", "5000");

  const res = await fetch(`/api/attendance?${paramsObj.toString()}`);
  const json = await res.json().catch(() => ({ rows: [] as unknown[] }));
  const rows = (json.rows ?? []) as Array<{
    id: string;
    student_id: string;
    checkin_date: string;
    checkin_time: string;
    checkin_type: string;
    students: { full_name: string | null } | null;
    programs: { name: string | null } | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    student_id: r.student_id,
    attendance_date: r.checkin_date,
    status: r.checkin_type || "present",
    check_in_time: r.checkin_time,
    note: null,
    created_at: r.checkin_time,
    students: r.students,
    class_name: r.programs?.name ?? null,
  }));
}

export default function AttendanceExportPage() {
  const [exportType, setExportType] =
    useState<AttendanceExportType>("attendance-log");
  const [statusFilter, setStatusFilter] =
    useState<AttendanceStatusFilter>("all");
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate());
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fileNamePreview = useMemo(() => {
    const statusPart = statusFilter === "all" ? "all-status" : statusFilter;
    const safeStart = startDate || "start";
    const safeEnd = endDate || "end";
    return `attendance-${exportType}-${statusPart}-${safeStart}-to-${safeEnd}.xlsx`;
  }, [exportType, statusFilter, startDate, endDate]);

  const dateError =
    startDate && endDate && startDate > endDate
      ? "Start date cannot be later than end date."
      : "";

  async function handleDownload() {
    try {
      setIsDownloading(true);
      setErrorMessage("");

      if (dateError) {
        throw new Error(dateError);
      }

      const attendanceRows = await fetchAttendanceForExport({
        startDate,
        endDate,
      });

      const rawRows = buildAttendanceExportRows(attendanceRows);
      const filteredRows = filterAttendanceRows({
        rows: rawRows,
        exportType,
        statusFilter,
      });

      if (
        exportType === "attendance-log" ||
        exportType === "daily-checkin" ||
        exportType === "student-attendance-history"
      ) {
        exportSingleSheetExcel<AttendanceExportRow>({
          fileName: fileNamePreview,
          sheetName: "Attendance",
          columns: buildAttendanceColumns(),
          rows: filteredRows,
        });
        return;
      }

      if (exportType === "monthly-attendance-summary") {
        const summaryRows = buildMonthlyAttendanceSummaryRows(filteredRows);

        const sheets = [
          {
            sheetName: "Monthly Summary",
            columns: buildMonthlyAttendanceSummaryColumns().map((col) => ({
              header: col.header,
              key: String(col.key),
              width: col.width,
            })),
            rows: summaryRows as Record<string, unknown>[],
          },
          {
            sheetName: "Attendance Log",
            columns: buildAttendanceColumns().map((col) => ({
              header: col.header,
              key: String(col.key),
              width: col.width,
            })),
            rows: filteredRows as Record<string, unknown>[],
          },
        ];

        exportMultiSheetExcel(fileNamePreview, sheets);
        return;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to export attendance data.";
      setErrorMessage(message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <AppShell
      title="Attendance Export"
      description="Export attendance data into Excel. This page belongs to Layer 4 and reads existing attendance records only."
      actions={
        <button
          type="button"
          onClick={handleDownload}
          disabled={Boolean(dateError) || isDownloading}
          style={{
            border: "1px solid #2563eb",
            background:
              Boolean(dateError) || isDownloading ? "#1f2937" : "#2563eb",
            color: "#ffffff",
            borderRadius: 12,
            padding: "12px 16px",
            fontWeight: 800,
            cursor:
              Boolean(dateError) || isDownloading ? "not-allowed" : "pointer",
            opacity: Boolean(dateError) || isDownloading ? 0.7 : 1,
          }}
        >
          {isDownloading ? "Preparing Excel..." : "Download Excel"}
        </button>
      }
    >
      <div
        style={{
          display: "grid",
          gap: 20,
        }}
      >
        {errorMessage ? (
          <div
            style={{
              border: "1px solid #7f1d1d",
              background: "#450a0a",
              color: "#fecaca",
              borderRadius: 16,
              padding: 16,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        <SectionCard
          title="Export Type"
          description="Choose which attendance dataset you want to export."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
            }}
          >
            <ExportOptionCard
              title="Attendance Log"
              description="Export detailed attendance records such as date, status, student, and class information."
              value="attendance-log"
              selected={exportType === "attendance-log"}
              onSelect={setExportType}
            />

            <ExportOptionCard
              title="Daily Check In"
              description="Export records that include actual check-in time for front desk and daily operation review."
              value="daily-checkin"
              selected={exportType === "daily-checkin"}
              onSelect={setExportType}
            />

            <ExportOptionCard
              title="Student Attendance History"
              description="Export student-based attendance history for warning checks and parent reporting."
              value="student-attendance-history"
              selected={exportType === "student-attendance-history"}
              onSelect={setExportType}
            />

            <ExportOptionCard
              title="Monthly Attendance Summary"
              description="Export monthly attendance summary plus attendance log sheet."
              value="monthly-attendance-summary"
              selected={exportType === "monthly-attendance-summary"}
              onSelect={setExportType}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Filters"
          description="Set attendance filters for the Excel export."
        >
          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <label
                  htmlFor="attendance-export-start-date"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#cbd5e1",
                  }}
                >
                  Start Date
                </label>
                <input
                  id="attendance-export-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    borderRadius: 12,
                    border: "1px solid #334155",
                    background: "#020617",
                    color: "#f8fafc",
                    padding: "12px 14px",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label
                  htmlFor="attendance-export-end-date"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#cbd5e1",
                  }}
                >
                  End Date
                </label>
                <input
                  id="attendance-export-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    borderRadius: 12,
                    border: "1px solid #334155",
                    background: "#020617",
                    color: "#f8fafc",
                    padding: "12px 14px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label
                htmlFor="attendance-export-status-filter"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#cbd5e1",
                }}
              >
                Attendance Status
              </label>

              <select
                id="attendance-export-status-filter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as AttendanceStatusFilter)
                }
                style={{
                  borderRadius: 12,
                  border: "1px solid #334155",
                  background: "#020617",
                  color: "#f8fafc",
                  padding: "12px 14px",
                  outline: "none",
                }}
              >
                <option value="all">All</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="excused">Excused</option>
              </select>
            </div>
          </div>

          {dateError ? (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #7f1d1d",
                background: "#450a0a",
                color: "#fecaca",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {dateError}
            </div>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Export Preview"
          description="Review the current export configuration before downloading."
        >
          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 14,
                background: "#111827",
                border: "1px solid #1f2937",
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Export Type
              </div>
              <div
                style={{
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {formatExportTypeLabel(exportType)}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 14,
                background: "#111827",
                border: "1px solid #1f2937",
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Date Range
              </div>
              <div
                style={{
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {startDate || "-"} to {endDate || "-"}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 14,
                background: "#111827",
                border: "1px solid #1f2937",
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Status Filter
              </div>
              <div
                style={{
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {formatStatusLabel(statusFilter)}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 14,
                background: "#111827",
                border: "1px solid #1f2937",
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                File Name Preview
              </div>
              <div
                style={{
                  color: "#38bdf8",
                  fontSize: 14,
                  fontWeight: 800,
                  wordBreak: "break-all",
                }}
              >
                {fileNamePreview}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}