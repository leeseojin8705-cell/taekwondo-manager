import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Response shape consumed by app/students/page.tsx only. Keep in sync: summary, students, contracts, expiringRows, belts. */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        {
          summary: null,
          students: [],
          contracts: [],
          expiringRows: [],
          belts: [],
          loadError: "Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local and restart the dev server.",
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
    const today = new Date().toISOString().slice(0, 10);
    const next7 = new Date();
    next7.setDate(next7.getDate() + 7);
    const next7Str = next7.toISOString().slice(0, 10);

    const [studentsRes, contractsRes, expiringRes, beltsRes] = await Promise.all([
      supabase
        .from("students")
        .select("id,student_code,name,full_name,photo_url,parent_name,phone,email,status,join_date,current_belt_id")
        .order("full_name", { ascending: true }),

      supabase
        .from("student_contracts")
        .select("id,student_id,program_id,membership_duration_id,weekly_frequency_option_id,status,start_date,end_date,registration_fee,tuition_fee,discount_type_id,discount_mode,discount_scope,discount_value,final_tuition_fee,uniform_fee,equipment_fee,other_fee,total_amount,pricing_snapshot,note")
        .gte("end_date", today)
        .order("start_date", { ascending: false }),

      supabase
        .from("student_contracts")
        .select("student_id")
        .gte("end_date", today)
        .lte("end_date", next7Str),

      supabase
        .from("belts")
        .select("id,name")
        .order("name", { ascending: true }),
    ]);

    if (studentsRes.error) console.error("GET /api/students studentsRes.error", studentsRes.error);
    if (contractsRes.error) console.error("GET /api/students contractsRes.error", contractsRes.error);
    if (beltsRes.error) console.error("GET /api/students beltsRes.error", beltsRes.error);

    const loadError =
      studentsRes.error?.message ??
      contractsRes.error?.message ??
      beltsRes.error?.message ??
      null;

    const belts = beltsRes.error ? [] : (beltsRes.data ?? []);
    const rawContracts = contractsRes.error ? [] : (contractsRes.data ?? []);
    const programIds = [...new Set((rawContracts as Array<{ program_id: string | null }>).map((c) => c.program_id).filter(Boolean))] as string[];
    const durationIds = [...new Set((rawContracts as Array<{ membership_duration_id: string | null }>).map((c) => c.membership_duration_id).filter(Boolean))] as string[];
    const freqIds = [...new Set((rawContracts as Array<{ weekly_frequency_option_id: string | null }>).map((c) => c.weekly_frequency_option_id).filter(Boolean))] as string[];
    const discountTypeIds = [...new Set((rawContracts as Array<{ discount_type_id: string | null }>).map((c) => c.discount_type_id).filter(Boolean))] as string[];

    const [programsRes, durationsRes, freqRes, discountTypesRes] = await Promise.all([
      programIds.length > 0 ? supabase.from("programs").select("id,name").in("id", programIds) : { data: [] as Array<Record<string, unknown>> },
      durationIds.length > 0 ? supabase.from("membership_durations").select("id,name").in("id", durationIds) : { data: [] as Array<Record<string, unknown>> },
      freqIds.length > 0 ? supabase.from("weekly_frequency_options").select("id,label,frequency_value").in("id", freqIds) : { data: [] as Array<Record<string, unknown>> },
      discountTypeIds.length > 0 ? supabase.from("discount_types").select("id,name").in("id", discountTypeIds) : { data: [] as Array<Record<string, unknown>> },
    ]);
    if (programIds.length > 0 && "error" in programsRes && programsRes.error) console.error("GET /api/students programs (program_name null):", programsRes.error.message, "- Run scripts/fix_programs_options_permission.sql in Supabase.");
    if (durationIds.length > 0 && "error" in durationsRes && durationsRes.error) console.error("GET /api/students membership_durations:", durationsRes.error.message);
    if (freqIds.length > 0 && "error" in freqRes && freqRes.error) console.error("GET /api/students weekly_frequency_options:", freqRes.error.message);

    const programName = (p: Record<string, unknown>) => (p?.name ?? p?.program_name ?? p?.title) as string | null;
    const programsMap = new Map<string, string | null>((programsRes.data ?? []).map((p: Record<string, unknown>) => [String(p.id), programName(p)]));
    const durationsMap = new Map<string, string | null>((durationsRes.data ?? []).map((d: Record<string, unknown>) => [String(d.id), (d?.name ?? d?.duration_name ?? d?.label) as string | null]));
    // Prefer number from label so "2 Times / Week" -> 2 even if DB frequency_value is wrong/missing
    const valueFromLabel = (label: string | null): number | null => {
      if (!label || typeof label !== "string") return null;
      const m = label.match(/^(\d+)/);
      return m ? parseInt(m[1], 10) : null;
    };
    const freqMap = new Map<string, { name: string | null; value: number | null }>((freqRes.data ?? []).map((f: Record<string, unknown>) => {
      const name = (f?.name ?? f?.label ?? f?.display_name) as string | null;
      const dbVal = f?.value != null ? Number(f.value) : f?.frequency_value != null ? Number(f.frequency_value) : null;
      const value = valueFromLabel(name) ?? (dbVal != null && dbVal > 0 ? dbVal : null);
      return [String(f.id), { name, value }];
    }));
    const discountTypesMap = new Map<string, string | null>((discountTypesRes.data ?? []).map((dt: Record<string, unknown>) => [String(dt.id), (dt?.name ?? dt?.label) as string | null]));

    const rawStudents = studentsRes.error ? [] : (studentsRes.data ?? []);
    const students = rawStudents.map((s: Record<string, unknown>) => ({
      ...s,
      last_checkin_at: s.last_checkin_at ?? null,
      display_order: s.display_order ?? null,
      active: (s.status ?? "").toString().toLowerCase() === "active",
      current_belt: s.current_belt_id
        ? { name: (belts as Array<{ id: string; name: string | null }>).find((b) => b.id === s.current_belt_id)?.name ?? null }
        : null,
    }));

    const contracts = rawContracts.map((c: Record<string, unknown>) => ({
      student_contract_id: c.id,
      student_id: c.student_id,
      program_id: c.program_id,
      program_name: c.program_id ? (programsMap.get(c.program_id as string) ?? null) : null,
      membership_duration_id: c.membership_duration_id ?? null,
      membership_duration_name: c.membership_duration_id ? (durationsMap.get(c.membership_duration_id as string) ?? null) : null,
      weekly_frequency_option_id: c.weekly_frequency_option_id ?? null,
      weekly_frequency_label: c.weekly_frequency_option_id ? (freqMap.get(c.weekly_frequency_option_id as string)?.name ?? null) : null,
      weekly_frequency_value: c.weekly_frequency_option_id ? (freqMap.get(c.weekly_frequency_option_id as string)?.value ?? null) : null,
      contract_type: c.contract_type ?? null,
      contract_status: c.status ?? null,
      start_date: c.start_date,
      end_date: c.end_date,
      registration_fee: c.registration_fee != null ? Number(c.registration_fee) : null,
      tuition_fee: c.tuition_fee != null ? Number(c.tuition_fee) : null,
      discount_type_id: c.discount_type_id ?? null,
      discount_type_name: c.discount_type_id ? (discountTypesMap.get(c.discount_type_id as string) ?? null) : null,
      discount_mode: c.discount_mode ?? null,
      discount_scope: c.discount_scope ?? null,
      discount_value: c.discount_value != null ? Number(c.discount_value) : null,
      final_tuition_fee: c.final_tuition_fee != null ? Number(c.final_tuition_fee) : null,
      pricing_snapshot: c.pricing_snapshot ?? null,
      note: c.note ?? null,
      days_remaining:
        c.end_date != null
          ? Math.ceil((new Date(c.end_date as string).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
    }));

    const expiringRaw = expiringRes.error ? [] : (expiringRes.data ?? []);
    const expiringStudentIds = [...new Set((expiringRaw as Array<{ student_id: string }>).map((r) => r.student_id).filter(Boolean))];
    const expiringRows = expiringStudentIds.map((student_id) => ({ student_id }));

    const byStatus = (students as Array<{ status?: string }>).reduce(
      (acc, s) => {
        const st = (s.status ?? "").toLowerCase();
        if (st === "active") acc.active++;
        else if (st === "hold") acc.hold++;
        else acc.inactive++;
        return acc;
      },
      { active: 0, hold: 0, inactive: 0 }
    );
    const summary = {
      total_students: students.length,
      active_students: byStatus.active,
      hold_students: byStatus.hold,
      inactive_students: byStatus.inactive,
      expiring_7_days: expiringStudentIds.length,
    };

    return NextResponse.json(
      {
        summary,
        students,
        contracts,
        expiringRows,
        belts,
        ...(loadError && { loadError }),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=20, stale-while-revalidate=30",
        },
      }
    );
  } catch (e) {
    console.error("GET /api/students", e);
    return NextResponse.json(
      { summary: null, students: [], contracts: [], expiringRows: [], belts: [] },
      { status: 200 }
    );
  }
}
