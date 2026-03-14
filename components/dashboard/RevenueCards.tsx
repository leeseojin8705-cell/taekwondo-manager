"use client";

import StatCard from "../ui/StatCard";
import { formatMoney } from "../../lib/format";

type Props = {
  summary: {
    today_revenue: number;
    month_revenue: number;
    active_students_count: number;
    unpaid_students_count: number;
    low_stock_count: number;
  } | null;
  attendance: {
    today_attendance_count: number;
    regular_count: number;
    makeup_count: number;
  } | null;
};

export default function RevenueCards({ summary, attendance }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
      }}
    >
      <StatCard
        label="Today Revenue"
        value={formatMoney(summary?.today_revenue ?? 0)}
      />
      <StatCard
        label="Monthly Revenue"
        value={formatMoney(summary?.month_revenue ?? 0)}
      />
      <StatCard
        label="Active Students"
        value={String(summary?.active_students_count ?? 0)}
      />
      <StatCard
        label="Unpaid Students"
        value={String(summary?.unpaid_students_count ?? 0)}
      />
      <StatCard
        label="Low Stock"
        value={String(summary?.low_stock_count ?? 0)}
      />
      <StatCard
        label="Today Attendance"
        value={String(attendance?.today_attendance_count ?? 0)}
        hint={`Regular ${attendance?.regular_count ?? 0} / Makeup ${attendance?.makeup_count ?? 0}`}
      />
    </div>
  );
}