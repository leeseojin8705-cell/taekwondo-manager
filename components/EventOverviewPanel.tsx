"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type EventRow = {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  location: string | null;
  status: string;
  event_type: string;
  total_income: number | null;
  net_profit: number | null;
  is_settled: boolean | null;
};

export default function EventOverviewPanel() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);

    const { data, error } = await supabase
      .from("dashboard_event_list")
      .select(
        "id,title,event_date,start_time,location,status,event_type,total_income,net_profit,is_settled"
      )
      .order("event_date", { ascending: true })
      .limit(8);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setEvents((data ?? []) as EventRow[]);
    setLoading(false);
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div>
          <div style={titleStyle}>Event Overview</div>
          <div style={descStyle}>
            Upcoming schedules and event settlement summary
          </div>
        </div>

        <Link href="/events" style={buttonStyle}>
          Open
        </Link>
      </div>

      {loading ? (
        <div style={mutedStyle}>Loading events...</div>
      ) : events.length === 0 ? (
        <div style={mutedStyle}>No events found.</div>
      ) : (
        <div style={listWrapStyle}>
          {events.map((event) => (
            <div key={event.id} style={itemStyle}>
              <div style={itemTopStyle}>
                <div style={itemTitleStyle}>{event.title}</div>
                <div style={itemDateStyle}>{event.event_date}</div>
              </div>

              <div style={itemMetaStyle}>
                {event.event_type} · {event.status}
                {event.start_time ? ` · ${event.start_time}` : ""}
              </div>

              <div style={itemMetaStyle}>
                {event.location || "-"} · {event.is_settled ? "Settled" : "Not Settled"}
              </div>

              <div style={moneyRowStyle}>
                <span>Income: ${Number(event.total_income ?? 0).toLocaleString()}</span>
                <span>Profit: ${Number(event.net_profit ?? 0).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const cardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 18,
  padding: 20,
  background: "#081226",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 16,
};

const titleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
};

const descStyle: CSSProperties = {
  marginTop: 6,
  color: "#94a3b8",
  fontSize: 14,
};

const buttonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#111827",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 700,
};

const mutedStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 14,
};

const listWrapStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const itemStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  padding: 14,
  background: "#07101f",
};

const itemTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
};

const itemTitleStyle: CSSProperties = {
  fontWeight: 800,
  fontSize: 16,
};

const itemDateStyle: CSSProperties = {
  color: "#7dd3fc",
  fontSize: 13,
  whiteSpace: "nowrap",
};

const itemMetaStyle: CSSProperties = {
  marginTop: 6,
  color: "#94a3b8",
  fontSize: 13,
};

const moneyRowStyle: CSSProperties = {
  marginTop: 10,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  color: "#e2e8f0",
  fontSize: 13,
};