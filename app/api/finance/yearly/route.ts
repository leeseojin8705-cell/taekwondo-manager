import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const y = dateStr.slice(0, 4);
  const n = parseInt(y, 10);
  return Number.isFinite(n) ? n : null;
}

function getQuarter(dateStr: string | null): 1 | 2 | 3 | 4 | null {
  if (!dateStr) return null;
  const m = parseInt(dateStr.slice(5, 7), 10);
  if (!Number.isFinite(m) || m < 1 || m > 12) return null;
  if (m <= 3) return 1;
  if (m <= 6) return 2;
  if (m <= 9) return 3;
  return 4;
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({
        years: [],
        byYear: [],
        byYearQuarter: {},
        byYearMonth: {},
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    });
    const currentYear = new Date().getFullYear();
    const fromYear = currentYear - 10;

    const [paymentsRes, expensesRes, studentsRes, contractsRes] = await Promise.all([
      supabase.from("payments").select("paid_at,paid_amount").not("paid_at", "is", null),
      supabase.from("expenses").select("expense_date,amount").not("expense_date", "is", null),
      supabase.from("students").select("id,join_date"),
      supabase.from("student_contracts").select("student_id,end_date").not("end_date", "is", null),
    ]);

    type PaymentRow = { paid_at: string | null; paid_amount: number | null };
    type ExpenseRow = { expense_date: string | null; amount: number | null };

    let payments: PaymentRow[] = [];
    let yearlyPaymentsError: string | null = null;
    if (paymentsRes.error) {
      yearlyPaymentsError = paymentsRes.error.message;
      const isCol = paymentsRes.error.message?.toLowerCase?.().includes("column");
      if (isCol) {
        const alt = await supabase.from("payments").select("payment_date,payment_amount").not("payment_date", "is", null);
        if (!alt.error && alt.data) {
          payments = (alt.data as { payment_date?: string | null; payment_amount?: number | null }[]).map((p) => ({
            paid_at: p.payment_date ?? null,
            paid_amount: p.payment_amount ?? null,
          }));
        }
      }
    } else {
      payments = (paymentsRes.data ?? []) as PaymentRow[];
      payments = payments.map((p) => ({
        paid_at: p.paid_at ?? (p as unknown as { payment_date?: string | null }).payment_date ?? null,
        paid_amount: p.paid_amount ?? (p as unknown as { payment_amount?: number | null }).payment_amount ?? null,
      }));
    }

    let expenses: ExpenseRow[] = [];
    let yearlyExpensesError: string | null = null;
    if (expensesRes.error) {
      yearlyExpensesError = expensesRes.error.message;
      const isCol = expensesRes.error.message?.toLowerCase?.().includes("column");
      if (isCol) {
        const alt = await supabase.from("expenses").select("expense_date,amount");
        if (!alt.error && alt.data) expenses = (alt.data ?? []) as ExpenseRow[];
      }
    } else {
      expenses = (expensesRes.data ?? []) as ExpenseRow[];
    }
    const students = (studentsRes.data ?? []) as { id: string; join_date: string | null }[];
    const contracts = (contractsRes.data ?? []) as { student_id: string | null; end_date: string | null }[];

    const yearRevenue: Record<number, number> = {};
    const yearExpenses: Record<number, number> = {};
    const yearQuarterRevenue: Record<number, Record<number, number>> = {};
    const yearQuarterExpenses: Record<number, Record<number, number>> = {};
    const yearMonthRevenue: Record<number, Record<number, number>> = {};
    const yearMonthExpenses: Record<number, Record<number, number>> = {};
    const yearMonthNewEnrollments: Record<number, Record<number, number>> = {};
    const yearMonthExits: Record<number, Record<number, Set<string>>> = {};
    const yearNewEnrollments: Record<number, number> = {};
    const yearExits: Record<number, number> = {};
    const yearQuarterNewEnrollments: Record<number, Record<number, number>> = {};
    const yearQuarterExits: Record<number, Record<number, number>> = {};

    for (let y = fromYear; y <= currentYear; y++) {
      yearRevenue[y] = 0;
      yearExpenses[y] = 0;
      yearNewEnrollments[y] = 0;
      yearExits[y] = 0;
      yearQuarterRevenue[y] = { 1: 0, 2: 0, 3: 0, 4: 0 };
      yearQuarterExpenses[y] = { 1: 0, 2: 0, 3: 0, 4: 0 };
      yearMonthRevenue[y] = {};
      yearMonthExpenses[y] = {};
      yearMonthNewEnrollments[y] = {};
      yearMonthExits[y] = {};
      for (let m = 1; m <= 12; m++) {
        yearMonthRevenue[y][m] = 0;
        yearMonthExpenses[y][m] = 0;
        yearMonthNewEnrollments[y][m] = 0;
        yearMonthExits[y][m] = new Set();
      }
      yearQuarterNewEnrollments[y] = { 1: 0, 2: 0, 3: 0, 4: 0 };
      yearQuarterExits[y] = { 1: 0, 2: 0, 3: 0, 4: 0 };
    }

    function getMonth(dateStr: string | null): number | null {
      if (!dateStr) return null;
      const m = parseInt(dateStr.slice(5, 7), 10);
      return Number.isFinite(m) && m >= 1 && m <= 12 ? m : null;
    }

    payments.forEach((p) => {
      const dateStr = typeof p.paid_at === "string" ? p.paid_at.slice(0, 10) : null;
      const year = getYear(dateStr);
      const q = getQuarter(dateStr);
      const month = getMonth(dateStr);
      const amount = Number(p.paid_amount ?? 0);
      if (year != null && year >= fromYear && year <= currentYear) {
        yearRevenue[year] = (yearRevenue[year] ?? 0) + amount;
        if (q != null) yearQuarterRevenue[year][q] = (yearQuarterRevenue[year][q] ?? 0) + amount;
        if (month != null) yearMonthRevenue[year][month] = (yearMonthRevenue[year][month] ?? 0) + amount;
      }
    });

    expenses.forEach((e) => {
      const dateStr = typeof e.expense_date === "string" ? e.expense_date.slice(0, 10) : null;
      const year = getYear(dateStr);
      const q = getQuarter(dateStr);
      const month = getMonth(dateStr);
      const amount = Number(e.amount ?? 0);
      if (year != null && year >= fromYear && year <= currentYear) {
        yearExpenses[year] = (yearExpenses[year] ?? 0) + amount;
        if (q != null) yearQuarterExpenses[year][q] = (yearQuarterExpenses[year][q] ?? 0) + amount;
        if (month != null) yearMonthExpenses[year][month] = (yearMonthExpenses[year][month] ?? 0) + amount;
      }
    });

    students.forEach((s) => {
      const dateStr = typeof s.join_date === "string" ? s.join_date.slice(0, 10) : null;
      const year = getYear(dateStr);
      const q = getQuarter(dateStr);
      const month = getMonth(dateStr);
      if (year != null && year >= fromYear && year <= currentYear) {
        yearNewEnrollments[year] = (yearNewEnrollments[year] ?? 0) + 1;
        if (q != null) yearQuarterNewEnrollments[year][q] = (yearQuarterNewEnrollments[year][q] ?? 0) + 1;
        if (month != null) yearMonthNewEnrollments[year][month] = (yearMonthNewEnrollments[year][month] ?? 0) + 1;
      }
    });

    const exitsByYearQuarter: Record<number, Record<number, Set<string>>> = {};
    for (let y = fromYear; y <= currentYear; y++) {
      exitsByYearQuarter[y] = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() };
    }
    contracts.forEach((c) => {
      const sid = c.student_id;
      if (!sid) return;
      const dateStr = typeof c.end_date === "string" ? c.end_date.slice(0, 10) : null;
      const year = getYear(dateStr);
      const q = getQuarter(dateStr);
      const month = getMonth(dateStr);
      if (year != null && year >= fromYear && year <= currentYear) {
        if (q != null) exitsByYearQuarter[year][q].add(sid);
        if (month != null) yearMonthExits[year][month].add(sid);
      }
    });
    for (let y = fromYear; y <= currentYear; y++) {
      const allExits = new Set<string>();
      for (let q = 1; q <= 4; q++) {
        const set = exitsByYearQuarter[y][q];
        yearQuarterExits[y][q] = set.size;
        set.forEach((id) => allExits.add(id));
      }
      yearExits[y] = allExits.size;
    }

    const years = Object.keys(yearRevenue)
      .map(Number)
      .filter(
        (y) =>
          yearRevenue[y] > 0 ||
          yearExpenses[y] > 0 ||
          yearNewEnrollments[y] > 0 ||
          yearExits[y] > 0
      )
      .sort((a, b) => a - b);
    if (years.length === 0) {
      for (let y = fromYear; y <= currentYear; y++) years.push(y);
    }

    const byYear = years.map((year) => ({
      year: String(year),
      revenue: Math.round((yearRevenue[year] ?? 0) * 100) / 100,
      expenses: Math.round((yearExpenses[year] ?? 0) * 100) / 100,
      profit: Math.round(((yearRevenue[year] ?? 0) - (yearExpenses[year] ?? 0)) * 100) / 100,
      newEnrollments: yearNewEnrollments[year] ?? 0,
      exits: yearExits[year] ?? 0,
    }));

    const byYearQuarter: Record<
      string,
      { quarter: string; revenue: number; expenses: number; profit: number; newEnrollments: number; exits: number }[]
    > = {};
    years.forEach((year) => {
      byYearQuarter[String(year)] = [1, 2, 3, 4].map((q) => ({
        quarter: `Q${q}`,
        revenue: Math.round((yearQuarterRevenue[year]?.[q] ?? 0) * 100) / 100,
        expenses: Math.round((yearQuarterExpenses[year]?.[q] ?? 0) * 100) / 100,
        profit:
          Math.round(
            ((yearQuarterRevenue[year]?.[q] ?? 0) - (yearQuarterExpenses[year]?.[q] ?? 0)) * 100
          ) / 100,
        newEnrollments: yearQuarterNewEnrollments[year]?.[q] ?? 0,
        exits: yearQuarterExits[year]?.[q] ?? 0,
      }));
    });

    const byYearMonth: Record<string, { month: string; revenue: number; expenses: number; profit: number; newEnrollments: number; exits: number }[]> = {};
    years.forEach((year) => {
      byYearMonth[String(year)] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
        const rev = yearMonthRevenue[year]?.[m] ?? 0;
        const exp = yearMonthExpenses[year]?.[m] ?? 0;
        return {
          month: `${m}월`,
          revenue: Math.round(rev * 100) / 100,
          expenses: Math.round(exp * 100) / 100,
          profit: Math.round((rev - exp) * 100) / 100,
          newEnrollments: yearMonthNewEnrollments[year]?.[m] ?? 0,
          exits: yearMonthExits[year]?.[m]?.size ?? 0,
        };
      });
    });

    return NextResponse.json({
      years,
      byYear,
      byYearQuarter,
      byYearMonth,
      paymentsError: yearlyPaymentsError ?? undefined,
      expensesError: yearlyExpensesError ?? undefined,
    });
  } catch (e) {
    console.error("GET /api/finance/yearly", e);
    return NextResponse.json({
      years: [],
      byYear: [],
      byYearQuarter: {},
      byYearMonth: {},
    });
  }
}
