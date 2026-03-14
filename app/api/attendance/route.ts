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
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") ?? "";
    const endDate = searchParams.get("endDate") ?? "";
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);

    let query = supabase
      .from("attendance_logs")
      .select("id,student_id,program_id,checkin_date,checkin_time,checkin_source,checkin_type,warning_flags")
      .order("checkin_time", { ascending: false })
      .limit(limit);

    if (startDate) query = query.gte("checkin_date", startDate);
    if (endDate) query = query.lte("checkin_date", endDate);

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error("GET /api/attendance logs", logsError);
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    const rows = (logs ?? []) as Array<{
      id: string;
      student_id: string;
      program_id: string | null;
      checkin_date: string;
      checkin_time: string;
      checkin_source: string;
      checkin_type: string;
      warning_flags: string[] | null;
    }>;

    const studentIds = [...new Set(rows.map((r) => r.student_id))];
    const programIds = [...new Set(rows.map((r) => r.program_id).filter(Boolean))] as string[];

    const [studentsRes, programsRes] = await Promise.all([
      studentIds.length
        ? supabase.from("students").select("id,full_name").in("id", studentIds)
        : { data: [] as Array<{ id: string; full_name: string | null }> },
      programIds.length
        ? supabase.from("programs").select("id,name").in("id", programIds)
        : { data: [] as Array<{ id: string; name: string | null }> },
    ]);

    const studentsMap = new Map(
      ((studentsRes.data ?? []) as Array<{ id: string; full_name: string | null }>).map((s) => [s.id, s])
    );
    const programsMap = new Map(
      ((programsRes.data ?? []) as Array<{ id: string; name: string | null }>).map((p) => [p.id, p])
    );

    const result = rows.map((r) => ({
      id: r.id,
      student_id: r.student_id,
      checkin_date: r.checkin_date,
      checkin_time: r.checkin_time,
      checkin_source: r.checkin_source,
      checkin_type: r.checkin_type,
      warning_flags: r.warning_flags,
      students: studentsMap.get(r.student_id)
        ? { full_name: studentsMap.get(r.student_id)!.full_name }
        : null,
      programs: r.program_id && programsMap.get(r.program_id)
        ? { name: programsMap.get(r.program_id)!.name }
        : null,
    }));

    return NextResponse.json({ rows: result });
  } catch (e) {
    console.error("GET /api/attendance", e);
    return NextResponse.json({ rows: [] }, { status: 200 });
  }
}
