"use client";

import Link from "next/link";
import AppShell from "../../components/ui/AppShell";

const smallKoStyle = { fontSize: 11, color: "#64748b", fontWeight: 400, marginLeft: 4 } as const;

const linkGroups: { title: string; titleKo: string; links: { label: string; labelKo: string; href: string; desc: string; descKo: string }[] }[] = [
  {
    title: "Classes & Pricing",
    titleKo: "수업·가격",
    links: [
      { label: "Programs", labelKo: "프로그램", href: "/settings/programs", desc: "Program master data for contracts", descKo: "수업 프로그램 (가격·계약)" },
      { label: "Belts", labelKo: "띠", href: "/settings/belts", desc: "Belt levels and stripes", descKo: "급수·띠 단계" },
      { label: "Testing Types", labelKo: "승급 테스팅 유형", href: "/settings/testing", desc: "Testing types, defaults, and rules for promotions", descKo: "승급 테스팅 유형·기본값" },
      { label: "Pricing Plans", labelKo: "요금제", href: "/settings/pricing-plans", desc: "Billing plans and contract options", descKo: "요금제·계약 옵션" },
    ],
  },
  {
    title: "Finance",
    titleKo: "재무",
    links: [
      { label: "Payment Methods", labelKo: "결제 수단", href: "/payments-methods", desc: "Cash, card, transfer, etc.", descKo: "현금, 카드, 계좌이체" },
      { label: "Expense Categories", labelKo: "지출 분류", href: "/expenses-categories", desc: "Rent, payroll, supplies, etc.", descKo: "임대료, 인건비, 비품" },
    ],
  },
  {
    title: "Business & Other",
    titleKo: "사업·기타",
    links: [
      { label: "Business Info", labelKo: "사업장 정보", href: "/business-settings", desc: "Business profile and defaults", descKo: "도장 정보·기본값" },
      { label: "Parent Preferences", labelKo: "보호자 설정", href: "/settings/parent-preferences", desc: "Tags and guardian options", descKo: "태그·보호자 요청" },
    ],
  },
];

const setupScripts: { file: string; descEn: string; descKo: string }[] = [
  { file: "scripts/verify_setup.sql", descEn: "Check RPC, tables, RLS (run in Supabase SQL Editor)", descKo: "RPC·테이블·RLS 확인" },
  { file: "scripts/dashboard_tables_rls.sql", descEn: "Dashboard: read-only payments, invoices (use finance script below for write)", descKo: "대시보드 읽기만, 재무 쓰려면 아래 finance 스크립트" },
  { file: "scripts/attendance_logs_create.sql", descEn: "Attendance: create attendance_logs, daily_checkin_status + RLS", descKo: "출석 테이블 생성 + RLS" },
  { file: "scripts/student_detail_tables.sql", descEn: "Student Detail: auto_renew + RLS for notes, documents, hold_logs, payments, invoices", descKo: "학생 상세·자동갱신·RLS" },
  { file: "scripts/finance_tables_columns_fix.sql", descEn: "Finance: add columns to invoices, payments, expenses (prevents 400)", descKo: "재무 컬럼 보강 (400 방지)" },
  { file: "scripts/finance_tables_rls.sql", descEn: "Finance: enable RLS, allow read/write", descKo: "재무 RLS 켜고 읽기/쓰기" },
  { file: "scripts/finance_tables_rls_disable.sql", descEn: "Finance, payment methods, expense categories, business: disable RLS, GRANT only (run on 401 / permission denied)", descKo: "재무·결제수단·지출분류·사업장: RLS 끄고 GRANT" },
  { file: "scripts/inventory_tables_create.sql", descEn: "Inventory: create categories, items, variants, movements + GRANT", descKo: "인벤토리 테이블 생성 + GRANT" },
  { file: "scripts/inventory_columns_fix.sql", descEn: "Inventory: add active, sort_order, category_id etc. (prevents 400)", descKo: "인벤토리 컬럼 보강 (400 방지)" },
  { file: "scripts/promotions_tables_create.sql", descEn: "Promotions: create tables + RLS in one go", descKo: "승급 테이블 생성 + RLS" },
  { file: "scripts/promotions_columns_fix.sql", descEn: "Promotions: add missing columns (prevents 400)", descKo: "승급 컬럼 추가 (400 방지)" },
  { file: "scripts/create_student_with_contract_rpc.sql", descEn: "New student signup: fee columns + RPC (run entire file in Supabase)", descKo: "신규 학생 가입·수수료 컬럼·RPC" },
  { file: "scripts/students_rls_allow.sql", descEn: "Fix print page 401: allow read students, contracts, tags (anon/authenticated)", descKo: "인쇄 401 해결" },
  { file: "scripts/students_optional_relationship.sql", descEn: "Make Parents → Relationship optional (no error when empty)", descKo: "보호자 관계 선택 항목" },
  { file: "scripts/student_medical_body_notes_fix.sql", descEn: "Add medical fields for Student Detail (allergies, medications, diagnosis, notes)", descKo: "학생 의료·메모 필드" },
  { file: "scripts/program_period_prices.sql", descEn: "Table: 1/3/6/12/24 month prices per program", descKo: "프로그램별 기간별 요금" },
  { file: "scripts/pricing_full_setup.sql", descEn: "RLS for programs, pricing_items, belts, pricing_plans", descKo: "요금·프로그램·띠 RLS" },
];

export default function SettingsPage() {
  return (
    <AppShell
      title="Settings"
      description="Reference data and system configuration. Fees and finance are in the Finance menu."
    >
      <div style={{ display: "grid", gap: 24 }}>
        <div
          style={{
            padding: 20,
            borderRadius: 14,
            background: "#0f172a",
            border: "1px solid #1e293b",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10, color: "#f8fafc" }}>
            DB Setup <span style={smallKoStyle}>DB 설정</span>
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12, lineHeight: 1.5 }}>
            Copy file contents in Supabase → SQL Editor and run. <span style={smallKoStyle}>Supabase SQL Editor에서 파일 내용 복사 후 실행</span>
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, lineHeight: 1.6 }}>
            For Finance menu: run only one of <code style={{ background: "#1e293b", padding: "0 4px", borderRadius: 2 }}>finance_tables_rls</code> or <code style={{ background: "#1e293b", padding: "0 4px", borderRadius: 2 }}>finance_tables_rls_disable</code>. <span style={smallKoStyle}>재무 메뉴 사용 시 둘 중 하나만 실행</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#cbd5e1", lineHeight: 1.8 }}>
            {setupScripts.map(({ file, descEn, descKo }) => (
              <li key={file}>
                <code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: 4 }}>{file}</code>
                {" — "}
                {descEn}
                <span style={smallKoStyle}> {descKo}</span>
              </li>
            ))}
          </ul>
        </div>

        {linkGroups.map((group) => (
          <div key={group.title}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#94a3b8", marginBottom: 10 }}>
              {group.title} <span style={smallKoStyle}>{group.titleKo}</span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 12,
              }}
            >
              {group.links.map(({ label, labelKo, href, desc, descKo }) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: "block",
                    padding: 16,
                    borderRadius: 12,
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    textDecoration: "none",
                    color: "#f8fafc",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{label} <span style={smallKoStyle}>{labelKo}</span></div>
                  <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{desc} <span style={smallKoStyle}>{descKo}</span></div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
