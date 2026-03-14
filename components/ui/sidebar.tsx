"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menu = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/students", label: "Students" },
  { href: "/programs", label: "Programs" },
  { href: "/payments", label: "Payments" },
  { href: "/inventory", label: "Inventory" },
  { href: "/settings", label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 260,
        minHeight: "100vh",
        background: "#0f172a",
        borderRight: "1px solid #1e293b",
        padding: 20,
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 13,
            color: "#67e8f9",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 800,
          }}
        >
          Taekwondo
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: "#ffffff",
            marginTop: 4,
          }}
        >
          Manager
        </div>
      </div>

      <nav style={{ display: "grid", gap: 10 }}>
        {menu.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "block",
                padding: "12px 14px",
                borderRadius: 12,
                background: active ? "#06b6d4" : "#111827",
                color: active ? "#001018" : "#e5e7eb",
                fontWeight: 800,
                border: active ? "1px solid #22d3ee" : "1px solid #1f2937",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}