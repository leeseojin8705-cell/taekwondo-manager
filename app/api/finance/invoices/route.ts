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
      return NextResponse.json({ invoices: [] }, { status: 200 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    });
    const { data, error } = await supabase
      .from("invoices")
      .select("id,invoice_number,student_id,issued_date,due_date,payment_category,invoice_status,total_amount,paid_amount,balance_amount,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ invoices: [] }, { status: 200 });
    }

    const invoices = (data ?? []).map((row: Record<string, unknown>) => ({
      invoice_id: row.id,
      id: row.id,
      invoice_number: row.invoice_number ?? null,
      student_id: row.student_id ?? null,
      student_name: null as string | null,
      student_contract_id: null,
      student_program_id: null,
      payment_category: row.payment_category ?? null,
      description: null,
      issued_date: row.issued_date ?? null,
      due_date: row.due_date ?? null,
      total_amount: row.total_amount != null ? Number(row.total_amount) : null,
      paid_amount: row.paid_amount != null ? Number(row.paid_amount) : null,
      balance_amount: row.balance_amount != null ? Number(row.balance_amount) : null,
      invoice_status: row.invoice_status ?? null,
      payment_status: null,
      created_at: row.created_at ?? null,
    }));

    const studentIds = [...new Set(invoices.map((i) => i.student_id).filter(Boolean))] as string[];
    if (studentIds.length > 0) {
      const { data: students } = await supabase
        .from("students")
        .select("id,full_name,name")
        .in("id", studentIds);
      const byId = new Map((students ?? []).map((s: { id: string; full_name?: string | null; name?: string | null }) => [s.id, s.full_name || s.name || null]));
      invoices.forEach((inv) => {
        const sid = inv.student_id as string | null;
        if (sid) inv.student_name = byId.get(sid) ?? null;
      });
    }

    return NextResponse.json({ invoices });
  } catch (e) {
    console.error("GET /api/finance/invoices", e);
    return NextResponse.json({ invoices: [] }, { status: 200 });
  }
}
