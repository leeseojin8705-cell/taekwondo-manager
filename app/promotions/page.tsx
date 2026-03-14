"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import AppShell from "../../components/ui/AppShell";
import PageCard from "../../components/ui/PageCard";
import LoadingBlock from "../../components/ui/LoadingBlock";
import ErrorBlock from "../../components/ui/ErrorBlock";
import EmptyState from "../../components/ui/EmptyState";
import { supabase } from "../../lib/supabase";
import { formatDate, formatDateTime, formatMoney } from "../../lib/format";

type TestingEventRow = {
  id: string;
  title: string;
  testing_date: string | null;
  location: string | null;
  status: string | null;
  testing_fee: number | null;
  created_at: string;
};

type TestingEventStudentRow = {
  id: string;
  testing_event_id: string;
  student_id: string;
  result_status: string | null;
  created_at: string;
};

type PromotionHistoryRow = {
  id: string;
  student_id: string;
  testing_event_id: string | null;
  promoted_at: string | null;
  created_at: string;
  students: {
    name: string | null;
  } | null;
  from_belt: {
    name: string | null;
  } | null;
  to_belt: {
    name: string | null;
  } | null;
};

type SummaryState = {
  totalEvents: number;
  upcomingEvents: number;
  pendingResults: number;
  thisMonthPromotions: number;
};

export default function PromotionsHomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [events, setEvents] = useState<TestingEventRow[]>([]);
  const [eventStudents, setEventStudents] = useState<TestingEventStudentRow[]>([]);
  const [promotions, setPromotions] = useState<PromotionHistoryRow[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [eventsRes, eventStudentsRes, promotionsRes] = await Promise.all([
          supabase
            .from("testing_events")
            .select("id, title, testing_date, location, status, testing_fee, created_at")
            .order("testing_date", { ascending: false })
            .limit(20),

          supabase
            .from("testing_event_students")
            .select("id, testing_event_id, student_id, result_status, created_at")
            .order("created_at", { ascending: false }),

          supabase
            .from("promotion_histories")
            .select(`
              id,
              student_id,
              testing_event_id,
              promoted_at,
              created_at,
              students:student_id ( name ),
              from_belt:from_belt_id ( name ),
              to_belt:to_belt_id ( name )
            `)
            .order("promoted_at", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        if (!active) return;

        setEvents((eventsRes.error ? [] : eventsRes.data ?? []) as unknown as TestingEventRow[]);
        setEventStudents((eventStudentsRes.error ? [] : eventStudentsRes.data ?? []) as unknown as TestingEventStudentRow[]);
        setPromotions((promotionsRes.error ? [] : promotionsRes.data ?? []) as unknown as PromotionHistoryRow[]);
      } catch (err: any) {
        if (!active) return;
        setEvents([]);
        setEventStudents([]);
        setPromotions([]);
        setError(err?.message ?? "Failed to load promotions data.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo<SummaryState>(() => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const totalEvents = events.length;

    const upcomingEvents = events.filter((event) => {
      if (!event.testing_date) return false;
      const eventDate = new Date(event.testing_date);
      return eventDate >= startOfToday && event.status !== "cancelled";
    }).length;

    const pendingResults = eventStudents.filter(
      (row) => !row.result_status || row.result_status === "pending"
    ).length;

    const thisMonthPromotions = promotions.filter((row) => {
      const targetDate = row.promoted_at ?? row.created_at;
      if (!targetDate) return false;
      const date = new Date(targetDate);
      return date >= startOfMonth && date < endOfMonth;
    }).length;

    return {
      totalEvents,
      upcomingEvents,
      pendingResults,
      thisMonthPromotions,
    };
  }, [events, eventStudents, promotions]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    return [...events]
      .filter((event) => {
        if (!event.testing_date) return false;
        const eventDate = new Date(event.testing_date);
        return eventDate >= startOfToday && event.status !== "cancelled";
      })
      .sort((a, b) => {
        const aTime = a.testing_date ? new Date(a.testing_date).getTime() : 0;
        const bTime = b.testing_date ? new Date(b.testing_date).getTime() : 0;
        return aTime - bTime;
      })
      .slice(0, 5);
  }, [events]);

  const recentPromotions = useMemo(() => {
    return [...promotions].slice(0, 8);
  }, [promotions]);

  return (
    <AppShell
      title="Promotions / Testing"
      description="Testing events, results, and promotion history."
    >
      {loading ? (
        <LoadingBlock message="Loading promotions dashboard..." />
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
            <SummaryCard label="Upcoming Events" value={String(summary.upcomingEvents)} />
            <SummaryCard label="Pending Results" value={String(summary.pendingResults)} />
            <SummaryCard
              label="This Month Promotions"
              value={String(summary.thisMonthPromotions)}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            <PageCard title="Upcoming Testing Events">
              <div style={cardHeaderRowStyle}>
                <div style={helperTextStyle}>
                  Scheduled events ready for result entry and promotion flow.
                </div>
                <Link href="/promotions/events" style={linkStyle}>
                  View all
                </Link>
              </div>

              {upcomingEvents.length === 0 ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <EmptyState
                    title="No upcoming testing events"
                    description="Create a testing event to start managing promotions."
                  />
                  <div>
                    <Link href="/promotions/events/new" style={buttonStyle}>
                      Create Event
                    </Link>
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      style={{
                        border: "1px solid rgba(148,163,184,0.2)",
                        borderRadius: 12,
                        padding: 14,
                        background: "rgba(15,23,42,0.45)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 700,
                              color: "#f8fafc",
                            }}
                          >
                            {event.title}
                          </div>
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 13,
                              color: "#94a3b8",
                            }}
                          >
                            {event.testing_date ? formatDate(event.testing_date) : "No date"} ·{" "}
                            {event.location || "No location"}
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            Status
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#22c55e",
                            }}
                          >
                            {event.status || "scheduled"}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ fontSize: 13, color: "#cbd5e1" }}>
                          Fee: {formatMoney(event.testing_fee ?? 0)}
                        </div>

                        <Link href={`/promotions/events/${event.id}`} style={buttonStyle}>
                          Open Event
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PageCard>

            <PageCard title="Quick Actions">
              <div style={{ display: "grid", gap: 12 }}>
                <ActionLink
                  href="/promotions/events/new"
                  title="Create Testing Event"
                  description="Schedule a new testing date and set fee details."
                />
                <ActionLink
                  href="/promotions/events"
                  title="Manage Event Results"
                  description="Review participants and update pass / fail results."
                />
                <ActionLink
                  href="/promotions/history"
                  title="Promotion History"
                  description="Check belt movement history and recent promotions."
                />
                <ActionLink
                  href="/settings/testing"
                  title="Testing Settings"
                  description="Manage testing types, defaults, and rules."
                />
              </div>
            </PageCard>
          </div>

<div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          <PageCard title="Recent Promotions">
              <div style={cardHeaderRowStyle}>
                <div style={helperTextStyle}>Latest confirmed belt changes.</div>
                <Link href="/promotions/history" style={linkStyle}>
                  View history
                </Link>
              </div>

              {recentPromotions.length === 0 ? (
                <EmptyState
                  title="No promotion history yet"
                  description="Once testing results are confirmed, promotion history will appear here."
                />
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {recentPromotions.map((row) => (
                    <div
                      key={row.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.4fr 1fr auto",
                        gap: 12,
                        alignItems: "center",
                        padding: "10px 0",
                        borderBottom: "1px solid rgba(148,163,184,0.15)",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: "#f8fafc",
                          }}
                        >
                          {row.students?.name || "Unknown Student"}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 13,
                            color: "#94a3b8",
                          }}
                        >
                          {row.from_belt?.name || "Unknown"} → {row.to_belt?.name || "Unknown"}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          color: "#cbd5e1",
                        }}
                      >
                        {row.promoted_at
                          ? formatDate(row.promoted_at)
                          : formatDateTime(row.created_at)}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#22c55e",
                        }}
                      >
                        PROMOTED
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PageCard>

            <PageCard
              title="What comes next"
              subtitle="Recommended implementation order for this category."
            >
              <div style={{ display: "grid", gap: 10 }}>
                <RoadmapRow
                  step="1"
                  title="Events List"
                  description="Build the full testing event list page with status filters."
                />
                <RoadmapRow
                  step="2"
                  title="New Event"
                  description="Create event form with date, fee, type, and location."
                />
                <RoadmapRow
                  step="3"
                  title="Event Detail"
                  description="Attach students, enter results, and confirm promotion."
                />
                <RoadmapRow
                  step="4"
                  title="Promotion History"
                  description="Show final history and student belt movement records."
                />
                <RoadmapRow
                  step="5"
                  title="Finance Integration"
                  description="Connect testing fee to invoice and payment flow."
                />
              </div>
            </PageCard>
          </div>
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

function ActionLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={href}
      style={{
        display: "block",
        textDecoration: "none",
        border: "1px solid rgba(148,163,184,0.18)",
        borderRadius: 12,
        padding: 14,
        background: hover ? "rgba(30,41,59,0.7)" : "rgba(15,23,42,0.4)",
        cursor: "pointer",
        transition: "background 0.15s ease, border-color 0.15s ease",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        style={{
          color: "#f8fafc",
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 6,
          color: "#94a3b8",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
    </Link>
  );
}

function RoadmapRow({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "44px 1fr",
        gap: 12,
        alignItems: "start",
        border: "1px solid rgba(148,163,184,0.14)",
        borderRadius: 12,
        padding: 12,
        background: "rgba(15,23,42,0.35)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(34,197,94,0.16)",
          color: "#22c55e",
          fontWeight: 800,
        }}
      >
        {step}
      </div>

      <div>
        <div
          style={{
            color: "#f8fafc",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 4,
            color: "#94a3b8",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}

const helperTextStyle: CSSProperties = {
  fontSize: 13,
  color: "#94a3b8",
};

const cardHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 14,
};

const linkStyle: CSSProperties = {
  color: "#38bdf8",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 14,
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