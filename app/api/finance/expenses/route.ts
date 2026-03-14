import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.warn("finance/expenses: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
      return NextResponse.json([]);
    }

    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 300, 500);
    const supabase = createClient(supabaseUrl, serviceKey, {
      global: {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    });

    const { data, error } = await supabase
      .from("expenses")
      .select(`
        id,
        expense_date,
        amount,
        vendor_name,
        description,
        note,
        attachment_url,
        expense_categories:expense_category_id (
          id,
          name
        ),
        payment_methods:payment_method_id (
          id,
          name
        )
      `)
      .order("expense_date", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("finance/expenses query error:", error.message);
      return NextResponse.json([]);
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("finance/expenses route error:", err);
    return NextResponse.json([]);
  }
}
