"use client";

import Link from "next/link";
import AppShell from "../../components/ui/AppShell";

function ExportCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 18,
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: "#ffffff",
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: "#94a3b8",
        }}
      >
        {description}
      </div>

      <div
        style={{
          marginTop: 16,
          fontSize: 13,
          fontWeight: 700,
          color: "#38bdf8",
        }}
      >
        Open
      </div>
    </Link>
  );
}

export default function ExportHomePage() {
  return (
    <AppShell
      title="Export"
      description="Download operational data into Excel files. Export is a Layer 4 reporting feature and reads existing data only."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        <ExportCard
          title="Students Export"
          description="Download student master data, status, class, belt, parent contact, and active or inactive summary."
          href="/export/students"
        />

        <ExportCard
          title="Attendance Export"
          description="Download attendance log, daily check-in records, student attendance history, and monthly attendance summary."
          href="/export/attendance"
        />

        <ExportCard
          title="Finance Export"
          description="Download payments, expenses, balances, and finance summaries for accounting and reporting."
          href="/export/finance"
        />

        <ExportCard
          title="Dashboard Export"
          description="Download dashboard summary data such as revenue trend, student growth, and attendance trend."
          href="/export/dashboard"
        />
      </div>
    </AppShell>
  );
}