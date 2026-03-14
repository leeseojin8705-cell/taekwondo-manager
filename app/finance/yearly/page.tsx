"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import AppShell from "../../../components/ui/AppShell";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import BilingualText from "../../../components/ui/BilingualText";

type Row = {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  newEnrollments: number;
  exits: number;
};
type YearRow = Row & { year: string };
type QuarterRow = Row & { quarter: string };
type MonthRow = Row & { month: string };

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

type PeriodType = "monthly" | "quarterly" | "yearly";

export default function FinanceYearlyPage() {
  const [loading, setLoading] = useState(true);
  const [byYear, setByYear] = useState<YearRow[]>([]);
  const [byYearQuarter, setByYearQuarter] = useState<Record<string, QuarterRow[]>>({});
  const [byYearMonth, setByYearMonth] = useState<Record<string, MonthRow[]>>({});
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [periodType, setPeriodType] = useState<PeriodType>("quarterly");

  useEffect(() => {
    fetchYearly();
  }, []);

  async function fetchYearly() {
    try {
      setLoading(true);
      const res = await fetch("/api/finance/yearly");
      const data = await res.json().catch(() => ({}));
      setByYear(data.byYear ?? []);
      setByYearQuarter(data.byYearQuarter ?? {});
      setByYearMonth(data.byYearMonth ?? {});
      const yList = Array.isArray(data.years) ? data.years : [];
      setYears(yList.length ? yList : [new Date().getFullYear()]);
      if (yList.length && !yList.includes(selectedYear)) {
        setSelectedYear(yList[yList.length - 1]);
      }
    } finally {
      setLoading(false);
    }
  }

  const tableRows = useMemo((): Row[] => {
    if (periodType === "yearly") {
      return byYear.map((r) => ({
        period: `${r.year}년`,
        revenue: r.revenue,
        expenses: r.expenses,
        profit: r.profit,
        newEnrollments: r.newEnrollments ?? 0,
        exits: r.exits ?? 0,
      }));
    }
    if (periodType === "quarterly") {
      const q = byYearQuarter[String(selectedYear)] ?? [];
      return q.map((r) => ({
        period: r.quarter,
        revenue: r.revenue,
        expenses: r.expenses,
        profit: r.profit,
        newEnrollments: r.newEnrollments ?? 0,
        exits: r.exits ?? 0,
      }));
    }
    const m = byYearMonth[String(selectedYear)] ?? [];
    return m.map((r) => ({
      period: r.month,
      revenue: r.revenue,
      expenses: r.expenses,
      profit: r.profit,
      newEnrollments: r.newEnrollments ?? 0,
      exits: r.exits ?? 0,
    }));
  }, [periodType, selectedYear, byYear, byYearQuarter, byYearMonth]);

  const selectStyle: React.CSSProperties = {
    background: "#1e293b",
    color: "#f1f5f9",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 14,
    minWidth: 120,
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 6 };

  if (loading) {
    return (
      <AppShell
        title="Finance by Year"
        description="Revenue, expenses, profit by year and quarter."
      >
        <LoadingBlock message="Loading yearly data..." />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Finance by Year"
      description="Compare by month, quarter, or year. Select filters above."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1000 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-end" }}>
          <div>
            <div style={labelStyle}><BilingualText en="Year" ko="연도" /></div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={selectStyle}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>
          <div>
            <div style={labelStyle}><BilingualText en="Period" ko="기간 단위" /></div>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
              style={selectStyle}
            >
              <option value="monthly">월별</option>
              <option value="quarterly">분기별</option>
              <option value="yearly">년도별</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto", border: "1px solid #1e293b", borderRadius: 12, background: "#0f172a" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                <th style={{ textAlign: "left", padding: "10px 12px", color: "#94a3b8", fontWeight: 600 }}>기간</th>
                <th style={{ textAlign: "right", padding: "10px 12px", color: "#94a3b8", fontWeight: 600 }}>수입</th>
                <th style={{ textAlign: "right", padding: "10px 12px", color: "#94a3b8", fontWeight: 600 }}>지출</th>
                <th style={{ textAlign: "right", padding: "10px 12px", color: "#94a3b8", fontWeight: 600 }}>순이익</th>
                <th style={{ textAlign: "right", padding: "10px 12px", color: "#94a3b8", fontWeight: 600 }}>입관</th>
                <th style={{ textAlign: "right", padding: "10px 12px", color: "#94a3b8", fontWeight: 600 }}>퇴관</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24, color: "#64748b", textAlign: "center" }}>
                    <BilingualText en="No data." ko="데이터 없음" />
                  </td>
                </tr>
              ) : (
                tableRows.map((row) => (
                  <tr key={row.period} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={{ padding: "10px 12px", color: "#f1f5f9", fontWeight: 500 }}>{row.period}</td>
                    <td style={{ padding: "10px 12px", color: "#94a3b8", textAlign: "right" }}>{formatMoney(row.revenue)}</td>
                    <td style={{ padding: "10px 12px", color: "#94a3b8", textAlign: "right" }}>{formatMoney(row.expenses)}</td>
                    <td style={{ padding: "10px 12px", color: "#94a3b8", textAlign: "right" }}>{formatMoney(row.profit)}</td>
                    <td style={{ padding: "10px 12px", color: "#94a3b8", textAlign: "right" }}>{row.newEnrollments}</td>
                    <td style={{ padding: "10px 12px", color: "#94a3b8", textAlign: "right" }}>{row.exits}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {tableRows.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            <div style={{ border: "1px solid #1e293b", borderRadius: 12, padding: 16, background: "#0f172a" }}>
              <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, marginBottom: 12 }}>수입 · 지출 · 순이익</div>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={tableRows} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => (v >= 1e6 ? `${v / 1e6}M` : v >= 1e3 ? `${v / 1e3}k` : String(v))} />
                    <Tooltip
                      contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                      formatter={(value: unknown): [string, string] => [typeof value === "number" && value < 1e10 ? formatMoney(value) : String(value ?? ""), ""]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" name="수입" fill="#64748b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="지출" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="순이익" fill="#475569" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ border: "1px solid #1e293b", borderRadius: 12, padding: 16, background: "#0f172a" }}>
              <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, marginBottom: 12 }}>입관 · 퇴관</div>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={tableRows} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="newEnrollments" name="입관" fill="#64748b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="exits" name="퇴관" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
