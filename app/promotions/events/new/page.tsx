"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../../components/ui/AppShell";
import PageCard from "../../../../components/ui/PageCard";
import LoadingBlock from "../../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../../components/ui/ErrorBlock";
import { supabase } from "../../../../lib/supabase";

type TestingTypeOption = {
  id: string;
  name: string;
  active: boolean | null;
};

export default function NewTestingEventPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [testingTypes, setTestingTypes] = useState<TestingTypeOption[]>([]);

  const [title, setTitle] = useState("");
  const [testingDate, setTestingDate] = useState("");
  const [location, setLocation] = useState("");
  const [testingTypeId, setTestingTypeId] = useState("");
  const [testingFee, setTestingFee] = useState("0");
  const [status, setStatus] = useState("scheduled");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const testingTypesRes = await supabase
          .from("testing_types")
          .select("id, name, active")
          .eq("active", true)
          .order("name", { ascending: true });

        if (!active) return;

        if (testingTypesRes.error) {
          // testing_types 테이블이 없으면 빈 목록으로 진행 (scripts/testing_types_table.sql 실행으로 생성 가능)
          if (testingTypesRes.error.code === "PGRST205" || testingTypesRes.error.message?.includes("testing_types")) {
            setTestingTypes([]);
          } else {
            throw testingTypesRes.error;
          }
        } else {
          const rows = (testingTypesRes.data ?? []) as unknown as TestingTypeOption[];
          setTestingTypes(rows);
          if (rows.length > 0) {
            setTestingTypeId(rows[0].id);
          }
        }
      } catch (err: any) {
        if (!active) return;
        setError(err?.message ?? "Failed to load testing settings.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!testingDate) {
      setError("Testing date is required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const feeValue = Number(testingFee || "0");
      const safeFee = Number.isNaN(feeValue) ? 0 : feeValue;

      const titleValue = title.trim();
      const insertPayload: Record<string, any> = {
        title: titleValue,
        name: titleValue, // DB에 name 컬럼이 있으면 NOT NULL 충족
        testing_date: testingDate,
        location: location.trim() || null,
        testing_fee: safeFee,
        status,
        notes: notes.trim() || null,
      };

      if (testingTypeId) {
        insertPayload.testing_type_id = testingTypeId;
      }

      const insertRes = await supabase
        .from("testing_events")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insertRes.error) {
        throw insertRes.error;
      }

      router.push("/promotions/events");
    } catch (err: any) {
      setError(err?.message ?? "Failed to create testing event.");
    } finally {
      setSaving(false);
    }
  }

  const breadcrumbStyle: CSSProperties = {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 12,
  };
  const breadcrumbLinkStyle: CSSProperties = {
    color: "#38bdf8",
    textDecoration: "none",
    fontWeight: 600,
  };

  return (
    <AppShell
      title="New Testing Event"
      description="Create a testing event for promotion and result management."
    >
      <div style={breadcrumbStyle}>
        <Link href="/promotions/events" style={breadcrumbLinkStyle}>
          ← Testing Events
        </Link>
      </div>
      {loading ? (
        <LoadingBlock message="Loading testing form..." />
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {error ? <ErrorBlock message={error} /> : null}

          <PageCard
            title="Create Testing Event"
            subtitle="Set the event basics first. Students and results will be added later."
          >
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
              <div style={gridTwoStyle}>
                <FieldBlock label="Title" required>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Example: March Belt Testing"
                    style={inputStyle}
                  />
                </FieldBlock>

                <FieldBlock label="Testing Date" required>
                  <input
                    type="date"
                    value={testingDate}
                    onChange={(e) => setTestingDate(e.target.value)}
                    style={inputStyle}
                  />
                </FieldBlock>
              </div>

              <div style={gridTwoStyle}>
                <FieldBlock label="Location">
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Main Dojang"
                    style={inputStyle}
                  />
                </FieldBlock>

                <FieldBlock label="Testing Type">
                  <select
                    value={testingTypeId}
                    onChange={(e) => setTestingTypeId(e.target.value)}
                    style={selectStyle}
                  >
                    {testingTypes.length === 0 ? (
                      <option value="">No testing types</option>
                    ) : (
                      testingTypes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))
                    )}
                  </select>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                    Belt Test = 승급 시험 · Event = 일반 도장 행사
                  </div>
                </FieldBlock>
              </div>

              <div style={gridTwoStyle}>
                <FieldBlock label="Testing Fee">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={testingFee}
                    onChange={(e) => setTestingFee(e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </FieldBlock>

                <FieldBlock label="Status">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="scheduled">scheduled</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </FieldBlock>
              </div>

              <FieldBlock label="Notes">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes for this testing event"
                  style={textareaStyle}
                  rows={5}
                />
              </FieldBlock>

              <div style={infoBoxStyle}>
                <div style={infoTitleStyle}>Next Step</div>
                <div style={infoTextStyle}>
                  After creating the event, go to the Event Detail page to add students,
                  enter pass or fail results, and connect promotion history.
                </div>
              </div>

              <div style={buttonRowStyle}>
                <Link href="/promotions/events" style={secondaryButtonStyle}>
                  Cancel
                </Link>

                <button type="submit" disabled={saving} style={primaryButtonStyle}>
                  {saving ? "Creating..." : "Create Event"}
                </button>
              </div>
            </form>
          </PageCard>
        </div>
      )}
    </AppShell>
  );
}

function FieldBlock({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label style={labelStyle}>
        {label} {required ? <span style={{ color: "#f87171" }}>*</span> : null}
      </label>
      {children}
    </div>
  );
}

const gridTwoStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#cbd5e1",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.22)",
  background: "#0f172a",
  color: "#f8fafc",
  outline: "none",
  fontSize: 14,
};

const selectStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.22)",
  background: "#0f172a",
  color: "#f8fafc",
  outline: "none",
  fontSize: 14,
};

const textareaStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.22)",
  background: "#0f172a",
  color: "#f8fafc",
  outline: "none",
  fontSize: 14,
  resize: "vertical",
};

const infoBoxStyle: CSSProperties = {
  border: "1px solid rgba(59,130,246,0.22)",
  background: "rgba(30,41,59,0.5)",
  borderRadius: 12,
  padding: 14,
};

const infoTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  color: "#93c5fd",
  marginBottom: 6,
};

const infoTextStyle: CSSProperties = {
  fontSize: 13,
  color: "#cbd5e1",
  lineHeight: 1.6,
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
};

const primaryButtonStyle: CSSProperties = {
  padding: "11px 16px",
  borderRadius: 10,
  border: "1px solid rgba(59,130,246,0.3)",
  background: "#1d4ed8",
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 16px",
  borderRadius: 10,
  textDecoration: "none",
  border: "1px solid rgba(148,163,184,0.22)",
  background: "#0f172a",
  color: "#f8fafc",
  fontSize: 14,
  fontWeight: 700,
};