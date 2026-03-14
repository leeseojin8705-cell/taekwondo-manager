"use client";

import Link from "next/link";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";

export default function SettingsClassesPage() {
  return (
    <AppShell title="Classes" description="Class (반) settings">
      <PageCard title="Classes (반)">
        <p style={{ color: "#94a3b8", marginBottom: 16 }}>
          Manage class groups (e.g. time slots or groups). Use the <strong>classes</strong> table in Supabase if needed.
        </p>
        <Link
          href="/settings"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            background: "#334155",
            color: "#f8fafc",
            borderRadius: 10,
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Settings
        </Link>
      </PageCard>
    </AppShell>
  );
}
