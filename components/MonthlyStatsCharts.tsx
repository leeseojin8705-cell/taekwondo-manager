"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type MonthlyBusinessRow = {
  month_start: string;
  join_count: number | null;
  withdraw_count: number | null;
  net_change: number | null;
  tuition_revenue: number | null;
  operating_expense: number | null;
  event_income: number | null;
  event_expense: number | null;
  total_revenue: number | null;
  total_expense: number | null;
  net_profit: number | null;
};

export default function MonthlyStatsCharts() {
  const [rows, setRows] = useState<MonthlyBusinessRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);

    const { data, error } = await supabase
      .from("monthly_business_stats_v2")
      .select(
        "month_start,join_count,withdraw_count,net_change,tuition_revenue,operating_expense,event_income,event_expense,total_revenue,total_expense,net_profit"
      )
      .order("month_start", { ascending: true });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as MonthlyBusinessRow[]);
    setLoading(false);
  }

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.totalRevenue += Number(row.total_revenue ?? 0);
        acc.totalExpense += Number(row.total_expense ?? 0);
        acc.netProfit += Number(row.net_profit ?? 0);
        acc.eventIncome += Number(row.event_income ?? 0);
        acc.eventExpense += Number(row.event_expense ?? 0);
        return acc;
      },
      {
        totalRevenue: 0,
        totalExpense: 0,
        netProfit: 0,
        eventIncome: 0,
        eventExpense: 0,
      }
    );
  }, [rows]);

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={titleStyle}>Monthly Business Stats</div>
        <div style={mutedStyle}>Loading chart data...</div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div>
          <div style={titleStyle}>Monthly Business Stats</div>
          <div style={mutedStyle}>
            Revenue, expense, event income, event expense, and net profit
          </div>
        </div>
      </div>

      <div style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Total Revenue</div>
          <div style={summaryValueStyle}>
            ${summary.totalRevenue.toLocaleString()}
          </div>
        </div>

        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Total Expense</div>
          <div style={summaryValueStyle}>
            ${summary.totalExpense.toLocaleString()}
          </div>
        </div>

        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Event Income</div>
          <div style={summaryValueStyle}>
            ${summary.eventIncome.toLocaleString()}
          </div>
        </div>

        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Event Expense</div>
          <div style={summaryValueStyle}>
            ${summary.eventExpense.toLocaleString()}
          </div>
        </div>

        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Net Profit</div>
          <div style={summaryValueStyle}>
            ${summary.netProfit.toLocaleString()}
          </div>
        </div>
      </div>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Month</th>
              <th style={thStyle}>Join</th>
              <th style={thStyle}>Withdraw</th>
              <th style={thStyle}>Tuition Revenue</th>
              <th style={thStyle}>Event Income</th>
              <th style={thStyle}>Operating Expense</th>
              <th style={thStyle}>Event Expense</th>
              <th style={thStyle}>Total Revenue</th>
              <th style={thStyle}>Total Expense</th>
              <th style={thStyle}>Net Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month_start}>
                <td style={tdStyle}>{row.month_start}</td>
                <td style={tdStyle}>{row.join_count ?? 0}</td>
                <td style={tdStyle}>{row.withdraw_count ?? 0}</td>
                <td style={tdStyle}>
                  ${Number(row.tuition_revenue ?? 0).toLocaleString()}
                </td>
                <td style={tdStyle}>
                  ${Number(row.event_income ?? 0).toLocaleString()}
                </td>
                <td style={tdStyle}>
                  ${Number(row.operating_expense ?? 0).toLocaleString()}
                </td>
                <td style={tdStyle}>
                  ${Number(row.event_expense ?? 0).toLocaleString()}
                </td>
                <td style={tdStyle}>
                  ${Number(row.total_revenue ?? 0).toLocaleString()}
                </td>
                <td style={tdStyle}>
                  ${Number(row.total_expense ?? 0).toLocaleString()}
                </td>
                <td style={tdStyle}>
                  ${Number(row.net_profit ?? 0).toLocaleString()}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td style={tdStyle} colSpan={10}>
                  No monthly business stats found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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

const mutedStyle: CSSProperties = {
  marginTop: 6,
  color: "#94a3b8",
  fontSize: 14,
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginBottom: 18,
};

const summaryCardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  padding: 14,
  background: "#07101f",
};

const summaryLabelStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  marginBottom: 8,
};

const summaryValueStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: 22,
  fontWeight: 800,
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  color: "#94a3b8",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  fontSize: 14,
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  whiteSpace: "nowrap",
};