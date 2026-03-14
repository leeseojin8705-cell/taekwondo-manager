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
      classesRes,
      beltsRes,
      tagsRes,
      tagLinksRes,
      medicalRes,
      inactiveReasonsRes,
    ] = await Promise.all([
      supabase
        .from("students")
        .select("id,name,full_name,gender,date_of_birth,join_date,status,photo_url,current_belt_id,parent_name,phone,email,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship,memo,parent_requests")
        .eq("id", studentId)
        .maybeSingle(),

      supabase.from("classes").select("id,name,display_order").eq("active", true).order("display_order", { ascending: true }).order("name", { ascending: true }),
      supabase.from("belts").select("id,name").eq("active", true).order("name", { ascending: true }),
      supabase.from("student_tags").select("id,name,color,active").eq("active", true).order("name", { ascending: true }),
      supabase.from("student_tag_links").select("tag_id").eq("student_id", studentId),
      supabase.from("student_medical_body_notes").select("id,allergies,medications,diagnosis,notes").eq("student_id", studentId).maybeSingle(),
      supabase.from("inactive_reasons").select("id,name,active").eq("active", true).order("name", { ascending: true }),
    ]);

    if (studentRes.error || !studentRes.data) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const s = studentRes.data as Record<string, unknown>;
    const student = {
      ...s,
      birth_date: s.date_of_birth ?? s.birth_date ?? null,
      parent_phone: s.phone ?? s.parent_phone ?? null,
      parent_email: s.email ?? s.parent_email ?? null,
      english_name: s.english_name ?? null,
      class_id: s.class_id ?? null,
      inactive_reason_id: s.inactive_reason_id ?? null,
    };

    return NextResponse.json({
      student,
      classes: classesRes.error ? [] : (classesRes.data ?? []),
      belts: beltsRes.error ? [] : (beltsRes.data ?? []),
      tags: tagsRes.error ? [] : (tagsRes.data ?? []),
      tagLinks: tagLinksRes.error ? [] : (tagLinksRes.data ?? []),
      medical: medicalRes.error ? null : medicalRes.data,
      inactiveReasons: inactiveReasonsRes.error ? [] : (inactiveReasonsRes.data ?? []),
    });
  } catch (e) {
    console.error("GET /api/students/[id]/edit", e);
    return NextResponse.json(
      { error: "Failed to load edit data" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
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

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const {
      studentPayload,
      selectedTagIds = [],
      medicalPayload,
      medicalRowId = null,
      hasMedicalValue = false,
    } = body as {
      studentPayload?: Record<string, unknown>;
      selectedTagIds?: string[];
      medicalPayload?: Record<string, unknown>;
      medicalRowId?: string | null;
      hasMedicalValue?: boolean;
    };
    if (!studentPayload || typeof studentPayload !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid studentPayload" },
        { status: 400 }
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

    const { error: deleteTagLinksError } = await supabase
      .from("student_tag_links")
      .delete()
      .eq("student_id", studentId);
    if (deleteTagLinksError) {
      console.warn("student_tag_links delete:", deleteTagLinksError.message);
    }

    if (Array.isArray(selectedTagIds) && selectedTagIds.length > 0) {
      const tagPayload = selectedTagIds.map((tagId: string) => ({
        student_id: studentId,
        tag_id: tagId,
      }));
      const { error: insertTagError } = await supabase
        .from("student_tag_links")
        .insert(tagPayload);
      if (insertTagError) {
        console.warn("student_tag_links insert:", insertTagError.message);
      }
    }

    const nameVal = (studentPayload.name ?? studentPayload.full_name) as string | undefined;
    const baseUpdate: Record<string, unknown> = {
      gender: studentPayload.gender ?? null,
      date_of_birth: studentPayload.birth_date ?? studentPayload.date_of_birth ?? null,
      join_date: studentPayload.join_date ?? null,
      status: studentPayload.status ?? "active",
      photo_url: studentPayload.photo_url ?? null,
      current_belt_id: studentPayload.current_belt_id ?? null,
      parent_name: studentPayload.parent_name ?? null,
      phone: studentPayload.parent_phone ?? studentPayload.phone ?? null,
      email: studentPayload.parent_email ?? studentPayload.email ?? null,
      emergency_contact_name: studentPayload.emergency_contact_name ?? null,
      emergency_contact_phone: studentPayload.emergency_contact_phone ?? null,
      emergency_contact_relationship: studentPayload.emergency_contact_relationship ?? null,
      memo: studentPayload.memo ?? null,
      parent_requests: studentPayload.parent_requests ?? null,
    };
    let studentUpdateError = (
      await supabase.from("students").update({ ...baseUpdate, full_name: nameVal ?? null }).eq("id", studentId)
    ).error;
    if (studentUpdateError?.message?.includes("full_name")) {
      studentUpdateError = (
        await supabase.from("students").update({ ...baseUpdate, name: nameVal ?? null }).eq("id", studentId)
      ).error;
    }
    if (studentUpdateError) {
      console.error("students update:", studentUpdateError.message);
      return NextResponse.json(
        { error: studentUpdateError.message },
        { status: 400 }
      );
    }

    if (medicalPayload) {
      if (medicalRowId) {
        if (hasMedicalValue) {
          const { error: medicalUpdateError } = await supabase
            .from("student_medical_body_notes")
            .update(medicalPayload)
            .eq("id", medicalRowId);
          if (medicalUpdateError) console.warn("medical update:", medicalUpdateError.message);
        } else {
          const { error: medicalDeleteError } = await supabase
            .from("student_medical_body_notes")
            .delete()
            .eq("id", medicalRowId);
          if (medicalDeleteError) console.warn("medical delete:", medicalDeleteError.message);
        }
      } else if (hasMedicalValue) {
        const { error: medicalInsertError } = await supabase
          .from("student_medical_body_notes")
          .insert(medicalPayload);
        if (medicalInsertError) console.warn("medical insert:", medicalInsertError.message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/students/[id]/edit", e);
    return NextResponse.json(
      { error: "Failed to save student" },
      { status: 500 }
    );
  }
}
