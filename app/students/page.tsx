"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import AppShell from "../../components/ui/AppShell";
import { formatDate, formatDateTime } from "../../lib/format";

type SummaryRow = {
  total_students: number | null;
  active_students: number | null;
  hold_students: number | null;
  inactive_students: number | null;
  expiring_7_days: number | null;
};

type BeltRow = {
  id: string;
  name: string;
};

type StudentRow = {
  id: string;
  student_code: string | null;
  full_name: string;
  photo_url: string | null;
  parent_name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  join_date: string | null;
  last_checkin_at: string | null;
  current_belt_id: string | null;
  active: boolean;
  display_order: number | null;
  current_belt: {
    name: string | null;
  } | null;
};

type ActiveContractRow = {
  student_contract_id: string;
  student_id: string;
  program_id: string | null;
  program_name: string | null;
  membership_duration_id: string | null;
  membership_duration_name: string | null;
  weekly_frequency_option_id: string | null;
  weekly_frequency_label: string | null;
  weekly_frequency_value: number | null;
  contract_type: string | null;
  contract_status: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_fee: number | null;
  tuition_fee: number | null;
  discount_type_id: string | null;
  discount_type_name: string | null;
  discount_mode: string | null;
  discount_scope: string | null;
  discount_value: number | null;
  final_tuition_fee: number | null;
  pricing_snapshot: unknown;
  note: string | null;
  days_remaining: number | null;
};

type ExpiringRow = {
  student_id: string;
};

type StudentListItem = {
  id: string;
  studentCode: string | null;
  fullName: string;
  photoUrl: string | null;
  parentName: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  joinDate: string | null;
  lastCheckinAt: string | null;
  beltId: string | null;
  beltName: string | null;
  displayOrder: number;
  activeContracts: ActiveContractRow[];
  isExpiringSoon: boolean;
};

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "hold", label: "Hold" },
  { value: "inactive", label: "Inactive" },
];

function getStatusBadgeStyle(status: string): CSSProperties {
  if (status === "active") {
    return {
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #86efac",
    };
  }

  if (status === "hold") {
    return {
      background: "#fef3c7",
      color: "#92400e",
      border: "1px solid #fcd34d",
    };
  }

  return {
    background: "#e5e7eb",
    color: "#374151",
    border: "1px solid #d1d5db",
  };
}

function getDaysRemainingTone(days: number | null) {
  if (days === null) {
    return { color: "#6b7280", label: "-" };
  }

  if (days < 0) {
    return { color: "#dc2626", label: `${Math.abs(days)} days overdue` };
  }

  if (days <= 7) {
    return { color: "#d97706", label: `${days} days left` };
  }

  return { color: "#2563eb", label: `${days} days left` };
}

function buildContractSummary(contracts: ActiveContractRow[]) {
  if (!contracts.length) {
    return {
      programText: "-",
      frequencyText: "-",
      startDate: null as string | null,
      endDate: null as string | null,
      daysRemaining: null as number | null,
    };
  }

  const sorted = [...contracts].sort((a, b) => {
    const aDate = a.start_date ?? "";
    const bDate = b.start_date ?? "";
    return aDate.localeCompare(bDate);
  });

  const first = sorted[0];

  const programNames = sorted
    .map((item) => item.program_name)
    .filter((value): value is string => Boolean(value));

  const frequencyLabels = sorted
    .map((item) => item.weekly_frequency_label)
    .filter((value): value is string => Boolean(value));

  const endDates = sorted
    .map((item) => item.end_date)
    .filter((value): value is string => Boolean(value));

  const daysRemainingList = sorted
    .map((item) => item.days_remaining)
    .filter((value): value is number => typeof value === "number");

  const earliestEndDate =
    endDates.length > 0 ? [...endDates].sort((a, b) => a.localeCompare(b))[0] : null;

  const shortestDaysRemaining =
    daysRemainingList.length > 0 ? Math.min(...daysRemainingList) : null;

  return {
    programText: programNames.length ? programNames.join(", ") : "-",
    frequencyText: frequencyLabels.length ? frequencyLabels.join(", ") : "-",
    startDate: first.start_date ?? null,
    endDate: earliestEndDate,
    daysRemaining: shortestDaysRemaining,
  };
}

const CACHE_MS = 20_000; // 20초 동안 캐시 사용
let listCache: {
  data: {
    summary: SummaryRow | null;
    students: StudentRow[];
    contracts: ActiveContractRow[];
    expiringRows: ExpiringRow[];
    belts: BeltRow[];
  };
  at: number;
} | null = null;

export default function StudentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<SummaryRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [contracts, setContracts] = useState<ActiveContractRow[]>([]);
  const [expiringRows, setExpiringRows] = useState<ExpiringRow[]>([]);
  const [belts, setBelts] = useState<BeltRow[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [beltFilter, setBeltFilter] = useState("all");

  // Single consumer of GET /api/students. Expected: { summary, students, contracts, expiringRows, belts, loadError? }
  async function loadData() {
    const now = Date.now();
    const hit = listCache && now - listCache.at < CACHE_MS;
    if (hit) {
      setSummary(listCache!.data.summary);
      setStudents(listCache!.data.students);
      setContracts(listCache!.data.contracts);
      setExpiringRows(listCache!.data.expiringRows);
      setBelts(listCache!.data.belts);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch("/api/students");
      const data = await res.json().catch(() => ({}));
      const payload = {
        summary: data.summary ?? null,
        students: Array.isArray(data.students) ? (data.students as StudentRow[]) : [],
        contracts: Array.isArray(data.contracts) ? (data.contracts as ActiveContractRow[]) : [],
        expiringRows: Array.isArray(data.expiringRows) ? (data.expiringRows as ExpiringRow[]) : [],
        belts: Array.isArray(data.belts) ? (data.belts as BeltRow[]) : [],
      };
      listCache = { data: payload, at: Date.now() };
      setSummary(payload.summary);
      setStudents(payload.students);
      setContracts(payload.contracts);
      setExpiringRows(payload.expiringRows);
      setBelts(payload.belts);
      const apiError = (data as { loadError?: string }).loadError;
      if (apiError) setError(`데이터 연동 오류: ${apiError}`);
      else if (!res.ok) setError("Failed to load students data.");
    } catch (err) {
      console.error(err);
      setError("Failed to load students data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const expiringSet = useMemo(() => {
    return new Set(expiringRows.map((item) => item.student_id));
  }, [expiringRows]);

  const contractMap = useMemo(() => {
    const map = new Map<string, ActiveContractRow[]>();
    for (const contract of contracts) {
      const sid = contract.student_id;
      if (!sid) continue;
      const current = map.get(sid) ?? [];
      current.push(contract);
      map.set(sid, current);
    }
    return map;
  }, [contracts]);

  const processedStudents = useMemo<StudentListItem[]>(() => {
    return students.map((student) => ({
      id: student.id,
      studentCode: student.student_code,
      fullName: student.full_name,
      photoUrl: student.photo_url,
      parentName: student.parent_name,
      phone: student.phone,
      email: student.email,
      status: student.status,
      joinDate: student.join_date,
      lastCheckinAt: student.last_checkin_at,
      beltId: student.current_belt_id,
      beltName: student.current_belt?.name ?? null,
      displayOrder: student.display_order ?? 0,
      activeContracts: contractMap.get(student.id) ?? [],
      isExpiringSoon: expiringSet.has(student.id),
    }));
  }, [students, contractMap, expiringSet]);

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return processedStudents.filter((student) => {
      if (statusFilter !== "all" && student.status !== statusFilter) {
        return false;
      }

      if (beltFilter !== "all" && student.beltId !== beltFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const haystack = [
        student.studentCode ?? "",
        student.fullName ?? "",
        student.parentName ?? "",
        student.phone ?? "",
        student.email ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [processedStudents, search, statusFilter, beltFilter]);

  return (
    <AppShell
      title="Students"
      description="Student hub list for current status, membership summary, and expiring alerts."
    >
      <div style={{ display: "grid", gap: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/students/new"
            style={{
              textDecoration: "none",
              padding: "10px 14px",
              borderRadius: 10,
              background: "#111827",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            New Student
          </Link>
        </div>

        {loading ? (
          <div style={cardStyle}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e5e7eb" }}>
              Loading students...
            </div>
          </div>
        ) : error ? (
          <div
            style={{
              ...cardStyle,
              border: "1px solid #7f1d1d",
              background: "rgba(127,29,29,0.25)",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fecaca" }}>
              Students load error
            </div>
            <div style={{ marginTop: 8, color: "#fecaca", fontSize: 14 }}>{error}</div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              <div style={cardStyle}>
                <div style={summaryLabelStyle}>Total Students</div>
                <div style={{ ...summaryValueStyle, color: "#111827" }}>
                  {summary?.total_students ?? 0}
                </div>
              </div>

              <div style={cardStyle}>
                <div style={summaryLabelStyle}>Active Students</div>
                <div style={{ ...summaryValueStyle, color: "#166534" }}>
                  {summary?.active_students ?? 0}
                </div>
              </div>

              <div style={cardStyle}>
                <div style={summaryLabelStyle}>Hold Students</div>
                <div style={{ ...summaryValueStyle, color: "#92400e" }}>
                  {summary?.hold_students ?? 0}
                </div>
              </div>

              <div style={cardStyle}>
                <div style={summaryLabelStyle}>Inactive Students</div>
                <div style={{ ...summaryValueStyle, color: "#374151" }}>
                  {summary?.inactive_students ?? 0}
                </div>
              </div>

              <div style={cardStyle}>
                <div style={summaryLabelStyle}>Expiring Soon (7 Days)</div>
                <div style={{ ...summaryValueStyle, color: "#d97706" }}>
                  {summary?.expiring_7_days ?? 0}
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label style={labelStyle}>Search</label>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Student Name / Parent Name / Phone / Email / Student ID"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={inputStyle}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Current Belt</label>
                  <select
                    value={beltFilter}
                    onChange={(e) => setBeltFilter(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="all">All Belts</option>
                    {belts.map((belt) => (
                      <option key={belt.id} value={belt.id}>
                        {belt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 17,
                      fontWeight: 800,
                      color: "#e5e7eb",
                    }}
                  >
                    Students List
                  </h2>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: 13,
                      color: "#94a3b8",
                    }}
                  >
                    {filteredStudents.length} student
                    {filteredStudents.length === 1 ? "" : "s"} found
                  </p>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div
                  style={{
                    border: "1px dashed #d1d5db",
                    borderRadius: 12,
                    padding: 24,
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: 14,
                  }}
                >
                  No students found. Try changing search keywords or filters.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: 1200,
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: "1px solid #e5e7eb",
                          textAlign: "left",
                        }}
                      >
                        <th style={thStyle}>Photo</th>
                        <th style={thStyle}>Student ID</th>
                        <th style={thStyle}>Student Name</th>
                        <th style={thStyle}>Parent Name</th>
                        <th style={thStyle}>Phone Number</th>
                        <th style={thStyle}>Current Belt</th>
                        <th style={thStyle}>Program</th>
                        <th style={thStyle}>Weekly Frequency</th>
                        <th style={thStyle}>Start Date</th>
                        <th style={thStyle}>End Date</th>
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}>Last Check-in</th>
                        <th style={thStyle}>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredStudents.map((student) => {
                        const contractSummary = buildContractSummary(student.activeContracts);
                        const statusStyle = getStatusBadgeStyle(student.status);
                        const daysTone = getDaysRemainingTone(contractSummary.daysRemaining);

                        return (
                          <tr
                            key={student.id}
                            style={{
                              borderBottom: "1px solid #f3f4f6",
                              verticalAlign: "top",
                            }}
                          >
                            <td style={tdStyle}>
                              <div
                                style={{
                                  width: 52,
                                  height: 52,
                                  borderRadius: 12,
                                  overflow: "hidden",
                                  background: "#020617",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#9ca3af",
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                {student.photoUrl ? (
                                  <img
                                    src={student.photoUrl}
                                    alt={student.fullName}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : (
                                  "No Photo"
                                )}
                              </div>
                            </td>

                            <td style={tdStyle}>
                              <div style={{ fontWeight: 700, color: "#e5e7eb" }}>
                                {student.studentCode || "-"}
                              </div>
                            </td>

                            <td style={tdStyle}>
                              <div style={{ fontWeight: 800, color: "#f9fafb" }}>
                                {student.fullName}
                              </div>

                              {student.isExpiringSoon && (
                                <div
                                  style={{
                                    marginTop: 8,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "4px 8px",
                                    borderRadius: 999,
                                    background: "#fff7ed",
                                    color: "#c2410c",
                                    border: "1px solid #fdba74",
                                    fontSize: 12,
                                    fontWeight: 700,
                                  }}
                                >
                                  Expiring Soon
                                </div>
                              )}
                            </td>

                            <td style={tdStyle}>{student.parentName || "-"}</td>
                            <td style={tdStyle}>{student.phone || "-"}</td>
                            <td style={tdStyle}>{student.beltName || "-"}</td>

                            <td style={tdStyle}>
                              <div style={{ color: "#111827", fontWeight: 600 }}>
                                {contractSummary.programText}
                              </div>
                            </td>

                            <td style={tdStyle}>{contractSummary.frequencyText}</td>

                            <td style={tdStyle}>
                              {contractSummary.startDate
                                ? formatDate(contractSummary.startDate)
                                : "-"}
                            </td>

                            <td style={tdStyle}>
                              <div>
                                {contractSummary.endDate
                                  ? formatDate(contractSummary.endDate)
                                  : "-"}
                              </div>

                              {contractSummary.daysRemaining !== null && (
                                <div
                                  style={{
                                    marginTop: 6,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: daysTone.color,
                                  }}
                                >
                                  {daysTone.label}
                                </div>
                              )}
                            </td>

                            <td style={tdStyle}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "6px 10px",
                                  borderRadius: 999,
                                  fontSize: 12,
                                  fontWeight: 800,
                                  textTransform: "capitalize",
                                  ...statusStyle,
                                }}
                              >
                                {student.status}
                              </span>
                            </td>

                            <td style={tdStyle}>
                              {student.lastCheckinAt
                                ? formatDateTime(student.lastCheckinAt)
                                : "-"}
                            </td>

                            <td style={tdStyle}>
                              <Link
                                href={`/students/${student.id}`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "8px 12px",
                                  borderRadius: 10,
                                  background: "#eff6ff",
                                  color: "#1d4ed8",
                                  textDecoration: "none",
                                  fontWeight: 700,
                                  fontSize: 13,
                                  border: "1px solid #bfdbfe",
                                }}
                              >
                                Detail
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

const cardStyle: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 4px 18px rgba(0,0,0,0.35)",
};

const summaryLabelStyle: CSSProperties = {
  fontSize: 13,
  color: "#94a3b8",
};

const summaryValueStyle: CSSProperties = {
  marginTop: 8,
  fontSize: 20,
  fontWeight: 700,
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 700,
  color: "#cbd5f5",
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 10,
  border: "1px solid #334155",
  padding: "0 12px",
  fontSize: 14,
  color: "#e5e7eb",
  background: "#020617",
};

const thStyle: CSSProperties = {
  padding: "12px 10px",
  fontSize: 12,
  color: "#94a3b8",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "14px 10px",
  fontSize: 14,
  color: "#e5e7eb",
  whiteSpace: "nowrap",
};