"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "../../components/ui/AppShell";
import PageCard from "../../components/ui/PageCard";
import LoadingBlock from "../../components/ui/LoadingBlock";
import ErrorBlock from "../../components/ui/ErrorBlock";
import EmptyState from "../../components/ui/EmptyState";

type AttendanceRow = {
  id: string;
  student_id: string;
  checkin_date: string;
  checkin_time: string;
  checkin_source: string;
  checkin_type: string;
  warning_flags: string[] | null;
  students: {
    full_name: string | null;
  } | null;
  programs: {
    name: string | null;
  } | null;
};

const CHECKIN_TYPE_LABELS: Record<string, string> = {
  regular: "Regular",
  makeup: "Make-up",
  sparring: "Sparring",
  poomsae: "Poomsae",
  demonstration: "Demonstration",
};

function formatCheckinType(t: string | null | undefined): string {
  if (!t) return "-";
  const label = CHECKIN_TYPE_LABELS[t.toLowerCase()];
  return label || t;
}

export default function AttendancePage() {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchAttendance();
  }, []);

  async function fetchAttendance() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("limit", "100");

      const res = await fetch(`/api/attendance?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      let result = (json.rows ?? []) as AttendanceRow[];

      if (search.trim().length > 0) {
        result = result.filter((r) =>
          r.students?.full_name
            ?.toLowerCase()
            .includes(search.toLowerCase())
        );
      }

      setRows(result);
      setError(null);
    } catch (err: unknown) {
      setRows([]);
      setError(err instanceof Error ? err.message : "Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  }

  function formatTime(value: string) {
    const d = new Date(value);
    return d.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <AppShell
      title="Attendance Log"
      description="Search and review all student attendance records"
    >
      <div style={{ display: "grid", gap: 20 }}>
        {error ? (
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              border: "1px solid #7f1d1d",
              background: "rgba(239,68,68,0.12)",
              color: "#fecaca",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        ) : null}
        <PageCard title="Search Filters">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input
              placeholder="Student name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={inputStyle}
            />

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={inputStyle}
            />

            <button onClick={fetchAttendance} style={buttonStyle}>
              Search
            </button>
          </div>
        </PageCard>

        <PageCard title="Attendance Records">
          {loading ? (
            <LoadingBlock message="Loading attendance..." />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No attendance records"
              description="No attendance found with current filters."
            />
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Student</th>
                  <th>Program</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Warnings</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.checkin_date}</td>
                    <td>{formatTime(row.checkin_time)}</td>
                    <td>
                      <Link href={`/students/${row.student_id}`} style={{ color: "#93c5fd", fontWeight: 600, textDecoration: "none" }}>
                        {row.students?.full_name || "-"}
                      </Link>
                    </td>
                    <td>{row.programs?.name || "-"}</td>
                    <td>{formatCheckinType(row.checkin_type)}</td>
                    <td>{row.checkin_source}</td>
                    <td>
                      {row.warning_flags?.join(", ") || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </PageCard>
      </div>
    </AppShell>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#f8fafc",
  borderRadius: 8,
  padding: "10px 12px",
};

const buttonStyle: React.CSSProperties = {
  border: "none",
  background: "#22c55e",
  color: "#052e16",
  borderRadius: 8,
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};