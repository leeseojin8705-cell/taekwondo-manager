"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/ui/AppShell";
import PageCard from "../../components/ui/PageCard";
import LoadingBlock from "../../components/ui/LoadingBlock";
import ErrorBlock from "../../components/ui/ErrorBlock";
import EmptyState from "../../components/ui/EmptyState";
import { supabase } from "../../lib/supabase";

type ClassRow = {
  id: string;
  name: string | null;
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
  instructor_name: string | null;
  max_students: number | null;
  display_order: number | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

function formatTime(value: string | null) {
  if (!value) return "-";

  const parts = value.split(":");
  const hour = Number(parts[0]);
  const minute = parts[1] ?? "00";

  if (Number.isNaN(hour)) return value;

  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return `${hour12}:${minute} ${period}`;
}

function formatDay(value: string | null) {
  if (!value) return "-";

  const map: Record<string, string> = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
  };

  return map[value.toLowerCase()] ?? value;
}

export default function ClassesPage() {
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchClasses() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("classes")
        .select(
          `
            id,
            name,
            day_of_week,
            start_time,
            end_time,
            instructor_name,
            max_students,
            display_order,
            active,
            created_at,
            updated_at
          `
        )
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (!isMounted) return;

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as ClassRow[]);
      }

      setLoading(false);
    }

    fetchClasses();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    if (!q) return rows;

    return rows.filter((row) => {
      return (
        (row.name ?? "").toLowerCase().includes(q) ||
        (row.day_of_week ?? "").toLowerCase().includes(q) ||
        (row.instructor_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, keyword]);

  const summary = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((row) => row.active !== false).length;
    const inactive = rows.filter((row) => row.active === false).length;
    const totalCapacity = rows.reduce(
      (sum, row) => sum + (row.max_students ?? 0),
      0
    );

    return {
      total,
      active,
      inactive,
      totalCapacity,
    };
  }, [rows]);

  return (
    <AppShell title="Classes">
      <div
        style={{
          display: "grid",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 800,
                color: "#f9fafb",
              }}
            >
              Classes
            </h1>
            <p
              style={{
                marginTop: 8,
                marginBottom: 0,
                color: "#9ca3af",
                fontSize: 14,
              }}
            >
              Manage class schedule, instructor, and capacity.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/"
              style={{
                textDecoration: "none",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #374151",
                color: "#e5e7eb",
                background: "#111827",
                fontWeight: 600,
              }}
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <PageCard title="Total Classes">
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#f9fafb",
              }}
            >
              {summary.total}
            </div>
          </PageCard>

          <PageCard title="Active Classes">
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#22c55e",
              }}
            >
              {summary.active}
            </div>
          </PageCard>

          <PageCard title="Inactive Classes">
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#f87171",
              }}
            >
              {summary.inactive}
            </div>
          </PageCard>

          <PageCard title="Total Capacity">
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#60a5fa",
              }}
            >
              {summary.totalCapacity}
            </div>
          </PageCard>
        </div>

        <PageCard
          title="Class List"
          subtitle="View all classes sorted by display order."
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by class, day, instructor"
              style={{
                width: "100%",
                maxWidth: 360,
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #374151",
                background: "#0f172a",
                color: "#f9fafb",
                outline: "none",
              }}
            />
          </div>

          {loading ? (
            <LoadingBlock message="Loading classes..." />
          ) : error ? (
            <ErrorBlock message={error} />
          ) : filteredRows.length === 0 ? (
            <EmptyState
              title="No classes found"
              description="There is no class data yet or no result matches your search."
            />
          ) : (
            <div
              style={{
                overflowX: "auto",
                border: "1px solid #1f2937",
                borderRadius: 14,
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 980,
                  background: "#0b1220",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#111827",
                      borderBottom: "1px solid #1f2937",
                    }}
                  >
                    {[
                      "Order",
                      "Class Name",
                      "Day",
                      "Time",
                      "Instructor",
                      "Max Students",
                      "Status",
                    ].map((label) => (
                      <th
                        key={label}
                        style={{
                          textAlign: "left",
                          padding: "14px 16px",
                          fontSize: 13,
                          color: "#9ca3af",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row) => {
                    const active = row.active !== false;

                    return (
                      <tr
                        key={row.id}
                        style={{
                          borderBottom: "1px solid #1f2937",
                        }}
                      >
                        <td
                          style={{
                            padding: "14px 16px",
                            color: "#e5e7eb",
                          }}
                        >
                          {row.display_order ?? 0}
                        </td>

                        <td
                          style={{
                            padding: "14px 16px",
                            color: "#f9fafb",
                            fontWeight: 700,
                          }}
                        >
                          {row.name ?? "-"}
                        </td>

                        <td
                          style={{
                            padding: "14px 16px",
                            color: "#e5e7eb",
                          }}
                        >
                          {formatDay(row.day_of_week)}
                        </td>

                        <td
                          style={{
                            padding: "14px 16px",
                            color: "#e5e7eb",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatTime(row.start_time)} - {formatTime(row.end_time)}
                        </td>

                        <td
                          style={{
                            padding: "14px 16px",
                            color: "#e5e7eb",
                          }}
                        >
                          {row.instructor_name ?? "-"}
                        </td>

                        <td
                          style={{
                            padding: "14px 16px",
                            color: "#e5e7eb",
                          }}
                        >
                          {row.max_students ?? 0}
                        </td>

                        <td
                          style={{
                            padding: "14px 16px",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "6px 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 700,
                              background: active
                                ? "rgba(34,197,94,0.15)"
                                : "rgba(239,68,68,0.15)",
                              color: active ? "#4ade80" : "#f87171",
                              border: active
                                ? "1px solid rgba(34,197,94,0.35)"
                                : "1px solid rgba(239,68,68,0.35)",
                            }}
                          >
                            {active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PageCard>
      </div>
    </AppShell>
  );
}