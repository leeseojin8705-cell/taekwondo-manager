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
      return NextResponse.json(
        {
          payments: [],
          students: [],
          attendance: [],
          studentContracts: [],
          unpaidInvoicesCount: 0,
        },
        { status: 200 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    });

    const [paymentsRes, studentsRes, attendanceRes, contractsRes, invoicesRes] =
      await Promise.all([
        supabase
          .from("payments")
          .select("id,paid_at,payment_status,paid_amount,balance_amount")
          .order("paid_at", { ascending: true }),

        supabase
          .from("students")
          .select("id,status,join_date")
          .order("join_date", { ascending: true }),

        supabase
          .from("attendance_logs")
          .select("id,checkin_date,student_id")
          .order("checkin_date", { ascending: true }),

        supabase
          .from("student_contracts")
          .select("id,student_id,status,end_date")
          .order("end_date", { ascending: true }),

        supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .gt("balance_amount", 0),
      ]);

    let payments: Array<Record<string, unknown>> = [];
    let paymentsError: string | null = null;
    if (paymentsRes.error) {
      paymentsError = paymentsRes.error.message;
      const maybeCol = paymentsRes.error.message?.toLowerCase?.().includes("column");
      if (maybeCol) {
        const alt = await supabase
          .from("payments")
          .select("id,payment_date,payment_status,payment_amount,balance_amount")
          .order("payment_date", { ascending: true });
        if (!alt.error && alt.data?.length !== undefined) {
          payments = (alt.data ?? []).map((p: Record<string, unknown>) => ({
            id: p.id,
            paid_at: p.payment_date ?? p.paid_at,
            payment_status: p.payment_status,
            paid_amount: p.payment_amount ?? p.paid_amount,
            balance_amount: p.balance_amount,
            final_amount: null,
          }));
        }
      }
    } else {
      payments = (paymentsRes.data ?? []).map((p: Record<string, unknown>) => ({
        ...p,
        paid_at: p.paid_at ?? (p as Record<string, unknown>).payment_date,
        paid_amount: p.paid_amount ?? (p as Record<string, unknown>).payment_amount,
        final_amount: null,
      }));
    }

    const students = studentsRes.data ?? [];
    const attendance = attendanceRes.data ?? [];
    const studentContracts = contractsRes.data ?? [];
    const unpaidInvoicesCount = invoicesRes.error ? 0 : (invoicesRes.count ?? 0);
    const invoicesError = invoicesRes.error ? invoicesRes.error.message : null;

    return NextResponse.json({
      payments,
      students,
      attendance,
      studentContracts,
      unpaidInvoicesCount,
      paymentsError: paymentsError && payments.length === 0 ? paymentsError : null,
      invoicesError: invoicesError ?? null,
    });
  } catch (e) {
    console.error("GET /api/home", e);
    return NextResponse.json(
      {
        payments: [],
        students: [],
        attendance: [],
        studentContracts: [],
        unpaidInvoicesCount: 0,
      },
      { status: 200 }
    );
  }
}
