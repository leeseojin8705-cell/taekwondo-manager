import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ movements: [] }, { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 300, 500);
    const direction = searchParams.get("direction") || undefined;

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    });

    let query = supabase
      .from("inventory_movements")
      .select("id,movement_date,direction,quantity,unit_cost,total_cost,reason,vendor_name,reference_type,reference_id,note,inventory_item_id,inventory_variant_id,student_id")
      .order("movement_date", { ascending: false })
      .limit(limit);

    if (direction === "in" || direction === "out") {
      query = query.eq("direction", direction);
    }

    const { data: movements, error } = await query;

    if (error || !movements?.length) {
      return NextResponse.json({ movements: movements ?? [] }, { status: 200 });
    }

    const itemIds = [...new Set(movements.map((m) => m.inventory_item_id).filter(Boolean))] as string[];
    const variantIds = [...new Set(movements.map((m) => m.inventory_variant_id).filter(Boolean))] as string[];
    const studentIds = [...new Set(movements.map((m) => m.student_id).filter(Boolean))] as string[];

    const [itemsRes, variantsRes, studentsRes] = await Promise.all([
      itemIds.length ? supabase.from("inventory_items").select("id,name").in("id", itemIds) : { data: [] },
      variantIds.length ? supabase.from("inventory_variants").select("id,variant_name,inventory_item_id").in("id", variantIds) : { data: [] },
      studentIds.length ? supabase.from("students").select("id,name,full_name").in("id", studentIds) : { data: [] },
    ]);

    const itemsById = new Map((itemsRes.data ?? []).map((r: { id: string; name?: string | null }) => [r.id, { id: r.id, name: r.name ?? null }]));
    const variantsById = new Map((variantsRes.data ?? []).map((r: { id: string; variant_name?: string | null; inventory_item_id?: string }) => [r.id, { id: r.id, variant_name: r.variant_name ?? null, inventory_item_id: r.inventory_item_id }]));
    const studentsById = new Map((studentsRes.data ?? []).map((s: { id: string; name?: string | null; full_name?: string | null }) => [s.id, { id: s.id, name: s.name ?? null, full_name: s.full_name ?? null }]));

    const out = movements.map((m) => ({
      id: m.id,
      movement_date: m.movement_date,
      direction: m.direction,
      quantity: m.quantity,
      unit_cost: m.unit_cost ?? null,
      total_cost: m.total_cost ?? null,
      reason: m.reason ?? "",
      vendor_name: m.vendor_name ?? null,
      reference_type: m.reference_type ?? null,
      reference_id: m.reference_id ?? null,
      note: m.note ?? null,
      inventory_items: m.inventory_item_id ? itemsById.get(m.inventory_item_id) ?? null : null,
      inventory_variants: m.inventory_variant_id ? variantsById.get(m.inventory_variant_id) ?? null : null,
      students: m.student_id ? studentsById.get(m.student_id) ?? null : null,
    }));

    return NextResponse.json({ movements: out });
  } catch (e) {
    console.error("GET /api/inventory/movements", e);
    return NextResponse.json({ movements: [] }, { status: 200 });
  }
}
