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
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    });
    const { data: invData, error: invError } = await supabase
      .from("invoices")
      .select("id,invoice_number,balance_amount,due_date,invoice_status,student_id")
      .gt("balance_amount", 0)
      .order("due_date", { ascending: true })
      .limit(200);

    if (invError || !invData?.length) {
      return NextResponse.json({ rows: invData ?? [] }, { status: 200 });
    }

    const studentIds = [...new Set(invData.map((r) => r.student_id).filter(Boolean))] as string[];
    let students: { id: string; full_name?: string | null; name?: string | null }[] = [];
    if (studentIds.length > 0) {
      const res = await supabase.from("students").select("id,full_name,name").in("id", studentIds);
      students = res.data ?? [];
    }
    const byId = new Map(students.map((s) => [s.id, { id: s.id, full_name: s.full_name ?? null, name: s.name ?? null }]));

    const rows = invData.map((row) => ({
      id: row.id,
      invoice_number: row.invoice_number ?? "",
      balance_amount: Number(row.balance_amount ?? 0),
      due_date: row.due_date ?? null,
      status: row.invoice_status ?? "",
      students: row.student_id ? byId.get(row.student_id) ?? null : null,
    }));

    return NextResponse.json({ rows });
  } catch (e) {
    console.error("GET /api/finance/balances", e);
    return NextResponse.json({ rows: [] }, { status: 200 });
  }
}
