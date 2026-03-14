import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 만료된 계약을 ended로, 활성 계약 없는 학생을 inactive(퇴관)로 갱신 */
export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ ok: false, error: "Missing Supabase config" }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    });
    const { error } = await supabase.rpc("mark_expired_contracts_and_exits");
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("mark-expired", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
