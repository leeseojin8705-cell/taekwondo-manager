"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";
import BilingualText from "./BilingualText";

type MenuChild = {
  label: string;
  ko: string;
  href: string;
};

type MenuItem = {
  label: string;
  ko: string;
  href?: string;
  children?: MenuChild[];
};

const menu: MenuItem[] = [
  { label: "Dashboard", ko: "대시보드", href: "/" },
  {
    label: "Students",
    ko: "학생",
    children: [
      { label: "Student List", ko: "학생 목록", href: "/students" },
      { label: "New Student", ko: "신규 등록", href: "/students/new" },
    ],
  },
  {
    label: "Attendance",
    ko: "출석",
    children: [
      { label: "Check In", ko: "출석 체크", href: "/checkin" },
      { label: "Kiosk", ko: "키오스크", href: "/checkin/kiosk" },
      { label: "Attendance Log", ko: "출석 기록", href: "/attendance" },
    ],
  },
  { label: "Classes", ko: "수업", href: "/classes" },
  {
    label: "Promotions",
    ko: "승급",
    children: [
      { label: "Promotions", ko: "승급", href: "/promotions" },
      { label: "Events", ko: "행사", href: "/promotions/events" },
      { label: "History", ko: "이력", href: "/promotions/history" },
    ],
  },
  {
    label: "Finance",
    ko: "재무",
    children: [
      { label: "Finance Home", ko: "재무 홈", href: "/finance" },
      { label: "Pricing", ko: "가격", href: "/program-pricing" },
      { label: "Renewals", ko: "갱신", href: "/renewals" },
      { label: "Payments", ko: "결제", href: "/finance/payments" },
      { label: "Invoices", ko: "청구", href: "/finance/invoices" },
      { label: "Balances", ko: "잔액", href: "/finance/balances" },
      { label: "Expenses", ko: "지출", href: "/finance/expenses" },
      { label: "Summary", ko: "요약", href: "/finance/summary" },
      { label: "By Year", ko: "연도별", href: "/finance/yearly" },
    ],
  },
  {
    label: "Inventory",
    ko: "재고",
    children: [
      { label: "Overview", ko: "개요", href: "/inventory" },
      { label: "Items", ko: "품목", href: "/inventory/items" },
      { label: "Stock In", ko: "입고", href: "/inventory/stock-in" },
      { label: "Stock Out", ko: "출고", href: "/inventory/stock-out" },
      { label: "Low Stock", ko: "재고 부족", href: "/inventory/low-stock" },
      { label: "Summary", ko: "요약", href: "/inventory/summary" },
    ],
  },
  {
    label: "Settings",
    ko: "설정",
    children: [
      { label: "Overview", ko: "개요", href: "/settings" },
      { label: "Programs", ko: "프로그램", href: "/settings/programs" },
      { label: "Belts", ko: "띠", href: "/settings/belts" },
      { label: "Pricing Plans", ko: "요금 플랜", href: "/settings/pricing-plans" },
      { label: "Payment Methods", ko: "결제 수단", href: "/payments-methods" },
      { label: "Expense Categories", ko: "지출 항목", href: "/expenses-categories" },
      { label: "Business", ko: "사업 정보", href: "/business-settings" },
      { label: "Parent Preferences", ko: "보호자 설정", href: "/settings/parent-preferences" },
    ],
  },
  {
    label: "Reports",
    ko: "보고서",
    children: [
      { label: "Export", ko: "내보내기", href: "/export" },
      { label: "Students Export", ko: "학생 내보내기", href: "/export/students" },
      { label: "Attendance Export", ko: "출석 내보내기", href: "/export/attendance" },
      { label: "Finance Export", ko: "재무 내보내기", href: "/export/finance" },
    ],
  },
  { label: "Alerts", ko: "알림", href: "/alerts" },
];

type AppShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export default function AppShell({
  title,
  description,
  children,
  actions,
}: AppShellProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const resolvedGroups = useMemo(() => {
    const nextState: Record<string, boolean> = { ...openGroups };

    for (const item of menu) {
      if (!item.children) continue;

      const isActiveGroup = item.children.some(
        (child) =>
          pathname === child.href || pathname.startsWith(child.href + "/")
      );

      if (isActiveGroup && nextState[item.label] === undefined) {
        nextState[item.label] = true;
      }
    }

    return nextState;
  }, [openGroups, pathname]);

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({
      ...prev,
      [label]: !resolvedGroups[label],
    }));
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        maxWidth: "100vw",
        background: "#020617",
        color: "#f8fafc",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px minmax(0, 1fr)",
          minHeight: "100vh",
          width: "100%",
        }}
      >
        <aside
          style={{
            borderRight: "1px solid #1e293b",
            background: "#0f172a",
            padding: 20,
            position: "sticky",
            top: 0,
            height: "100vh",
            overflowY: "auto",
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 12,
                color: "#38bdf8",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Taekwondo Manager
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#ffffff",
              }}
            >
              Admin Panel
            </div>
          </div>

          <nav style={{ display: "grid", gap: 10 }}>
            {menu.map((item) => {
              if (item.href) {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    style={{
                      display: "block",
                      padding: "12px 14px",
                      borderRadius: 12,
                      textDecoration: "none",
                      fontWeight: 700,
                      background: active ? "#1d4ed8" : "#111827",
                      color: "#f8fafc",
                      border: active
                        ? "1px solid #3b82f6"
                        : "1px solid #1f2937",
                    }}
                  >
                    <BilingualText en={item.label} ko={item.ko} />
                  </Link>
                );
              }

              const isOpen = resolvedGroups[item.label] ?? false;
              const isGroupActive =
                item.children?.some(
                  (child) =>
                    pathname === child.href ||
                    pathname.startsWith(child.href + "/")
                ) ?? false;

              return (
                <div
                  key={item.label}
                  style={{
                    border: isGroupActive
                      ? "1px solid #334155"
                      : "1px solid #1f2937",
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "#111827",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.label)}
                    style={{
                      width: "100%",
                      background: "transparent",
                      color: "#f8fafc",
                      border: "none",
                      padding: "12px 14px",
                      textAlign: "left",
                      cursor: "pointer",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span><BilingualText en={item.label} ko={item.ko} /></span>
                    <span style={{ color: "#94a3b8", fontSize: 12 }}>
                      {isOpen ? "OPEN" : "CLOSE"}
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        padding: "0 12px 12px 12px",
                      }}
                    >
                      {item.children?.map((child) => {
                        const active =
                          pathname === child.href ||
                          pathname.startsWith(child.href + "/");

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            style={{
                              display: "block",
                              padding: "10px 12px",
                              borderRadius: 10,
                              textDecoration: "none",
                              fontWeight: 600,
                              background: active ? "#1e3a8a" : "#0f172a",
                              color: "#e2e8f0",
                              border: active
                                ? "1px solid #3b82f6"
                                : "1px solid #1e293b",
                            }}
                          >
                            <BilingualText en={child.label} ko={child.ko} />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        <main
          style={{
            padding: 24,
            minWidth: 0,
            overflowX: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 1440,
              margin: "0 auto",
              display: "grid",
              gap: 20,
            }}
          >
            <section
              style={{
                border: "1px solid #1e293b",
                background: "#0f172a",
                borderRadius: 20,
                padding: 24,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "#38bdf8",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Taekwondo Manager
                </p>

                <h1
                  style={{
                    margin: 0,
                    fontSize: 32,
                    lineHeight: 1.2,
                    fontWeight: 900,
                    color: "#ffffff",
                  }}
                >
                  {title}
                </h1>

                {description ? (
                  <p
                    style={{
                      margin: 0,
                      color: "#94a3b8",
                      fontSize: 14,
                      lineHeight: 1.6,
                      maxWidth: 760,
                    }}
                  >
                    {description}
                  </p>
                ) : null}
              </div>

              {actions ? (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  {actions}
                </div>
              ) : null}
            </section>

            <section>{children}</section>
          </div>
        </main>
      </div>
    </div>
  );
}