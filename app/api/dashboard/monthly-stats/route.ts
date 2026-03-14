import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
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

    const [businessRes, revenueRes, expenseRes] = await Promise.all([
      supabase
        .from("monthly_business_stats")
        .select("*")
        .order("month_start", { ascending: true }),
      supabase
        .from("monthly_revenue_category_stats")
        .select("*")
        .order("month_start", { ascending: true }),
      supabase
        .from("monthly_expense_category_stats")
        .select("*")
        .order("month_start", { ascending: true }),
    ]);

    if (businessRes.error) {
      return NextResponse.json(
        { error: `monthly_business_stats: ${businessRes.error.message}` },
        { status: 500 }
      );
    }

    if (revenueRes.error) {
      return NextResponse.json(
        {
          error: `monthly_revenue_category_stats: ${revenueRes.error.message}`,
        },
        { status: 500 }
      );
    }

    if (expenseRes.error) {
      return NextResponse.json(
        {
          error: `monthly_expense_category_stats: ${expenseRes.error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        business: businessRes.data ?? [],
        revenueCategory: revenueRes.data ?? [],
        expenseCategory: expenseRes.data ?? [],
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error in monthly-stats route.",
      },
      { status: 500 }
    );
  }
}