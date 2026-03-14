"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "../../../components/ui/AppShell";
import { supabase } from "../../../lib/supabase";

type OptionRow = {
  id: string;
  name?: string;
  label?: string;
  duration_unit?: string;
  duration_value?: number;
  price?: number | null;
};

type TagRow = {
  id: string;
  name: string;
  color: string | null;
};

type PricingItemRow = {
  id: string;
  name: string;
  unit_price: number | null;
};

type EquipmentLine = {
  pricing_item_id: string;
  name: string;
  unit_price: number;
  quantity: number;
};

function combineFirstMiddleLast(first: string, middle: string, last: string): string {
  return [first.trim(), middle.trim(), last.trim()].filter(Boolean).join(" ");
}

type FormState = {
  student_code: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  photo_url: string;
  date_of_birth: string;
  gender: string;
  join_date: string;
  status: string;
  current_belt_id: string;
  parent_name: string;
  phone: string;
  email: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  medical_note: string;
  memo: string;
  parent_requests: string;

  program_id: string;
  selected_program_ids: string[];
  membership_duration_id: string;
  weekly_frequency_option_id: string;
  contract_start_date: string;
  contract_end_date: string;

  registration_fee: string;
  tuition_fee: string;
  discount_type_id: string;
  discount_mode: string;
  discount_scope: string;
  discount_value: string;
  final_tuition_fee: string;
  uniform_fee: string;
  equipment_fee: string;
  other_fee: string;
  contract_note: string;
};

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function calculateEndDate(startDate: string, durationUnit?: string, durationValue?: number) {
  if (!startDate || !durationUnit || !durationValue || durationUnit === "custom") {
    return "";
  }

  const date = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  if (durationUnit === "day") {
    date.setDate(date.getDate() + durationValue - 1);
  } else if (durationUnit === "week") {
    date.setDate(date.getDate() + durationValue * 7 - 1);
  } else if (durationUnit === "month") {
    date.setMonth(date.getMonth() + durationValue);
    date.setDate(date.getDate() - 1);
  } else if (durationUnit === "year") {
    date.setFullYear(date.getFullYear() + durationValue);
    date.setDate(date.getDate() - 1);
  } else {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildFinalTuition(tuitionFee: string, discountMode: string, discountValue: string) {
  const tuition = toNumber(tuitionFee);
  const discount = toNumber(discountValue);

  if (!discountMode || discount <= 0) {
    return tuition.toFixed(2);
  }

  if (discountMode === "percent") {
    const result = tuition - tuition * (discount / 100);
    return Math.max(result, 0).toFixed(2);
  }

  if (discountMode === "manual_amount") {
    const result = tuition - discount;
    return Math.max(result, 0).toFixed(2);
  }

  return tuition.toFixed(2);
}

const MAX_PHOTO_SIZE_MB = 1;

function PhotoPreview({ url, onRemove }: { url: string; onRemove?: () => void }) {
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    setLoadError(false);
  }, [url]);
  return (
    <div style={{ marginTop: 8, position: "relative", display: "inline-block" }}>
      {!loadError ? (
        <>
          <img
            src={url}
            alt="Preview"
            style={{
              width: 96,
              height: 96,
              objectFit: "cover",
              borderRadius: 8,
              border: "1px solid #374151",
              background: "#1f2937",
            }}
            onError={() => setLoadError(true)}
          />
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 24,
                height: 24,
                borderRadius: 4,
                border: "none",
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                fontSize: 14,
                cursor: "pointer",
                lineHeight: 1,
              }}
              aria-label="Remove photo"
            >
              ×
            </button>
          ) : null}
        </>
      ) : (
        <span style={{ fontSize: 12, color: "#f87171" }}>
          Image could not be loaded
        </span>
      )}
    </div>
  );
}

function NewStudentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isKiosk = searchParams.get("kiosk") === "1";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [programs, setPrograms] = useState<OptionRow[]>([]);
  const [belts, setBelts] = useState<OptionRow[]>([]);
  const [durations, setDurations] = useState<OptionRow[]>([]);
  const [frequencies, setFrequencies] = useState<OptionRow[]>([]);
  const [discountTypes, setDiscountTypes] = useState<OptionRow[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [pricingItems, setPricingItems] = useState<PricingItemRow[]>([]);
  const [equipmentLines, setEquipmentLines] = useState<EquipmentLine[]>([]);
  const [equipmentAddItemId, setEquipmentAddItemId] = useState("");
  const [equipmentAddQty, setEquipmentAddQty] = useState("1");

  const photoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    student_code: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    photo_url: "",
    date_of_birth: "",
    gender: "",
    join_date: getTodayString(),
    status: "active",
    current_belt_id: "",
    parent_name: "",
    phone: "",
    email: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    medical_note: "",
    memo: "",
    parent_requests: "",

    program_id: "",
    selected_program_ids: [],
    membership_duration_id: "",
    weekly_frequency_option_id: "",
    contract_start_date: getTodayString(),
    contract_end_date: "",

    registration_fee: "0",
    tuition_fee: "0",
    discount_type_id: "",
    discount_mode: "",
    discount_scope: "tuition_only",
    discount_value: "0",
    final_tuition_fee: "0",
    uniform_fee: "0",
    equipment_fee: "0",
    other_fee: "0",
    contract_note: "",
  });

  async function loadOptions() {
    try {
      setLoading(true);
      setError(null);

      const [
        programsRes,
        beltsRes,
        durationsRes,
        frequenciesRes,
        discountTypesRes,
        tagsRes,
      ] = await Promise.all([
        supabase
          .from("programs")
          .select("id, name, price")
          .eq("active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("belts")
          .select("id, name")
          .eq("active", true)
          .order("name", { ascending: true }),
        supabase
          .from("membership_durations")
          .select("id, name, duration_unit, duration_value")
          .eq("active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("weekly_frequency_options")
          .select("id, label")
          .eq("active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("discount_types")
          .select("id, name")
          .eq("active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("student_tags")
          .select("id, name, color")
          .eq("active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
      ]);

      setPrograms(((programsRes.error ? [] : programsRes.data ?? []) as unknown[]) as OptionRow[]);
      setBelts(((beltsRes.error ? [] : beltsRes.data ?? []) as unknown[]) as OptionRow[]);
      setDurations(((durationsRes.error ? [] : durationsRes.data ?? []) as unknown[]) as OptionRow[]);
      setFrequencies(((frequenciesRes.error ? [] : frequenciesRes.data ?? []) as unknown[]) as OptionRow[]);
      setDiscountTypes(((discountTypesRes.error ? [] : discountTypesRes.data ?? []) as unknown[]) as OptionRow[]);
      setTags(((tagsRes.error ? [] : tagsRes.data ?? []) as unknown[]) as TagRow[]);

      const pricingItemsRes = await supabase
        .from("pricing_items")
        .select("id, name, unit_price")
        .eq("active", true)
        .order("name", { ascending: true });
      if (pricingItemsRes.error) {
        console.warn("pricing_items load failed (equipment dropdown may be empty):", pricingItemsRes.error);
        setPricingItems([]);
      } else {
        setPricingItems(((pricingItemsRes.data ?? []) as unknown[]) as PricingItemRow[]);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load new student setup data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOptions();
  }, []);

  const selectedDuration = useMemo(() => {
    return durations.find((item) => item.id === form.membership_duration_id);
  }, [durations, form.membership_duration_id]);

  useEffect(() => {
    if (!form.contract_start_date || !selectedDuration) return;

    const nextEndDate = calculateEndDate(
      form.contract_start_date,
      selectedDuration.duration_unit,
      selectedDuration.duration_value
    );

    setForm((prev) => ({
      ...prev,
      contract_end_date: nextEndDate,
    }));
  }, [form.contract_start_date, selectedDuration]);

  useEffect(() => {
    const nextFinal = buildFinalTuition(
      form.tuition_fee,
      form.discount_mode,
      form.discount_value
    );

    setForm((prev) => {
      if (prev.final_tuition_fee === nextFinal) return prev;
      return {
        ...prev,
        final_tuition_fee: nextFinal,
      };
    });
  }, [form.tuition_fee, form.discount_mode, form.discount_value]);

  const equipmentTotal = useMemo(() => {
    return equipmentLines.reduce(
      (sum, line) => sum + line.unit_price * line.quantity,
      0
    );
  }, [equipmentLines]);

  const grandTotal = useMemo(() => {
    const registration = toNumber(form.registration_fee);
    const finalTuition = toNumber(form.final_tuition_fee);
    const uniform = toNumber(form.uniform_fee);
    const other = toNumber(form.other_fee);
    return (
      registration +
      finalTuition +
      uniform +
      equipmentTotal +
      other
    ).toFixed(2);
  }, [
    form.registration_fee,
    form.final_tuition_fee,
    form.uniform_fee,
    form.other_fee,
    equipmentTotal,
  ]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  function addEquipmentLine() {
    const item = pricingItems.find((p) => p.id === equipmentAddItemId);
    const qty = Math.max(1, parseInt(equipmentAddQty, 10) || 1);
    if (!item) return;
    setEquipmentLines((prev) => [
      ...prev,
      {
        pricing_item_id: item.id,
        name: item.name ?? "",
        unit_price: item.unit_price ?? 0,
        quantity: qty,
      },
    ]);
    setEquipmentAddItemId("");
    setEquipmentAddQty("1");
  }

  function removeEquipmentLine(index: number) {
    setEquipmentLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      const fullName = combineFirstMiddleLast(
        form.first_name,
        form.middle_name,
        form.last_name
      );
      if (!fullName) {
        setError("First name, Middle name, or Last name is required.");
        setSaving(false);
        return;
      }

      const hasProgram = form.program_id || (form.selected_program_ids?.length ?? 0) > 0;
      if (!hasProgram) {
        setError("At least one program is required.");
        setSaving(false);
        return;
      }

      if (!form.weekly_frequency_option_id) {
        setError("Weekly Frequency is required.");
        setSaving(false);
        return;
      }

      if (!form.contract_start_date || !form.contract_end_date) {
        setError("Contract dates are required.");
        setSaving(false);
        return;
      }

      const pricingSnapshot = {
        registration_fee: toNumber(form.registration_fee),
        tuition_fee: toNumber(form.tuition_fee),
        discount_type_id: form.discount_type_id || null,
        discount_mode: form.discount_mode || null,
        discount_scope: form.discount_scope || null,
        discount_value: toNumber(form.discount_value),
        final_tuition_fee: toNumber(form.final_tuition_fee),
        grand_total: toNumber(grandTotal),
        equipment_lines: equipmentLines.map((line) => ({
          pricing_item_id: line.pricing_item_id,
          name: line.name,
          unit_price: line.unit_price,
          quantity: line.quantity,
          line_total: line.unit_price * line.quantity,
        })),
      };

      const totalAmount =
        toNumber(form.registration_fee) +
        toNumber(form.final_tuition_fee) +
        toNumber(form.uniform_fee) +
        equipmentTotal +
        toNumber(form.other_fee);

      const p_student = {
        student_code: form.student_code.trim() || null,
        name: fullName,
        full_name: fullName,
        photo_url: form.photo_url.trim() || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        join_date: form.join_date || null,
        status: form.status,
        current_belt_id: form.current_belt_id || null,
        parent_name: form.parent_name.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        emergency_contact_relationship: form.emergency_contact_relationship.trim() || null,
        medical_note: form.medical_note.trim() || null,
        memo: form.memo.trim() || null,
        parent_requests: form.parent_requests.trim() || null,
        active: true,
      };

      const allProgramIds = form.program_id
        ? [form.program_id, ...(form.selected_program_ids || []).filter((id) => id && id !== form.program_id)]
        : (form.selected_program_ids || []).filter(Boolean);
      const p_contract = {
        program_id: allProgramIds[0] || form.program_id,
        extra_program_ids: allProgramIds.length > 1 ? allProgramIds.slice(1) : [],
        membership_duration_id: form.membership_duration_id || null,
        weekly_frequency_option_id: form.weekly_frequency_option_id,
        contract_type: "membership",
        status: form.status === "hold" ? "hold" : "active",
        start_date: form.contract_start_date,
        end_date: form.contract_end_date,
        registration_fee: toNumber(form.registration_fee),
        tuition_fee: toNumber(form.tuition_fee),
        discount_type_id: form.discount_type_id || null,
        discount_mode: form.discount_mode || null,
        discount_scope: form.discount_scope || null,
        discount_value: toNumber(form.discount_value),
        final_tuition_fee: toNumber(form.final_tuition_fee),
        uniform_fee: toNumber(form.uniform_fee),
        equipment_fee: equipmentTotal,
        other_fee: toNumber(form.other_fee),
        total_amount: totalAmount,
        pricing_snapshot: pricingSnapshot,
        note: form.contract_note.trim() || null,
      };

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "create_student_with_contract",
        {
          p_student,
          p_tag_ids: selectedTagIds,
          p_contract,
        }
      );

      if (rpcError) throw rpcError;

      const studentId = (rpcData as { student_id?: string } | null)?.student_id;

      if (isKiosk) {
        router.push("/checkin/kiosk");
      } else if (studentId) {
        // 정상적으로 student_id가 반환되면 바로 프린트 페이지로 이동
        router.push(`/students/${studentId}/print`);
      } else {
        // 예외적으로 student_id가 없으면 리스트로만 이동 (안전장치)
        console.warn("create_student_with_contract did not return student_id; redirecting to students list.");
        router.push("/students");
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Failed to save student.";
      let hint = "";
      if (msg.includes("create_student_with_contract") || msg.includes("function")) hint = " Run the entire scripts/create_student_with_contract_rpc.sql in Supabase SQL Editor.";
      else if (msg.includes("emergency_contact_relationship") || msg.includes("relationship")) hint = " Run scripts/students_optional_relationship.sql in Supabase to make Relationship optional.";
      else if (msg.includes("column \"name\"") && msg.includes("not-null")) hint = " Run the entire scripts/create_student_with_contract_rpc.sql in Supabase SQL Editor (it fills name from full_name).";
      else if (msg.includes("does not exist") && (msg.includes("student_contracts") || msg.includes("students"))) hint = " Run the entire scripts/create_student_with_contract_rpc.sql in Supabase (adds missing columns: uniform_fee, total_amount, etc.).";
      else if (msg.includes("payment_number") && msg.includes("not-null")) hint = " Re-run the entire scripts/create_student_with_contract_rpc.sql in Supabase SQL Editor (it now sets payment_number on insert).";
      setError(msg + hint);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title={isKiosk ? "New Student Registration" : "New Student"}
      description={
        isKiosk
          ? "Please fill in the form. You will return to the kiosk after saving."
          : "Create a new student profile and first membership contract."
      }
    >
      <div style={{ display: "grid", gap: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link href="/" style={secondaryButtonStyle}>
              Dashboard
            </Link>
            {isKiosk ? (
              <Link href="/checkin/kiosk" style={secondaryButtonStyle}>
                Back to Kiosk
              </Link>
            ) : (
              <Link href="/students" style={secondaryButtonStyle}>
                Back to Students
              </Link>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              style={{
                ...primaryButtonStyle,
                opacity: saving || loading ? 0.6 : 1,
                cursor: saving || loading ? "not-allowed" : "pointer",
              }}
            >
              {saving
                ? "Saving..."
                : isKiosk
                ? "Save and Return to Kiosk"
                : "Save Student"}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={cardStyle}>
            <span style={{ color: "#e5e7eb", fontWeight: 700 }}>Loading setup data...</span>
          </div>
        ) : error ? (
          <div
            style={{
              ...cardStyle,
              border: "1px solid #7f1d1d",
              background: "rgba(127,29,29,0.25)",
            }}
          >
            <div style={{ color: "#fecaca", fontWeight: 700 }}>Error</div>
            <div style={{ marginTop: 8, color: "#fecaca" }}>{error}</div>
          </div>
        ) : (
          <>
            <div
              style={{
                padding: "14px 20px",
                background: "rgba(37,99,235,0.15)",
                border: "1px solid #1d4ed8",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                color: "#bfdbfe",
              }}
            >
              Please fill in all required fields. Membership summary updates automatically on the right.
            </div>

            <div style={cardStyle}>
              <h2 style={sectionTitleStyle}>Student Info</h2>
              <p style={sectionDescStyle}>Required fields are marked with <span style={requiredStarStyle}>*</span>.</p>

              <div style={grid3Style}>
                <div>
                  <label style={labelStyle}>Student ID</label>
                  <input
                    value={form.student_code}
                    onChange={(e) => updateField("student_code", e.target.value)}
                    style={inputStyle}
                    placeholder="Optional internal code"
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 16,
                  }}
                >
                  <div>
                    <label style={labelStyle}>First Name <span style={requiredStarStyle}>*</span></label>
                    <input
                      value={form.first_name}
                      onChange={(e) => updateField("first_name", e.target.value)}
                      style={inputStyle}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Middle Name</label>
                    <input
                      value={form.middle_name}
                      onChange={(e) => updateField("middle_name", e.target.value)}
                      style={inputStyle}
                      placeholder="Middle name"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name <span style={requiredStarStyle}>*</span></label>
                    <input
                      value={form.last_name}
                      onChange={(e) => updateField("last_name", e.target.value)}
                      style={inputStyle}
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Photo</label>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
                        setError(`Please select a photo under ${MAX_PHOTO_SIZE_MB}MB.`);
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const dataUrl = reader.result as string;
                        if (dataUrl) updateField("photo_url", dataUrl);
                      };
                      reader.readAsDataURL(file);
                      e.target.value = "";
                    }}
                  />
                  {form.photo_url.trim() ? (
                    <PhotoPreview
                      url={form.photo_url.trim()}
                      onRemove={() => updateField("photo_url", "")}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 96,
                        height: 96,
                        borderRadius: 8,
                        border: "2px dashed #4b5563",
                        background: "#1f2937",
                        color: "#9ca3af",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Add Photo
                    </button>
                  )}
                  <div style={{ marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        const url = window.prompt("Enter image URL");
                        if (url != null && url.trim()) updateField("photo_url", url.trim());
                      }}
                      style={{
                        fontSize: 12,
                        color: "#60a5fa",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Enter URL
                    </button>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Date of Birth <span style={requiredStarStyle}>*</span></label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => updateField("date_of_birth", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Gender <span style={requiredStarStyle}>*</span></label>
                  <select
                    value={form.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Join Date <span style={requiredStarStyle}>*</span></label>
                  <input
                    type="date"
                    value={form.join_date}
                    onChange={(e) => updateField("join_date", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                    style={inputStyle}
                  >
                    <option value="active">Active</option>
                    <option value="hold">Hold</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Current Belt</label>
                  <select
                    value={form.current_belt_id}
                    onChange={(e) => updateField("current_belt_id", e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select Belt</option>
                    {belts.map((belt) => (
                      <option key={belt.id} value={belt.id}>
                        {belt.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Memo</label>
                  <input
                    value={form.memo}
                    onChange={(e) => updateField("memo", e.target.value)}
                    style={inputStyle}
                    placeholder="Optional memo"
                  />
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={sectionTitleStyle}>Parent Contact</h2>
              <p style={sectionDescStyle}>Please fill in the fields.</p>

              <div style={grid2Style}>
                <div>
                  <label style={labelStyle}>Parent Name <span style={requiredStarStyle}>*</span></label>
                  <input
                    value={form.parent_name}
                    onChange={(e) => updateField("parent_name", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Phone Number <span style={requiredStarStyle}>*</span></label>
                  <input
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Address</label>
                  <input
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={sectionTitleStyle}>Emergency Contact</h2>
              <p style={sectionDescStyle}>Please fill in the fields.</p>

              <div style={grid3Style}>
                <div>
                  <label style={labelStyle}>Emergency Contact Name <span style={requiredStarStyle}>*</span></label>
                  <input
                    value={form.emergency_contact_name}
                    onChange={(e) =>
                      updateField("emergency_contact_name", e.target.value)
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Emergency Phone <span style={requiredStarStyle}>*</span></label>
                  <input
                    value={form.emergency_contact_phone}
                    onChange={(e) =>
                      updateField("emergency_contact_phone", e.target.value)
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Relationship</label>
                  <input
                    value={form.emergency_contact_relationship}
                    onChange={(e) =>
                      updateField("emergency_contact_relationship", e.target.value)
                    }
                    style={inputStyle}
                    placeholder="Mother / Father / Guardian"
                  />
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={sectionTitleStyle}>Medical Notes</h2>
              <p style={sectionDescStyle}>Please fill in the fields.</p>

              <div>
                <label style={labelStyle}>Medical Note</label>
                <textarea
                  value={form.medical_note}
                  onChange={(e) => updateField("medical_note", e.target.value)}
                  style={textareaStyle}
                  placeholder="General medical notes for now. Body map comes later."
                />
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={sectionTitleStyle}>Tags</h2>
              <p style={sectionDescStyle}>Select applicable tags for this student.</p>
              {tags.length === 0 ? (
                <div style={mutedTextStyle}>No tags. Add them in Settings &gt; Parent Preferences.</div>
              ) : (
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {tags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        style={{
                          borderRadius: 999,
                          padding: "8px 12px",
                          border: selected ? "1px solid #2563eb" : "1px solid #d1d5db",
                          background: selected ? "#eff6ff" : "#ffffff",
                          color: selected ? "#1d4ed8" : "#374151",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <h2 style={sectionTitleStyle}>Parent / Guardian requests</h2>
              <p style={sectionDescStyle}>What the parent or guardian wants for this student. Type here and it will be saved.</p>
              <textarea
                value={form.parent_requests}
                onChange={(e) => updateField("parent_requests", e.target.value)}
                placeholder="e.g. Prefer weekend classes, wants to focus on forms..."
                style={textareaStyle}
                rows={3}
              />
            </div>

            <div style={cardStyle}>
              <h2 style={sectionTitleStyle}>Enrollment Setup</h2>

              <div style={grid3Style}>
                <div>
                  <label style={labelStyle}>Program <span style={requiredStarStyle}>*</span></label>
                  <select
                    value={form.program_id}
                    onChange={(e) => {
                      const id = e.target.value;
                      const program = programs.find((p) => p.id === id);
                      const price =
                        program != null && typeof program.price === "number"
                          ? String(program.price)
                          : form.tuition_fee;
                      setForm((prev) => ({
                        ...prev,
                        program_id: id,
                        tuition_fee: price,
                      }));
                    }}
                    style={inputStyle}
                  >
                    <option value="">Select Program</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                        {typeof program.price === "number"
                          ? ` — $${program.price.toFixed(2)}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Additional programs (추가 프로그램, optional)</label>
                  <p style={{ ...sectionDescStyle, marginBottom: 6 }}>Select all programs to register. Same dates and fees apply.</p>
                  <select
                    multiple
                    value={form.selected_program_ids}
                    onChange={(e) => {
                      const selected = Array.from((e.target as HTMLSelectElement).selectedOptions, (o) => o.value).filter(Boolean);
                      setForm((prev) => ({
                        ...prev,
                        selected_program_ids: selected.filter((id) => id !== prev.program_id),
                      }));
                    }}
                    style={{ ...inputStyle, minHeight: 80 }}
                  >
                    {programs
                      .filter((p) => p.id !== form.program_id)
                      .map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.name}
                          {typeof program.price === "number" ? ` — $${program.price.toFixed(2)}` : ""}
                        </option>
                      ))}
                  </select>
                  <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Hold Ctrl (Windows) or Cmd (Mac) to select multiple.</p>
                </div>

                <div>
                  <label style={labelStyle}>Membership Duration (optional)</label>
                  <select
                    value={form.membership_duration_id}
                    onChange={(e) =>
                      updateField("membership_duration_id", e.target.value)
                    }
                    style={inputStyle}
                  >
                    <option value="">None</option>
                    {durations.map((duration) => (
                      <option key={duration.id} value={duration.id}>
                        {duration.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Weekly Frequency <span style={requiredStarStyle}>*</span></label>
                  <select
                    value={form.weekly_frequency_option_id}
                    onChange={(e) =>
                      updateField("weekly_frequency_option_id", e.target.value)
                    }
                    style={inputStyle}
                  >
                    <option value="">Select Frequency</option>
                    {frequencies.map((frequency) => (
                      <option key={frequency.id} value={frequency.id}>
                        {frequency.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Start Date <span style={requiredStarStyle}>*</span></label>
                  <input
                    type="date"
                    value={form.contract_start_date}
                    onChange={(e) =>
                      updateField("contract_start_date", e.target.value)
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>End Date</label>
                  <input
                    type="date"
                    value={form.contract_end_date}
                    onChange={(e) => updateField("contract_end_date", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Contract Note</label>
                  <input
                    value={form.contract_note}
                    onChange={(e) => updateField("contract_note", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={sectionTitleStyle}>Equipment / Supplies</h2>
              <p style={sectionDescStyle}>Add items from the pricing plan. Unit price comes from the plan; enter quantity. Total updates automatically.</p>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Item</label>
                  <select
                    value={equipmentAddItemId}
                    onChange={(e) => setEquipmentAddItemId(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select item</option>
                    {pricingItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} — ${(item.unit_price ?? 0).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={equipmentAddQty}
                    onChange={(e) => setEquipmentAddQty(e.target.value)}
                    style={{ ...inputStyle, width: 80 }}
                  />
                </div>
                <button
                  type="button"
                  onClick={addEquipmentLine}
                  disabled={!equipmentAddItemId}
                  style={{
                    ...primaryButtonStyle,
                    opacity: equipmentAddItemId ? 1 : 0.6,
                    cursor: equipmentAddItemId ? "pointer" : "not-allowed",
                  }}
                >
                  Add
                </button>
              </div>
              {equipmentLines.length > 0 && (
                <>
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ textAlign: "left", padding: "8px 12px" }}>Item</th>
                        <th style={{ textAlign: "right", padding: "8px 12px" }}>Unit Price</th>
                        <th style={{ textAlign: "right", padding: "8px 12px" }}>Qty</th>
                        <th style={{ textAlign: "right", padding: "8px 12px" }}>Total</th>
                        <th style={{ width: 60 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {equipmentLines.map((line, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "8px 12px" }}>{line.name}</td>
                          <td style={{ textAlign: "right", padding: "8px 12px" }}>${line.unit_price.toFixed(2)}</td>
                          <td style={{ textAlign: "right", padding: "8px 12px" }}>{line.quantity}</td>
                          <td style={{ textAlign: "right", padding: "8px 12px" }}>${(line.unit_price * line.quantity).toFixed(2)}</td>
                          <td style={{ padding: "8px 12px" }}>
                            <button
                              type="button"
                              onClick={() => removeEquipmentLine(idx)}
                              style={{ ...secondaryButtonStyle, padding: "4px 8px", fontSize: 12 }}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p style={{ margin: 0, fontWeight: 600 }}>Equipment total: ${equipmentTotal.toFixed(2)}</p>
                </>
              )}
            </div>

            <div style={cardStyle}>
              <h2 style={sectionTitleStyle}>Discount & Fee Summary</h2>
              <p style={sectionDescStyle}>Registration, tuition, uniform, and equipment from the pricing plan. Totals are stored on the contract and a payment is created automatically so dashboard revenue and reports reflect this amount. You can also create or view invoices in Finance.</p>

              <div style={grid3Style}>
                <div>
                  <label style={labelStyle}>Registration Fee</label>
                  <input
                    type="number"
                    value={form.registration_fee}
                    onChange={(e) => updateField("registration_fee", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Tuition Fee</label>
                  <input
                    type="number"
                    value={form.tuition_fee}
                    onChange={(e) => updateField("tuition_fee", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Discount Type</label>
                  <select
                    value={form.discount_type_id}
                    onChange={(e) => updateField("discount_type_id", e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select Discount Type</option>
                    {discountTypes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Discount Mode</label>
                  <select
                    value={form.discount_mode}
                    onChange={(e) => updateField("discount_mode", e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select Mode</option>
                    <option value="percent">Percent</option>
                    <option value="manual_amount">Manual Amount</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Discount Scope</label>
                  <select
                    value={form.discount_scope}
                    onChange={(e) => updateField("discount_scope", e.target.value)}
                    style={inputStyle}
                  >
                    <option value="tuition_only">Tuition Only</option>
                    <option value="registration_only">Registration Only</option>
                    <option value="invoice_total">Invoice Total</option>
                    <option value="specific_line_item">Specific Line Item</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Discount Value</label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) => updateField("discount_value", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Final Tuition</label>
                  <input
                    type="number"
                    value={form.final_tuition_fee}
                    onChange={(e) => updateField("final_tuition_fee", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Uniform Fee</label>
                  <input
                    type="number"
                    min={0}
                    value={form.uniform_fee}
                    onChange={(e) => updateField("uniform_fee", e.target.value)}
                    style={inputStyle}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Equipment Fee (from items above)</label>
                  <input value={`$${equipmentTotal.toFixed(2)}`} readOnly style={readOnlyInputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Other Fee</label>
                  <input
                    type="number"
                    min={0}
                    value={form.other_fee}
                    onChange={(e) => updateField("other_fee", e.target.value)}
                    style={inputStyle}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Total Amount</label>
                  <input value={grandTotal} readOnly style={readOnlyInputStyle} />
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Link href="/students" style={secondaryButtonStyle}>
                Cancel
              </Link>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  ...primaryButtonStyle,
                  opacity: saving ? 0.6 : 1,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : "Save Student"}
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function NewStudentPage() {
  return (
    <Suspense fallback={<AppShell title="New Student"><div style={{ padding: 24, color: "#94a3b8" }}>Loading...</div></AppShell>}>
      <NewStudentContent />
    </Suspense>
  );
}

const cardStyle: CSSProperties = {
  background: "#020617",
  border: "1px solid #1e293b",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 4px 18px rgba(0,0,0,0.35)",
};

const sectionTitleStyle: CSSProperties = {
  margin: "0 0 18px 0",
  fontSize: 18,
  fontWeight: 800,
  color: "#e5e7eb",
};

const sectionDescStyle: CSSProperties = {
  margin: "-8px 0 18px 0",
  fontSize: 13,
  color: "#94a3b8",
};

const grid2Style: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 20,
};

const grid3Style: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 20,
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontSize: 13,
  fontWeight: 700,
  color: "#cbd5f5",
};

const requiredStarStyle: CSSProperties = {
  color: "#dc2626",
  marginLeft: 2,
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 10,
  border: "1px solid #334155",
  padding: "0 12px",
  fontSize: 14,
  color: "#e5e7eb",
  background: "#020617",
};

const readOnlyInputStyle: CSSProperties = {
  ...inputStyle,
  background: "#0b1120",
  fontWeight: 700,
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 110,
  borderRadius: 10,
  border: "1px solid #334155",
  padding: 12,
  fontSize: 14,
  color: "#e5e7eb",
  background: "#020617",
  resize: "vertical",
};

const mutedTextStyle: CSSProperties = {
  fontSize: 14,
  color: "#94a3b8",
};

const primaryButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  background: "#111827",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 14,
};

const secondaryButtonStyle: CSSProperties = {
  textDecoration: "none",
  borderRadius: 10,
  padding: "10px 14px",
  background: "#ffffff",
  color: "#111827",
  border: "1px solid #d1d5db",
  fontWeight: 700,
  fontSize: 14,
};