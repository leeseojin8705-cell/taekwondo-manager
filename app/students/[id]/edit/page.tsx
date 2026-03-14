"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppShell from "../../../../components/ui/AppShell";
import PageCard from "../../../../components/ui/PageCard";
import LoadingBlock from "../../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../../components/ui/ErrorBlock";
import EmptyState from "../../../../components/ui/EmptyState";

type ClassRow = {
  id: string;
  name: string;
  display_order: number | null;
};

type BeltRow = {
  id: string;
  name: string;
};

type StudentTagRow = {
  id: string;
  name: string;
  color: string | null;
  active: boolean | null;
};

type StudentTagLinkRow = { tag_id: string };

type StudentDetailRow = {
  id: string;
  name: string;
  english_name: string | null;
  gender: string | null;
  birth_date: string | null;
  join_date: string | null;
  status: string | null;
  photo_url: string | null;
  class_id: string | null;
  current_belt_id: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  inactive_reason_id: string | null;
  memo: string | null;
  parent_requests: string | null;
};

type StudentMedicalRow = {
  id: string;
  allergies: string | null;
  medications: string | null;
  diagnosis: string | null;
  notes: string | null;
};

type InactiveReasonRow = {
  id: string;
  name: string;
  active: boolean | null;
};

export default function EditStudentPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [belts, setBelts] = useState<BeltRow[]>([]);
  const [tags, setTags] = useState<StudentTagRow[]>([]);
  const [inactiveReasons, setInactiveReasons] = useState<InactiveReasonRow[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [medicalRowId, setMedicalRowId] = useState<string | null>(null);

  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    english_name: "",
    gender: "",
    birth_date: "",
    join_date: "",
    status: "active",
    photo_url: "",
    class_id: "",
    current_belt_id: "",
    parent_name: "",
    parent_phone: "",
    parent_email: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    inactive_reason_id: "",
    memo: "",
    parent_requests: "",
    allergies: "",
    medications: "",
    diagnosis: "",
    medical_notes: "",
  });

  const photoInputRef = useRef<HTMLInputElement>(null);

  const statusOptions = useMemo(
    () => [
      { value: "active", label: "Active" },
      { value: "hold", label: "Hold" },
      { value: "inactive", label: "Inactive" },
    ],
    []
  );

  useEffect(() => {
    if (!studentId) return;
    fetchPageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function fetchPageData() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/students/${studentId}/edit`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Failed to load (${res.status})`);
      }
      const data = await res.json();

      const student = data.student as StudentDetailRow;
      const medical = data.medical as StudentMedicalRow | null;
      const tagLinks = (data.tagLinks ?? []) as StudentTagLinkRow[];

      setClasses((data.classes ?? []) as ClassRow[]);
      setBelts((data.belts ?? []) as BeltRow[]);
      setTags((data.tags ?? []) as StudentTagRow[]);
      setInactiveReasons((data.inactiveReasons ?? []) as InactiveReasonRow[]);
      setMedicalRowId(medical?.id ?? null);
      setSelectedTagIds(tagLinks.map((r) => r.tag_id));

      const parts = (student.name ?? "").trim().split(/\s+/).filter(Boolean);
      const last = parts.length > 0 ? parts.pop() ?? "" : "";
      const first = parts.length > 0 ? parts.shift() ?? "" : "";
      const middle = parts.join(" ");

      setForm({
        first_name: first,
        middle_name: middle,
        last_name: last,
        english_name: student.english_name ?? "",
        gender: student.gender ?? "",
        birth_date: student.birth_date ?? "",
        join_date: student.join_date ?? "",
        status: student.status ?? "active",
        photo_url: student.photo_url ?? "",
        class_id: student.class_id ?? "",
        current_belt_id: student.current_belt_id ?? "",
        parent_name: student.parent_name ?? "",
        parent_phone: student.parent_phone ?? "",
        parent_email: student.parent_email ?? "",
        emergency_contact_name: student.emergency_contact_name ?? "",
        emergency_contact_phone: student.emergency_contact_phone ?? "",
        emergency_contact_relationship:
          student.emergency_contact_relationship ?? "",
        inactive_reason_id: student.inactive_reason_id ?? "",
        memo: student.memo ?? "",
        parent_requests: student.parent_requests ?? "",
        allergies: medical?.allergies ?? "",
        medications: medical?.medications ?? "",
        diagnosis: medical?.diagnosis ?? "",
        medical_notes: medical?.notes ?? "",
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load edit page.");
    } finally {
      setLoading(false);
    }
  }

  function updateForm<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const name = [form.first_name, form.middle_name, form.last_name]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");
    if (!name) {
      setError("First name, Middle name, or Last name is required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const studentPayload = {
        name,
        english_name: form.english_name.trim() || null,
        gender: form.gender || null,
        birth_date: form.birth_date || null,
        join_date: form.join_date || null,
        status: form.status || "active",
        photo_url: form.photo_url.trim() || null,
        class_id: form.class_id || null,
        current_belt_id: form.current_belt_id || null,
        parent_name: form.parent_name.trim() || null,
        parent_phone: form.parent_phone.trim() || null,
        parent_email: form.parent_email.trim() || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        emergency_contact_relationship:
          form.emergency_contact_relationship.trim() || null,
        inactive_reason_id:
          form.status === "inactive" ? form.inactive_reason_id || null : null,
        memo: form.memo.trim() || null,
        parent_requests: form.parent_requests.trim() || null,
      };

      const medicalPayload = {
        student_id: studentId,
        allergies: form.allergies.trim() || null,
        medications: form.medications.trim() || null,
        diagnosis: form.diagnosis.trim() || null,
        notes: form.medical_notes.trim() || null,
      };

      const hasMedicalValue =
        !!form.allergies.trim() ||
        !!form.medications.trim() ||
        !!form.diagnosis.trim() ||
        !!form.medical_notes.trim();

      const res = await fetch(`/api/students/${studentId}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentPayload,
          selectedTagIds,
          medicalPayload,
          medicalRowId,
          hasMedicalValue,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Save failed (${res.status})`);

      router.push(`/students/${studentId}/print`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to save student.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Edit Student" description="Update student profile">
        <LoadingBlock message="Loading student..." />
      </AppShell>
    );
  }

  if (error && !form.first_name && !form.last_name) {
    return (
      <AppShell title="Edit Student" description="Update student profile">
        <ErrorBlock title="Failed to load page" message={error} />
      </AppShell>
    );
  }

  if (!studentId) {
    return (
      <AppShell title="Edit Student" description="Update student profile">
        <EmptyState
          title="Student not found"
          description="Invalid student id."
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Edit Student"
      description="Update student profile, contacts, medical, and tags"
    >
      <div style={{ display: "grid", gap: 20 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Link href={`/students/${studentId}`} style={buttonGhostStyle}>
            Back to Detail
          </Link>
          <Link href="/students" style={buttonGhostStyle}>
            Back to List
          </Link>
        </div>

        {error ? (
          <ErrorBlock title="Save error" message={error} />
        ) : null}

        <form onSubmit={handleSave} style={{ display: "grid", gap: 20 }}>
          <PageCard title="Basic Information">
            <div style={gridStyle}>
              <Field label="First Name *">
                <input
                  style={inputStyle}
                  value={form.first_name}
                  onChange={(e) => updateForm("first_name", e.target.value)}
                  placeholder="First name"
                />
              </Field>
              <Field label="Middle Name">
                <input
                  style={inputStyle}
                  value={form.middle_name}
                  onChange={(e) => updateForm("middle_name", e.target.value)}
                  placeholder="Middle name"
                />
              </Field>
              <Field label="Last Name *">
                <input
                  style={inputStyle}
                  value={form.last_name}
                  onChange={(e) => updateForm("last_name", e.target.value)}
                  placeholder="Last name"
                />
              </Field>

              <Field label="English Name">
                <input
                  style={inputStyle}
                  value={form.english_name}
                  onChange={(e) => updateForm("english_name", e.target.value)}
                  placeholder="English name"
                />
              </Field>

              <Field label="Gender">
                <select
                  style={inputStyle}
                  value={form.gender}
                  onChange={(e) => updateForm("gender", e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>

              <Field label="Status">
                <select
                  style={inputStyle}
                  value={form.status}
                  onChange={(e) => updateForm("status", e.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Birth Date">
                <input
                  type="date"
                  style={inputStyle}
                  value={form.birth_date}
                  onChange={(e) => updateForm("birth_date", e.target.value)}
                />
              </Field>

              <Field label="Join Date">
                <input
                  type="date"
                  style={inputStyle}
                  value={form.join_date}
                  onChange={(e) => updateForm("join_date", e.target.value)}
                />
              </Field>

              <Field label="Class">
                <select
                  style={inputStyle}
                  value={form.class_id}
                  onChange={(e) => updateForm("class_id", e.target.value)}
                >
                  <option value="">Select class</option>
                  {classes.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Current Belt">
                <select
                  style={inputStyle}
                  value={form.current_belt_id}
                  onChange={(e) => updateForm("current_belt_id", e.target.value)}
                >
                  <option value="">Select belt</option>
                  {belts.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Photo">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > MAX_PHOTO_SIZE_MB_EDIT * 1024 * 1024) {
                      setError(`사진은 ${MAX_PHOTO_SIZE_MB_EDIT}MB 이하로 선택해 주세요.`);
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const dataUrl = reader.result as string;
                      if (dataUrl) updateForm("photo_url", dataUrl);
                    };
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />
                {form.photo_url.trim() ? (
                  <PhotoPreviewEdit
                    url={form.photo_url.trim()}
                    onRemove={() => updateForm("photo_url", "")}
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
                    사진 추가
                  </button>
                )}
                <div style={{ marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const urlInput = window.prompt("이미지 URL을 입력하세요");
                      if (urlInput != null && urlInput.trim()) updateForm("photo_url", urlInput.trim());
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
                    URL로 입력
                  </button>
                </div>
              </Field>

              {form.status === "inactive" ? (
                <Field label="Inactive Reason">
                  <select
                    style={inputStyle}
                    value={form.inactive_reason_id}
                    onChange={(e) =>
                      updateForm("inactive_reason_id", e.target.value)
                    }
                  >
                    <option value="">Select reason</option>
                    {inactiveReasons.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
            </div>
          </PageCard>

          <PageCard title="Parent Contact">
            <div style={gridStyle}>
              <Field label="Parent Name">
                <input
                  style={inputStyle}
                  value={form.parent_name}
                  onChange={(e) => updateForm("parent_name", e.target.value)}
                  placeholder="Parent name"
                />
              </Field>

              <Field label="Parent Phone">
                <input
                  style={inputStyle}
                  value={form.parent_phone}
                  onChange={(e) => updateForm("parent_phone", e.target.value)}
                  placeholder="Phone number"
                />
              </Field>

              <Field label="Parent Email">
                <input
                  type="email"
                  style={inputStyle}
                  value={form.parent_email}
                  onChange={(e) => updateForm("parent_email", e.target.value)}
                  placeholder="Email address"
                />
              </Field>
            </div>
          </PageCard>

          <PageCard title="Emergency Contact">
            <div style={gridStyle}>
              <Field label="Emergency Contact Name">
                <input
                  style={inputStyle}
                  value={form.emergency_contact_name}
                  onChange={(e) =>
                    updateForm("emergency_contact_name", e.target.value)
                  }
                  placeholder="Emergency contact name"
                />
              </Field>

              <Field label="Emergency Contact Phone">
                <input
                  style={inputStyle}
                  value={form.emergency_contact_phone}
                  onChange={(e) =>
                    updateForm("emergency_contact_phone", e.target.value)
                  }
                  placeholder="Emergency phone"
                />
              </Field>

              <Field label="Relationship">
                <input
                  style={inputStyle}
                  value={form.emergency_contact_relationship}
                  onChange={(e) =>
                    updateForm("emergency_contact_relationship", e.target.value)
                  }
                  placeholder="Relationship"
                />
              </Field>
            </div>
          </PageCard>

          <PageCard title="Medical Information">
            <div style={gridStyle}>
              <Field label="Allergies">
                <textarea
                  style={textareaStyle}
                  value={form.allergies}
                  onChange={(e) => updateForm("allergies", e.target.value)}
                  placeholder="Allergies"
                />
              </Field>

              <Field label="Medications">
                <textarea
                  style={textareaStyle}
                  value={form.medications}
                  onChange={(e) => updateForm("medications", e.target.value)}
                  placeholder="Medications"
                />
              </Field>

              <Field label="Diagnosis / Condition">
                <textarea
                  style={textareaStyle}
                  value={form.diagnosis}
                  onChange={(e) => updateForm("diagnosis", e.target.value)}
                  placeholder="Diagnosis or condition"
                />
              </Field>

              <Field label="Medical Notes">
                <textarea
                  style={textareaStyle}
                  value={form.medical_notes}
                  onChange={(e) => updateForm("medical_notes", e.target.value)}
                  placeholder="Medical notes"
                />
              </Field>
            </div>
          </PageCard>

          <PageCard title="Tags">
            <p style={{ margin: "0 0 10px 0", fontSize: 14, color: "#94a3b8" }}>
              Select tags for this student.
            </p>
            {tags.length === 0 ? (
              <EmptyState title="No tags" description="Add tags in Settings &gt; Parent Preferences." />
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {tags.map((tag) => {
                  const active = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      style={{
                        border: active ? "1px solid #22c55e" : "1px solid #334155",
                        background: active ? "rgba(34,197,94,0.15)" : "#0f172a",
                        color: "#e5e7eb",
                        borderRadius: 999,
                        padding: "8px 14px",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </PageCard>

          <PageCard title="Parent / Guardian requests">
            <p style={{ margin: "0 0 10px 0", fontSize: 14, color: "#94a3b8" }}>
              What the parent or guardian wants for this student. Type here and it will be saved.
            </p>
            <textarea
              style={{
                width: "100%",
                minHeight: 100,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #334155",
                background: "#0f172a",
                color: "#f8fafc",
                fontSize: 14,
                outline: "none",
              }}
              placeholder="e.g. Prefer weekend classes, wants to focus on forms..."
              value={form.parent_requests}
              onChange={(e) => updateForm("parent_requests", e.target.value)}
            />
          </PageCard>

          <PageCard title="Memo">
            <Field label="Internal Memo">
              <textarea
                style={{
                  ...textareaStyle,
                  minHeight: 140,
                }}
                value={form.memo}
                onChange={(e) => updateForm("memo", e.target.value)}
                placeholder="Internal memo"
              />
            </Field>
          </PageCard>

          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <Link href={`/students/${studentId}`} style={buttonGhostStyle}>
              Cancel
            </Link>

            <button type="submit" disabled={saving} style={buttonPrimaryStyle}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

const MAX_PHOTO_SIZE_MB_EDIT = 1;

function PhotoPreviewEdit({ url, onRemove }: { url: string; onRemove?: () => void }) {
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#e2e8f0",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#f8fafc",
  borderRadius: 10,
  padding: "12px 14px",
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 96,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#f8fafc",
  borderRadius: 10,
  padding: "12px 14px",
  outline: "none",
  resize: "vertical",
};

const buttonPrimaryStyle: React.CSSProperties = {
  border: "none",
  background: "#22c55e",
  color: "#052e16",
  borderRadius: 10,
  padding: "12px 18px",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
};

const buttonGhostStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#e2e8f0",
  borderRadius: 10,
  padding: "12px 18px",
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
};