import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({
        summary: null,
        attendance: null,
        alerts: [],
        lowStock: [],
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
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + "-01";

    const [paymentsRes, studentsRes, invoicesCountRes, invoicesAlertsRes, attendanceRes, variantsRes, expensesRes, invoicesMonthlyRes] = await Promise.all([
      supabase.from("payments").select("id,paid_at,paid_amount").order("paid_at", { ascending: false }).limit(500),
      supabase.from("students").select("id,status"),
      supabase.from("invoices").select("id,balance_amount").gt("balance_amount", 0),
      supabase.from("invoices").select("id,student_id,balance_amount").gt("balance_amount", 0).limit(8),
      supabase.from("attendance_logs").select("id,checkin_date").gte("checkin_date", today).lte("checkin_date", today),
      supabase.from("inventory_variants").select("id,stock_quantity,low_stock_threshold").limit(200),
      supabase.from("expenses").select("expense_date,amount").order("expense_date", { ascending: false }).limit(1000),
      supabase.from("invoices").select("created_at,balance_amount").gt("balance_amount", 0).limit(500),
    ]);

    const paid = (paymentsRes.data ?? []) as Array<{ paid_at: string | null; paid_amount: number | null }>;
    let todayRevenue = 0;
    let monthRevenue = 0;
    paid.forEach((p) => {
      const amt = Number(p.paid_amount ?? 0);
      const d = (p.paid_at || "").slice(0, 10);
      if (d === today) todayRevenue += amt;
      if (d >= monthStart && d <= today) monthRevenue += amt;
    });

    const activeCount = studentsRes.error ? 0 : (studentsRes.data ?? []).filter((s: { status?: string }) => (s.status ?? "").toLowerCase() === "active").length;
    const unpaidCount = invoicesCountRes.error ? 0 : (invoicesCountRes.data ?? []).length;
    const lowCount = variantsRes.error ? 0 : (variantsRes.data ?? []).filter((v: { stock_quantity?: number; low_stock_threshold?: number }) => Number(v.stock_quantity ?? 0) <= Number(v.low_stock_threshold ?? 0)).length;

    const summary = paymentsRes.error ? null : {
      today_revenue: todayRevenue,
      month_revenue: monthRevenue,
      active_students_count: activeCount,
      unpaid_students_count: unpaidCount,
      low_stock_count: lowCount,
    };

    const attendance = attendanceRes.error ? null : {
      today_attendance_count: (attendanceRes.data ?? []).length,
      regular_count: (attendanceRes.data ?? []).length,
      makeup_count: 0,
    };

    const alerts = invoicesAlertsRes.error ? [] : (invoicesAlertsRes.data ?? []).map((p: { id: string; student_id: string | null; balance_amount: number | null }) => ({
      id: p.id,
      student_id: p.student_id,
      student_name: null,
      payment_category: "",
      description: null,
      final_amount: Number(p.balance_amount ?? 0),
      paid_amount: 0,
      balance_amount: Number(p.balance_amount ?? 0),
      payment_status: "unpaid",
      due_date: null,
      is_overdue: false,
    }));

    const lowStock = variantsRes.error ? [] : (variantsRes.data ?? [])
      .filter((v: { stock_quantity?: number; low_stock_threshold?: number }) => Number(v.stock_quantity ?? 0) <= Number(v.low_stock_threshold ?? 0))
      .slice(0, 8)
      .map((v: { id: string; stock_quantity: number; low_stock_threshold: number }) => ({
        id: v.id,
        item_name: "Variant",
        stock_qty: Number(v.stock_quantity ?? 0),
        low_stock_threshold: Number(v.low_stock_threshold ?? 0),
        is_low_stock: true,
      }));

    const monthMap: Record<string, { collected: number; expense: number; outstanding: number }> = {};
    const months: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7) + "-01";
      months.push(key);
      monthMap[key] = { collected: 0, expense: 0, outstanding: 0 };
    }
    ((paymentsRes.data ?? []) as Array<{ paid_at?: string | null; paid_amount?: number | null }>).forEach((p) => {
      const key = (p.paid_at || "").slice(0, 7) + "-01";
      if (monthMap[key]) monthMap[key].collected += Number(p.paid_amount ?? 0);
    });
    ((expensesRes.data ?? []) as Array<{ expense_date?: string | null; amount?: number | null }>).forEach((e) => {
      const key = (e.expense_date || "").slice(0, 7) + "-01";
      if (monthMap[key]) monthMap[key].expense += Number(e.amount ?? 0);
    });
    ((invoicesMonthlyRes.data ?? []) as Array<{ created_at?: string | null; balance_amount?: number | null }>).forEach((i) => {
      const key = (i.created_at || "").slice(0, 7) + "-01";
      if (monthMap[key]) monthMap[key].outstanding += Number(i.balance_amount ?? 0);
    });
    const monthlySummary = months.map((month_start) => {
      const m = monthMap[month_start];
      const collected = m?.collected ?? 0;
      const expense = m?.expense ?? 0;
      const outstanding = m?.outstanding ?? 0;
      return {
        month_start: month_start.slice(0, 7),
        billed_revenue: collected + outstanding,
        collected_revenue: collected,
        outstanding_balance: outstanding,
        total_expense: expense,
        net_cash_flow: collected - expense,
      };
    });

    return NextResponse.json({
      summary,
      attendance,
      alerts,
      lowStock,
      monthlySummary,
    });
  } catch (e) {
    console.warn("dashboard/data error:", e);
    return NextResponse.json({
      summary: null,
      attendance: null,
      alerts: [],
      lowStock: [],
      monthlySummary: [],
    });
  }
}
