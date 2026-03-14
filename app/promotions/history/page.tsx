"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import EmptyState from "../../../components/ui/EmptyState";
import { supabase } from "../../../lib/supabase";
import { formatDate, formatDateTime } from "../../../lib/format";

type PromotionHistoryRow = {
  id: string;
  student_id: string;
  testing_event_id: string | null;
  from_belt_id: string | null;
  to_belt_id: string | null;
  promoted_at: string | null;
  created_at: string;
  students: {
    name: string | null;
    status: string | null;
    classes: {
      name: string | null;
    } | null;
  } | null;
  testing_events: {
    title: string | null;
    testing_date: string | null;
    status: string | null;
  } | null;
  from_belt: {
    name: string | null;
  } | null;
  to_belt: {
    name: string | null;
  } | null;
};

type FilterMode = "all" | "with-event" | "manual";

export default function PromotionHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<PromotionHistoryRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await supabase
          .from("promotion_histories")
          .select(`
            id,
            student_id,
            testing_event_id,
            from_belt_id,
            to_belt_id,
            promoted_at,
            created_at,
            students:student_id (
              name,
              status,
              classes:class_id ( name )
            ),
            testing_events:testing_event_id (
              title,
              testing_date,
              status
            ),
            from_belt:from_belt_id ( name ),
            to_belt:to_belt_id ( name )
          `)
          .order("promoted_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(500);

        if (!active) return;

        setRows((res.error ? [] : res.data ?? []) as unknown as PromotionHistoryRow[]);
      } catch (err: any) {
        if (!active) return;
        setRows([]);
        setError(err?.message ?? "Failed to load promotion history.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const studentName = row.students?.name?.toLowerCase() ?? "";
      const className = row.students?.classes?.name?.toLowerCase() ?? "";
      const eventTitle = row.testing_events?.title?.toLowerCase() ?? "";
      const fromBelt = row.from_belt?.name?.toLowerCase() ?? "";
      const toBelt = row.to_belt?.name?.toLowerCase() ?? "";

      const matchesSearch =
        q.length === 0
          ? true
          : studentName.includes(q) ||
            className.includes(q) ||
            eventTitle.includes(q) ||
            fromBelt.includes(q) ||
            toBelt.includes(q);

      const matchesMode =
        filterMode === "all"
          ? true
          : filterMode === "with-event"
          ? !!row.testing_event_id
          : !row.testing_event_id;

      return matchesSearch && matchesMode;
    });
  }, [rows, search, filterMode]);

  const summary = useMemo(() => {
    const total = rows.length;
    const withEvent = rows.filter((row) => !!row.testing_event_id).length;
    const manual = rows.filter((row) => !row.testing_event_id).length;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const thisMonth = rows.filter((row) => {
      const raw = row.promoted_at ?? row.created_at;
      if (!raw) return false;
      const d = new Date(raw);
      return d >= startOfMonth && d < endOfMonth;
    }).length;

    return {
      total,
      withEvent,
      manual,
      thisMonth,
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
      title="Promotion History"
      description="Review belt movement history by student, event, and date."
    >
      <div style={breadcrumbStyle}>
        <Link href="/promotions" style={breadcrumbLinkStyle}>
          ← Promotions
        </Link>
      </div>
      {loading ? (
        <LoadingBlock message="Loading promotion history..." />
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
            <SummaryCard label="Total Records" value={String(summary.total)} />
            <SummaryCard label="This Month" value={String(summary.thisMonth)} />
            <SummaryCard label="Testing Event Records" value={String(summary.withEvent)} />
            <SummaryCard label="Manual Records" value={String(summary.manual)} />
          </div>

          <PageCard title="Promotion History List">
            <div style={toolbarStyle}>
              <div style={toolbarLeftStyle}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search student, class, belt, or event"
                  style={inputStyle}
                />

                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value as FilterMode)}
                  style={selectStyle}
                >
                  <option value="all">All Records</option>
                  <option value="with-event">With Testing Event</option>
                  <option value="manual">Manual Only</option>
                </select>
              </div>

              <div style={toolbarRightStyle}>
                <Link href="/promotions/events" style={secondaryButtonStyle}>
                  Testing Events
                </Link>
              </div>
            </div>

            {filteredRows.length === 0 ? (
              <EmptyState
                title="No promotion history found"
                description="There are no records that match your current search or filter."
              />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {filteredRows.map((row) => {
                  const promotedDate = row.promoted_at ?? row.created_at;

                  return (
                    <div key={row.id} style={historyCardStyle}>
                      <div style={historyTopStyle}>
                        <div>
                          <div style={studentNameStyle}>
                            {row.students?.name || "Unknown Student"}
                          </div>
                          <div style={studentMetaStyle}>
                            {row.students?.classes?.name || "No class"} ·{" "}
                            {row.students?.status || "unknown"}
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={miniLabelStyle}>Promoted Date</div>
                          <div style={promotedDateStyle}>
                            {row.promoted_at
                              ? formatDate(row.promoted_at)
                              : formatDateTime(row.created_at)}
                          </div>
                        </div>
                      </div>

                      <div style={beltFlowBoxStyle}>
                        <div style={beltFlowLabelStyle}>Belt Change</div>
                        <div style={beltFlowValueStyle}>
                          {row.from_belt?.name || "No previous belt"} →{" "}
                          {row.to_belt?.name || "No next belt"}
                        </div>
                      </div>

                      <div style={detailGridStyle}>
                        <MiniInfoBox
                          label="Source"
                          value={row.testing_event_id ? "Testing Event" : "Manual"}
                        />
                        <MiniInfoBox
                          label="Event"
                          value={row.testing_events?.title || "No linked event"}
                        />
                        <MiniInfoBox
                          label="Event Date"
                          value={
                            row.testing_events?.testing_date
                              ? formatDate(row.testing_events.testing_date)
                              : "No event date"
                          }
                        />
                        <MiniInfoBox
                          label="Event Status"
                          value={row.testing_events?.status || "No event"}
                        />
                      </div>
                    </div>
                  );
                })}
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

function MiniInfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={miniInfoBoxStyle}>
      <div style={miniLabelStyle}>{label}</div>
      <div style={miniValueStyle}>{value}</div>
    </div>
  );
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

const toolbarRightStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const inputStyle: CSSProperties = {
  minWidth: 280,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.2)",
  background: "#0f172a",
  color: "#f8fafc",
  outline: "none",
};

const selectStyle: CSSProperties = {
  minWidth: 190,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.2)",
  background: "#0f172a",
  color: "#f8fafc",
  outline: "none",
};

const secondaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: 10,
  textDecoration: "none",
  border: "1px solid rgba(148,163,184,0.22)",
  background: "#0f172a",
  color: "#f8fafc",
  fontSize: 13,
  fontWeight: 700,
};

const historyCardStyle: CSSProperties = {
  border: "1px solid rgba(148,163,184,0.16)",
  borderRadius: 14,
  padding: 16,
  background: "rgba(15,23,42,0.4)",
};

const historyTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const studentNameStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 800,
  color: "#f8fafc",
};

const studentMetaStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  color: "#94a3b8",
};

const miniLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const promotedDateStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 14,
  fontWeight: 700,
  color: "#f8fafc",
};

const beltFlowBoxStyle: CSSProperties = {
  marginTop: 14,
  border: "1px solid rgba(59,130,246,0.18)",
  background: "rgba(30,41,59,0.45)",
  borderRadius: 12,
  padding: 14,
};

const beltFlowLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "#93c5fd",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const beltFlowValueStyle: CSSProperties = {
  marginTop: 8,
  fontSize: 16,
  fontWeight: 800,
  color: "#f8fafc",
};

const detailGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
  marginTop: 14,
};

const miniInfoBoxStyle: CSSProperties = {
  border: "1px solid rgba(148,163,184,0.14)",
  borderRadius: 10,
  padding: 12,
  background: "rgba(2,6,23,0.35)",
};

const miniValueStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 14,
  fontWeight: 700,
  color: "#f8fafc",
};