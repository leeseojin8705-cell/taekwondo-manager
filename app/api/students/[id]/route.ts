import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await params;
  if (!studentId) {
    return NextResponse.json({ error: "Missing student id" }, { status: 400 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 }
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

    const [
      studentRes,
      medicalRes,
      contractsRes,
      notesRes,
      documentsRes,
      holdRes,
      attendanceRes,
      paymentsRes,
      invoicesRes,
      programsRes,
      beltsRes,
      classesRes,
      inactiveReasonsRes,
    ] = await Promise.all([
      supabase
        .from("students")
        .select("id,name,full_name,photo_url,gender,date_of_birth,join_date,status,memo,parent_name,phone,email,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship,current_belt_id")
        .eq("id", studentId)
        .maybeSingle(),

      supabase
        .from("student_medical_body_notes")
        .select("id,allergies,medications,diagnosis,notes,created_at,updated_at")
        .eq("student_id", studentId)
        .maybeSingle(),

      supabase
        .from("student_contracts")
        .select("id,student_id,program_id,membership_duration_id,weekly_frequency_option_id,start_date,end_date,status,auto_renew,contract_price,discount_amount,final_price,registration_fee,uniform_fee,equipment_fee,other_fee,total_amount,note,created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),

      supabase
        .from("student_notes")
        .select("id,note_type,title,note,created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),

      supabase
        .from("student_documents")
        .select("id,title,file_url,file_name,note,created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),

      supabase
        .from("student_hold_logs")
        .select("id,hold_start_date,hold_end_date,status,reason_note,created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),

      supabase
        .from("attendance_logs")
        .select("id,student_id,checkin_date,checkin_time,checkin_source")
        .eq("student_id", studentId)
        .order("checkin_time", { ascending: false })
        .limit(20),

      supabase
        .from("payments")
        .select("id,payment_date,payment_amount,payment_status,payment_method")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(10),

      supabase
        .from("invoices")
        .select("id,invoice_number,due_date,total_amount,balance_amount,invoice_status")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(10),

      supabase.from("programs").select("id,name"),
      supabase.from("belts").select("id,name"),
      supabase.from("classes").select("id,name"),
      supabase.from("inactive_reasons").select("id,name"),
    ]);

    if (studentRes.error || !studentRes.data) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const programs = (programsRes.data ?? []) as Array<{ id: string; name: string | null }>;
    const belts = (beltsRes.data ?? []) as Array<{ id: string; name: string | null }>;
    const classes = (classesRes.error ? [] : classesRes.data ?? []) as Array<{ id: string; name: string | null }>;
    const inactiveReasons = (inactiveReasonsRes.error ? [] : inactiveReasonsRes.data ?? []) as Array<{ id: string; name: string | null }>;

    const student = studentRes.data as Record<string, unknown>;
    const studentRow = {
      ...student,
      birth_date: student.date_of_birth ?? student.birth_date ?? null,
      parent_phone: student.phone ?? student.parent_phone ?? null,
      parent_email: student.email ?? student.parent_email ?? null,
      english_name: student.english_name ?? null,
      class_id: student.class_id ?? null,
      inactive_reason_id: student.inactive_reason_id ?? null,
      classes: student.class_id ? (classes.find((c) => c.id === student.class_id) ?? null) : null,
      belts: student.current_belt_id ? (belts.find((b) => b.id === student.current_belt_id) ?? null) : null,
      inactive_reasons: student.inactive_reason_id ? (inactiveReasons.find((r) => r.id === student.inactive_reason_id) ?? null) : null,
    };

    const contracts = (contractsRes.data ?? []).map((c: Record<string, unknown>) => ({
      ...c,
      programs: c.program_id ? (programs.find((p) => p.id === c.program_id) ?? null) : null,
      membership_durations: null,
      weekly_frequency_options: null,
    }));

    const documents = (documentsRes.error ? [] : (documentsRes.data ?? [])).map((d: Record<string, unknown>) => ({
      ...d,
      document_types: null,
    }));

    const holdLogs = (holdRes.error ? [] : (holdRes.data ?? [])).map((h: Record<string, unknown>) => ({
      ...h,
      hold_reasons: null,
    }));

    return NextResponse.json({
      student: studentRow,
      medical: medicalRes.error ? null : medicalRes.data,
      contracts,
      notes: notesRes.error ? [] : (notesRes.data ?? []),
      documents,
      holdLogs,
      attendance: attendanceRes.error ? [] : (attendanceRes.data ?? []),
      payments: paymentsRes.error ? [] : (paymentsRes.data ?? []),
      invoices: invoicesRes.error ? [] : (invoicesRes.data ?? []),
    });
  } catch (e) {
    console.error("GET /api/students/[id]", e);
    return NextResponse.json(
      { error: "Failed to load student" },
      { status: 500 }
    );
  }
}
