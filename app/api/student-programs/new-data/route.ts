import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("student_id") ?? request.nextUrl.searchParams.get("studentId") ?? "";
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { student: null, programs: [], membershipDurations: [], weeklyFrequencyOptions: [] },
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

    const [programsRes, studentRes, durationsRes, freqRes] = await Promise.all([
      supabase
        .from("programs")
        .select("id,name,price")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      studentId
        ? supabase
            .from("students")
            .select("id,name,full_name")
            .eq("id", studentId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("membership_durations")
        .select("id,name,duration_value")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("weekly_frequency_options")
        .select("id,label,frequency_value")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
    ]);

    const programs = programsRes.error ? [] : (programsRes.data ?? []);
    const membershipDurations = durationsRes.error ? [] : (durationsRes.data ?? []);
    const weeklyFrequencyOptions = freqRes.error ? [] : (freqRes.data ?? []);
    const rawStudent = studentRes.error ? null : studentRes.data;
    const student = rawStudent
      ? {
          id: rawStudent.id,
          name: (rawStudent as Record<string, unknown>).name ?? (rawStudent as Record<string, unknown>).full_name ?? "",
        }
      : null;

    return NextResponse.json({
      student,
      programs,
      membershipDurations,
      weeklyFrequencyOptions,
    });
  } catch (e) {
    console.error("GET /api/student-programs/new-data", e);
    return NextResponse.json(
      { student: null, programs: [], membershipDurations: [], weeklyFrequencyOptions: [] },
      { status: 200 }
    );
  }
}
