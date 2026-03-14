"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type StudentRow = {
  id: string;
  name: string | null;
  full_name?: string | null;
  parent_name: string | null;
  phone: string | null;
  parent_phone?: string | null;
  email: string | null;
  parent_email?: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  parent_requests: string | null;
  join_date: string | null;
  date_of_birth?: string | null;
  birth_date?: string | null;
  gender: string | null;
};

type ContractRow = {
  id: string;
  start_date: string | null;
  end_date: string | null;
  registration_fee: number | null;
  tuition_fee?: number | null;
  final_tuition_fee?: number | null;
  final_price?: number | null;
  uniform_fee: number | null;
  equipment_fee: number | null;
  other_fee: number | null;
  total_amount: number | null;
  note: string | null;
  pricing_snapshot?: {
    equipment_lines?: Array<{
      name: string;
      unit_price: number;
      quantity: number;
      line_total: number;
    }>;
    grand_total?: number;
  } | null;
  programs?: { name: string | null } | null;
  membership_durations?: { name: string | null } | null;
  weekly_frequency_options?: { label?: string | null } | null;
};

type TagRow = { id: string; name: string };

function formatDate(s: string | null | undefined) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export default function StudentPrintPage() {
  const params = useParams();
  const studentId = params?.id as string;
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [contract, setContract] = useState<ContractRow | null>(null);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!studentId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [studentRes, contractRes, tagLinksRes] = await Promise.all([
          supabase
            .from("students")
            .select(
              "id, name, full_name, parent_name, phone, email, address, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, parent_requests, join_date, date_of_birth, gender"
            )
            .eq("id", studentId)
            .single(),
          supabase
            .from("student_contracts")
            .select(
              "id, start_date, end_date, registration_fee, tuition_fee, final_tuition_fee, uniform_fee, equipment_fee, other_fee, total_amount, note, pricing_snapshot, programs(name), membership_durations(name), weekly_frequency_options(label)"
            )
            .eq("student_id", studentId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("student_tag_links")
            .select("tag_id")
            .eq("student_id", studentId),
        ]);

        if (studentRes.error) {
          setError(studentRes.error.message);
          setLoading(false);
          return;
        }
        setStudent(studentRes.data as StudentRow);
        setContract(contractRes.error ? null : ((contractRes.data as unknown as ContractRow) ?? null));

        const tagIds = (tagLinksRes.error ? [] : (tagLinksRes.data ?? [])).map((r: { tag_id: string }) => r.tag_id);
        if (tagIds.length > 0) {
          const tagsRes = await supabase
            .from("student_tags")
            .select("id, name")
            .in("id", tagIds);
          if (!tagsRes.error) {
            setTagNames((tagsRes.data ?? []).map((t: TagRow) => t.name));
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load.");
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily: "sans-serif" }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div style={{ padding: 24, fontFamily: "sans-serif" }}>
        <p>{error || "Student not found."}</p>
        <Link href={`/students/${studentId}`}>Back to student</Link>
      </div>
    );
  }

  const name =
    (student.name ?? student.full_name ?? "").trim() || "—";
  const parentName = (student.parent_name ?? student.parent_phone ?? "").trim() || "—";
  const phone = (student.phone ?? student.parent_phone ?? "").trim() || "—";
  const email = (student.email ?? student.parent_email ?? "").trim() || "—";
  const birthDate = student.date_of_birth ?? student.birth_date ?? null;

  const equipmentLines =
    contract?.pricing_snapshot?.equipment_lines ?? [];

  return (
    <>
      <div className="no-print" style={{ padding: 16, background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <Link href={`/students/${studentId}`} style={{ color: "#2563eb", fontWeight: 600 }}>
            ← Back to student
          </Link>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: "10px 20px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div ref={printRef} style={{ padding: 32, maxWidth: 800, margin: "0 auto", fontFamily: "sans-serif", color: "#111" }}>
        <h1 style={{ marginBottom: 8, fontSize: 22, fontWeight: 800 }}>Student Registration Summary</h1>
        <p style={{ margin: 0, fontSize: 14, color: "#555" }}>Generated {formatDate(new Date().toISOString())}</p>

        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, borderBottom: "1px solid #ddd", paddingBottom: 6 }}>Student &amp; Parent</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <tbody>
              <tr><td style={{ padding: "6px 0", width: 140, color: "#555" }}>Student name</td><td>{name}</td></tr>
              <tr><td style={{ padding: "6px 0", color: "#555" }}>Date of birth</td><td>{formatDate(birthDate)}</td></tr>
              <tr><td style={{ padding: "6px 0", color: "#555" }}>Join date</td><td>{formatDate(student.join_date)}</td></tr>
              <tr><td style={{ padding: "6px 0", color: "#555" }}>Parent / Guardian</td><td>{parentName}</td></tr>
              <tr><td style={{ padding: "6px 0", color: "#555" }}>Phone</td><td>{phone}</td></tr>
              <tr><td style={{ padding: "6px 0", color: "#555" }}>Email</td><td>{email}</td></tr>
              <tr><td style={{ padding: "6px 0", color: "#555" }}>Address</td><td>{(student.address ?? "").trim() || "—"}</td></tr>
              <tr><td style={{ padding: "6px 0", color: "#555" }}>Emergency contact</td><td>{[student.emergency_contact_name, student.emergency_contact_phone].filter(Boolean).join(" — ") || "—"}</td></tr>
            </tbody>
          </table>
        </section>

        {tagNames.length > 0 && (
          <section style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, borderBottom: "1px solid #ddd", paddingBottom: 6 }}>Tags</h2>
            <p style={{ margin: 0, fontSize: 14 }}>{tagNames.join(", ")}</p>
          </section>
        )}

        {(student.parent_requests ?? "").trim() && (
          <section style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, borderBottom: "1px solid #ddd", paddingBottom: 6 }}>Parent / Guardian requests</h2>
            <p style={{ margin: 0, fontSize: 14, whiteSpace: "pre-wrap" }}>{student.parent_requests}</p>
          </section>
        )}

        {contract && (
          <section style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, borderBottom: "1px solid #ddd", paddingBottom: 6 }}>Contract</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <tbody>
                <tr><td style={{ padding: "6px 0", width: 160, color: "#555" }}>Program</td><td>{contract.programs?.name ?? "—"}</td></tr>
                <tr><td style={{ padding: "6px 0", color: "#555" }}>Duration</td><td>{contract.membership_durations?.name ?? "—"}</td></tr>
                <tr><td style={{ padding: "6px 0", color: "#555" }}>Frequency</td><td>{contract.weekly_frequency_options?.label ?? "—"}</td></tr>
                <tr><td style={{ padding: "6px 0", color: "#555" }}>Period</td><td>{formatDate(contract.start_date)} – {formatDate(contract.end_date)}</td></tr>
                <tr><td style={{ padding: "6px 0", color: "#555" }}>Registration fee</td><td>{formatMoney(contract.registration_fee)}</td></tr>
                <tr><td style={{ padding: "6px 0", color: "#555" }}>Tuition</td><td>{formatMoney(contract.final_tuition_fee ?? contract.final_price)}</td></tr>
                <tr><td style={{ padding: "6px 0", color: "#555" }}>Uniform fee</td><td>{formatMoney(contract.uniform_fee)}</td></tr>
                <tr><td style={{ padding: "6px 0", color: "#555" }}>Equipment fee</td><td>{formatMoney(contract.equipment_fee)}</td></tr>
                {equipmentLines.length > 0 && (
                  <tr>
                    <td style={{ padding: "6px 0", color: "#555", verticalAlign: "top" }}>Equipment items</td>
                    <td>
                      <table style={{ fontSize: 13 }}>
                        <tbody>
                          {equipmentLines.map((line, i) => (
                            <tr key={i}>
                              <td style={{ padding: "2px 8px 2px 0" }}>{line.name} × {line.quantity}</td>
                              <td style={{ padding: "2px 0" }}>{formatMoney(line.line_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
                <tr><td style={{ padding: "6px 0", color: "#555" }}>Other fee</td><td>{formatMoney(contract.other_fee)}</td></tr>
                <tr><td style={{ padding: "8px 0 0", fontWeight: 700 }}>Total amount</td><td style={{ padding: "8px 0 0", fontWeight: 700 }}>{formatMoney(contract.total_amount)}</td></tr>
              </tbody>
            </table>
            {contract.note && (
              <p style={{ marginTop: 12, fontSize: 14, color: "#555" }}>Note: {contract.note}</p>
            )}
          </section>
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `@media print { .no-print { display: none !important; } }`,
        }}
      />
    </>
  );
}
