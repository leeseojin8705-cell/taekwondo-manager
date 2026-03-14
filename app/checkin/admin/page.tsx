"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Student = {
  id: string;
  name: string | null;
  full_name?: string | null;
};

export default function AdminCheckin() {
  const [students, setStudents] = useState<Student[]>([]);
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    loadStudents();
    loadAttendance();
  }, []);

  async function loadStudents() {
    const { data } = await supabase
      .from("students")
      .select("id,name,full_name")
      .eq("active", true)
      .order("full_name", { ascending: true });

    if (data) setStudents(data as Student[]);
  }

  async function loadAttendance() {
    const today = new Date().toISOString().slice(0, 10);

    const { data } = await supabase
      .from("attendance_logs")
      .select("student_id")
      .eq("checkin_date", today);

    if (data) {
      setChecked(data.map((a: { student_id: string }) => a.student_id));
    }
  }

  async function checkin(student_id: string) {
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("attendance_logs").insert({
      student_id,
      checkin_date: today,
      checkin_time: new Date().toISOString(),
      checkin_source: "admin",
      checkin_type: "regular",
    });

    setChecked((prev) => [...prev, student_id]);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        padding: 30,
      }}
    >
      <h1 style={{ fontSize: 40, marginBottom: 20 }}>
        Admin Check-In
      </h1>

      {students.map((s) => {
        const isChecked = checked.includes(s.id);

        return (
          <div
            key={s.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: 10,
              borderBottom: "1px solid #334155",
            }}
          >
            <div>
              <Link href={`/students/${s.id}`} style={{ color: "#93c5fd", fontWeight: 600, textDecoration: "none" }}>
                {s.name || s.full_name || "—"}
              </Link>
            </div>

            {isChecked ? (
              <div>Checked</div>
            ) : (
              <button
                onClick={() => checkin(s.id)}
                style={{
                  background: "#2563eb",
                  border: "none",
                  padding: "6px 12px",
                  color: "white",
                  borderRadius: 6,
                }}
              >
                Check In
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}