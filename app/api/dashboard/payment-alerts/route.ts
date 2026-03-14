import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SUPABASE_URL is missing." },
        { status: 500 }
      );
    }

    if (!supabaseKey) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("payment_alert_list")
      .select("*")
      .order("payment_date", { ascending: true })
      .limit(100);

    if (error) {
      console.error("payment_alert_list error:", error);
      return NextResponse.json(
        { error: `payment_alert_list: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        items: data ?? [],
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("payment-alerts route error:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Unknown error in payment-alerts route.",
      },
      { status: 500 }
    );
  }
}