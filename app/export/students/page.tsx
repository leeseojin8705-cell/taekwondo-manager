"use client";

import { useMemo, useState } from "react";
import AppShell from "../../../components/ui/AppShell";
import { supabase } from "../../../lib/supabase";
import {
  exportSingleSheetExcel,
  type ExcelColumn,
} from "../../../lib/exportExcel";

type StudentExportType =
  | "student-master"
  | "active-students"
  | "inactive-students"
  | "student-program-summary";

type StudentStatusFilter = "all" | "active" | "hold" | "inactive";

type RelationName =
  | {
      name: string | null;
    }
  | {
      name: string | null;
    }[]
  | null;

type StudentRow = {
  id: string;
  name: string | null;
  status: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  birth_date: string | null;
  join_date: string | null;
  classes: RelationName;
  belts: RelationName;
};

type StudentProgramRow = {
  id: string;
  student_id: string;
  status: string | null;
  weekly_frequency: number | null;
  start_date: string | null;
  end_date: string | null;
  programs: RelationName;
};

type StudentExportRow = {
  name: string;
  status: string;
  parentName: string;
  parentPhone: string;
  birthDate: string;
  className: string;
  beltName: string;
  joinDate: string;
  weeklyFrequency: number | "";
  programName: string;
  membershipStartDate: string;
  membershipEndDate: string;
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
  value: StudentExportType;
  selected: boolean;
  onSelect: (value: StudentExportType) => void;
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

function formatExportTypeLabel(type: StudentExportType) {
  switch (type) {
    case "student-master":
      return "Student Master";
    case "active-students":
      return "Active Students";
    case "inactive-students":
      return "Inactive Students";
    case "student-program-summary":
      return "Student Program Summary";
    default:
      return "";
  }
}

function formatStatusLabel(status: StudentStatusFilter) {
  switch (status) {
    case "all":
      return "All";
    case "active":
      return "Active";
    case "hold":
      return "Hold";
    case "inactive":
      return "Inactive";
    default:
      return "";
  }
}

function getRelationName(value: RelationName | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value[0]?.name ?? "";
  }
  return value.name ?? "";
}

function normalizeStudentStatus(value: string | null): string {
  if (!value) return "";
  return value.toLowerCase();
}

function buildStudentColumns(params: {
  exportType: StudentExportType;
  includeParentContact: boolean;
  includeProgramSummary: boolean;
}): ExcelColumn<StudentExportRow>[] {
  const { exportType, includeParentContact, includeProgramSummary } = params;

  const baseColumns: ExcelColumn<StudentExportRow>[] = [
    { header: "Student Name", key: "name", width: 24 },
    { header: "Status", key: "status", width: 14 },
    { header: "Birth Date", key: "birthDate", width: 14 },
    { header: "Class", key: "className", width: 20 },
    { header: "Belt", key: "beltName", width: 18 },
    { header: "Join Date", key: "joinDate", width: 14 },
  ];

  const parentColumns: ExcelColumn<StudentExportRow>[] = includeParentContact
    ? [
        { header: "Parent Name", key: "parentName", width: 22 },
        { header: "Parent Phone", key: "parentPhone", width: 18 },
      ]
    : [];

  const programColumns: ExcelColumn<StudentExportRow>[] = includeProgramSummary
    ? [
        { header: "Program", key: "programName", width: 22 },
        { header: "Weekly Frequency", key: "weeklyFrequency", width: 16 },
        {
          header: "Membership Start",
          key: "membershipStartDate",
          width: 18,
        },
        {
          header: "Membership End",
          key: "membershipEndDate",
          width: 18,
        },
      ]
    : [];

  if (exportType === "student-program-summary") {
    return [
      { header: "Student Name", key: "name", width: 24 },
      { header: "Status", key: "status", width: 14 },
      { header: "Program", key: "programName", width: 22 },
      { header: "Weekly Frequency", key: "weeklyFrequency", width: 16 },
      {
        header: "Membership Start",
        key: "membershipStartDate",
        width: 18,
      },
      {
        header: "Membership End",
        key: "membershipEndDate",
        width: 18,
      },
      { header: "Class", key: "className", width: 20 },
      { header: "Belt", key: "beltName", width: 18 },
    ];
  }

  return [...baseColumns, ...parentColumns, ...programColumns];
}

function buildProgramsByStudentId(
  rows: StudentProgramRow[]
): Record<string, StudentProgramRow | undefined> {
  const map: Record<string, StudentProgramRow | undefined> = {};

  for (const row of rows) {
    if (!map[row.student_id]) {
      map[row.student_id] = row;
    }
  }

  return map;
}

function buildExportRows(params: {
  students: StudentRow[];
  programsByStudentId: Record<string, StudentProgramRow | undefined>;
  exportType: StudentExportType;
  statusFilter: StudentStatusFilter;
}): StudentExportRow[] {
  const { students, programsByStudentId, exportType, statusFilter } = params;

  let rows: StudentExportRow[] = students.map((student) => {
    const studentStatus = normalizeStudentStatus(student.status);
    const studentProgram = programsByStudentId[student.id];
    const mergedStatus =
      normalizeStudentStatus(studentProgram?.status ?? null) || studentStatus;

    return {
      name: student.name ?? "",
      status: mergedStatus,
      parentName: student.parent_name ?? "",
      parentPhone: student.parent_phone ?? "",
      birthDate: student.birth_date ?? "",
      className: getRelationName(student.classes),
      beltName: getRelationName(student.belts),
      joinDate: student.join_date ?? "",
      weeklyFrequency: studentProgram?.weekly_frequency ?? "",
      programName: getRelationName(studentProgram?.programs),
      membershipStartDate: studentProgram?.start_date ?? "",
      membershipEndDate: studentProgram?.end_date ?? "",
    };
  });

  if (exportType === "active-students") {
    rows = rows.filter((row) => row.status === "active");
  }

  if (exportType === "inactive-students") {
    rows = rows.filter((row) => row.status === "inactive");
  }

  if (statusFilter !== "all") {
    rows = rows.filter((row) => row.status === statusFilter);
  }

  return rows;
}

async function fetchStudentsForExport(): Promise<StudentRow[]> {
  const { data, error } = await supabase
    .from("students")
    .select(
      `
        id,
        name,
        status,
        parent_name,
        parent_phone,
        birth_date,
        join_date,
        classes!class_id (
          name
        ),
        belts!current_belt_id (
          name
        )
      `
    )
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as StudentRow[];
}

async function fetchProgramsForExport(): Promise<StudentProgramRow[]> {
  const { data, error } = await supabase
    .from("student_contracts")
    .select(
      `
        id,
        student_id,
        status,
        start_date,
        end_date,
        programs!program_id (
          name
        ),
        weekly_frequency_options:weekly_frequency_option_id (
          name
        )
      `
    )
    .order("start_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    student_id: string;
    status: string | null;
    start_date: string | null;
    end_date: string | null;
    programs: { name: string | null } | null;
    weekly_frequency_options: { name: string | null } | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    student_id: r.student_id,
    status: r.status,
    weekly_frequency: null,
    start_date: r.start_date,
    end_date: r.end_date,
    programs: r.programs,
  }));
}

export default function StudentsExportPage() {
  const [exportType, setExportType] =
    useState<StudentExportType>("student-master");
  const [statusFilter, setStatusFilter] =
    useState<StudentStatusFilter>("all");
  const [includeParentContact, setIncludeParentContact] = useState(true);
  const [includeProgramSummary, setIncludeProgramSummary] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fileNamePreview = useMemo(() => {
    const statusPart = statusFilter === "all" ? "all-status" : statusFilter;
    return `students-${exportType}-${statusPart}.xlsx`;
  }, [exportType, statusFilter]);

  async function handleDownload() {
    try {
      setIsDownloading(true);
      setErrorMessage("");

      const [students, studentPrograms] = await Promise.all([
        fetchStudentsForExport(),
        fetchProgramsForExport(),
      ]);

      const programsByStudentId = buildProgramsByStudentId(studentPrograms);

      const rows = buildExportRows({
        students,
        programsByStudentId,
        exportType,
        statusFilter,
      });

      const columns = buildStudentColumns({
        exportType,
        includeParentContact,
        includeProgramSummary,
      });

      exportSingleSheetExcel<StudentExportRow>({
        fileName: fileNamePreview,
        sheetName: "Students",
        columns,
        rows,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to export students.";
      setErrorMessage(message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <AppShell
      title="Students Export"
      description="Export student master data into Excel. This page belongs to Layer 4 and reads existing student records only."
      actions={
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          style={{
            border: "1px solid #2563eb",
            background: isDownloading ? "#1f2937" : "#2563eb",
            color: "#ffffff",
            borderRadius: 12,
            padding: "12px 16px",
            fontWeight: 800,
            cursor: isDownloading ? "not-allowed" : "pointer",
            opacity: isDownloading ? 0.7 : 1,
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
          description="Choose which student dataset you want to export."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
            }}
          >
            <ExportOptionCard
              title="Student Master"
              description="Export core student records such as name, parent info, birth date, class, belt, and current status."
              value="student-master"
              selected={exportType === "student-master"}
              onSelect={setExportType}
            />

            <ExportOptionCard
              title="Active Students"
              description="Export only active students for current operational use and roster review."
              value="active-students"
              selected={exportType === "active-students"}
              onSelect={setExportType}
            />

            <ExportOptionCard
              title="Inactive Students"
              description="Export inactive students for archive review, follow-up, and historical management."
              value="inactive-students"
              selected={exportType === "inactive-students"}
              onSelect={setExportType}
            />

            <ExportOptionCard
              title="Student Program Summary"
              description="Export program-related fields such as program name, weekly frequency, membership dates, and status summary."
              value="student-program-summary"
              selected={exportType === "student-program-summary"}
              onSelect={setExportType}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Filters"
          description="Set student filters for the Excel export."
        >
          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <label
                htmlFor="students-export-status-filter"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#cbd5e1",
                }}
              >
                Student Status
              </label>

              <select
                id="students-export-status-filter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StudentStatusFilter)
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
                <option value="active">Active</option>
                <option value="hold">Hold</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  color: "#e2e8f0",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={includeParentContact}
                  onChange={(e) => setIncludeParentContact(e.target.checked)}
                />
                Include Parent Contact
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  color: "#e2e8f0",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={includeProgramSummary}
                  onChange={(e) => setIncludeProgramSummary(e.target.checked)}
                />
                Include Program Summary
              </label>
            </div>
          </div>
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
                Parent Contact
              </div>
              <div
                style={{
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {includeParentContact ? "Included" : "Excluded"}
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
                Program Summary
              </div>
              <div
                style={{
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {includeProgramSummary ? "Included" : "Excluded"}
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