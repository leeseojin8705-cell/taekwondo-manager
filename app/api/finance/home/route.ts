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
      .select("id,invoice_number,due_date,total_amount,paid_amount,balance_amount")
      .limit(8);

    if (error) {
      return NextResponse.json({ invoices: [] }, { status: 200 });
    }

    const invoices = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      invoice_number: row.invoice_number ?? "",
      invoice_date: "",
      due_date: row.due_date ?? null,
      invoice_type: "",
      status: "",
      final_amount: Number(row.total_amount ?? 0),
      paid_amount: Number(row.paid_amount ?? 0),
      balance_amount: Number(row.balance_amount ?? 0),
    }));

    return NextResponse.json({ invoices });
  } catch (e) {
    console.error("GET /api/finance/home", e);
    return NextResponse.json({ invoices: [] }, { status: 200 });
  }
}
