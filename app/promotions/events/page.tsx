"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import EmptyState from "../../../components/ui/EmptyState";
import { supabase } from "../../../lib/supabase";
import { formatDate, formatMoney } from "../../../lib/format";

type TestingEventRow = {
  id: string;
  title: string;
  testing_date: string | null;
  location: string | null;
  status: string | null;
  testing_fee: number | null;
  notes: string | null;
  created_at: string;
};

type TestingEventStudentRow = {
  id: string;
  testing_event_id: string;
  result_status: string | null;
};

type EventWithCount = TestingEventRow & {
  participantCount: number;
  pendingCount: number;
  passedCount: number;
  failedCount: number;
};

type FilterStatus = "all" | "scheduled" | "completed" | "cancelled";

export default function PromotionEventsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [events, setEvents] = useState<TestingEventRow[]>([]);
  const [eventStudents, setEventStudents] = useState<TestingEventStudentRow[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [eventsRes, eventStudentsRes] = await Promise.all([
          supabase
            .from("testing_events")
            .select("id, title, testing_date, location, status, testing_fee, notes, created_at")
            .order("testing_date", { ascending: false })
            .limit(200),

          supabase
            .from("testing_event_students")
            .select("id, testing_event_id, result_status"),
        ]);

        if (!active) return;

        setEvents((eventsRes.error ? [] : eventsRes.data ?? []) as unknown as TestingEventRow[]);
        setEventStudents((eventStudentsRes.error ? [] : eventStudentsRes.data ?? []) as unknown as TestingEventStudentRow[]);
      } catch (err: any) {
        if (!active) return;
        setEvents([]);
        setEventStudents([]);
        setError(err?.message ?? "Failed to load testing events.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo<EventWithCount[]>(() => {
    return events.map((event) => {
      const rowsForEvent = eventStudents.filter(
        (row) => row.testing_event_id === event.id
      );

      const participantCount = rowsForEvent.length;
      const pendingCount = rowsForEvent.filter(
        (row) => !row.result_status || row.result_status === "pending"
      ).length;
      const passedCount = rowsForEvent.filter(
        (row) => row.result_status === "pass"
      ).length;
      const failedCount = rowsForEvent.filter(
        (row) => row.result_status === "fail"
      ).length;

      return {
        ...event,
        participantCount,
        pendingCount,
        passedCount,
        failedCount,
      };
    });
  }, [events, eventStudents]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesFilter = filter === "all" ? true : (row.status || "scheduled") === filter;
      const matchesSearch =
        q.length === 0
          ? true
          : row.title.toLowerCase().includes(q) ||
            (row.location || "").toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [rows, filter, search]);

  const summary = useMemo(() => {
    const scheduled = rows.filter((row) => (row.status || "scheduled") === "scheduled").length;
    const completed = rows.filter((row) => row.status === "completed").length;
    const cancelled = rows.filter((row) => row.status === "cancelled").length;
    const totalParticipants = rows.reduce((sum, row) => sum + row.participantCount, 0);

    return {
      totalEvents: rows.length,
      scheduled,
      completed,
      cancelled,
      totalParticipants,
    };
  }, [rows]);

  const breadcrumbStyle: CSSProperties = {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 12,
  };
  const breadcrumbLinkStyle: CSSProperties = {
    color: "#38bdf8",
    textDecoration: "none",
    fontWeight: 600,
  };

  return (
    <AppShell
      title="Testing Events"
      description="Manage scheduled testing events, results, and participation."
    >
      <div style={breadcrumbStyle}>
        <Link href="/promotions" style={breadcrumbLinkStyle}>
          ← Promotions
        </Link>
      </div>
      {loading ? (
        <LoadingBlock message="Loading testing events..." />
      ) : error ? (
        <ErrorBlock message={error} />
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <SummaryCard label="Total Events" value={String(summary.totalEvents)} />
            <SummaryCard label="Scheduled" value={String(summary.scheduled)} />
            <SummaryCard label="Completed" value={String(summary.completed)} />
            <SummaryCard label="Participants" value={String(summary.totalParticipants)} />
          </div>

          <PageCard title="Testing Event List">
            <div style={toolbarStyle}>
              <div style={toolbarLeftStyle}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title or location"
                  style={inputStyle}
                />

                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterStatus)}
                  style={selectStyle}
                >
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <Link href="/promotions/events/new" style={buttonStyle}>
                New Event
              </Link>
            </div>

            {filteredRows.length === 0 ? (
              <EmptyState
                title="No testing events found"
                description="Create a new event or adjust your filter."
              />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {filteredRows.map((event) => (
                  <div key={event.id} style={rowCardStyle}>
                    <div style={rowTopStyle}>
                      <div>
                        <div style={titleStyle}>{event.title}</div>
                        <div style={metaStyle}>
                          {event.testing_date ? formatDate(event.testing_date) : "No date"} ·{" "}
                          {event.location || "No location"}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={statusLabelStyle}>Status</div>
                        <div style={getStatusValueStyle(event.status || "scheduled")}>
                          {event.status || "scheduled"}
                        </div>
                      </div>
                    </div>

                    <div style={statsGridStyle}>
                      <MiniStat label="Fee" value={formatMoney(event.testing_fee ?? 0)} />
                      <MiniStat label="Participants" value={String(event.participantCount)} />
                      <MiniStat label="Pending" value={String(event.pendingCount)} />
                      <MiniStat label="Passed" value={String(event.passedCount)} />
                      <MiniStat label="Failed" value={String(event.failedCount)} />
                    </div>

                    {event.notes ? (
                      <div style={noteStyle}>
                        {event.notes}
                      </div>
                    ) : null}

                    <div style={actionRowStyle}>
                      <Link href={`/promotions/events/${event.id}`} style={buttonStyle}>
                        Open Event
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageCard>
        </div>
      )}
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 18,
        background: "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(15,23,42,0.78))",
        border: "1px solid rgba(148,163,184,0.18)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 30,
          fontWeight: 900,
          color: "#f8fafc",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(148,163,184,0.16)",
        borderRadius: 10,
        padding: 12,
        background: "rgba(15,23,42,0.35)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#94a3b8",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "#f8fafc",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function getStatusValueStyle(status: string): CSSProperties {
  if (status === "completed") {
    return {
      fontSize: 14,
      fontWeight: 700,
      color: "#22c55e",
      marginTop: 4,
    };
  }

  if (status === "cancelled") {
    return {
      fontSize: 14,
      fontWeight: 700,
      color: "#ef4444",
      marginTop: 4,
    };
  }

  return {
    fontSize: 14,
    fontWeight: 700,
    color: "#f59e0b",
    marginTop: 4,
  };
}

const toolbarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 16,
};

const toolbarLeftStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const inputStyle: CSSProperties = {
  minWidth: 260,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.2)",
  background: "#0f172a",
  color: "#f8fafc",
  outline: "none",
};

const selectStyle: CSSProperties = {
  minWidth: 180,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.2)",
  background: "#0f172a",
  color: "#f8fafc",
  outline: "none",
};

const rowCardStyle: CSSProperties = {
  border: "1px solid rgba(148,163,184,0.16)",
  borderRadius: 14,
  padding: 16,
  background: "rgba(15,23,42,0.4)",
};

const rowTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const titleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: "#f8fafc",
};

const metaStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 13,
  color: "#94a3b8",
};

const statusLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 10,
  marginTop: 14,
};

const noteStyle: CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 10,
  background: "rgba(2,6,23,0.45)",
  color: "#cbd5e1",
  fontSize: 13,
  lineHeight: 1.5,
  border: "1px solid rgba(148,163,184,0.12)",
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  marginTop: 14,
};

const buttonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: 10,
  textDecoration: "none",
  background: "#0f172a",
  color: "#f8fafc",
  border: "1px solid rgba(148,163,184,0.2)",
  fontSize: 13,
  fontWeight: 700,
};