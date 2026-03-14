/**
 * Chart data builders for dashboard (revenue, enrollments/exits, attendance).
 * Used by both / (home) and /dashboard pages.
 */

export type PaymentRowForChart = {
  paid_at: string | null;
  paid_amount?: number | null;
  final_amount?: number | null;
};

export type StudentRowForChart = {
  join_date: string | null;
};

export type ContractRowForChart = {
  end_date: string | null;
  student_id: string | null;
};

export type AttendanceRowForChart = {
  attended_on: string | null;
};

export type RevenueChartData = { month: string; revenue: number };
export type EnrollmentsExitsChartData = { date: string; newEnrollments: number; exits: number };
export type AttendanceChartData = { date: string; count: number };

function safeNum(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function buildDailyRevenueForCurrentMonth(
  rows: PaymentRowForChart[]
): RevenueChartData[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;

  const daily: Record<number, number> = {};
  for (let d = 1; d <= daysInMonth; d++) daily[d] = 0;

  rows.forEach((row) => {
    if (!row.paid_at) return;
    const s = String(row.paid_at).slice(0, 10);
    if (!s.startsWith(yearMonth)) return;
    const day = parseInt(s.slice(8, 10), 10);
    if (!Number.isFinite(day) || day < 1 || day > daysInMonth) return;
    const amount =
      safeNum(row.final_amount) > 0 ? safeNum(row.final_amount) : safeNum(row.paid_amount);
    daily[day] += amount;
  });

  return Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => ({
    month: `${month}/${d}`,
    revenue: daily[d] ?? 0,
  }));
}

export function buildEnrollmentsExitsByDay(
  students: StudentRowForChart[],
  contracts: ContractRowForChart[],
  lastDays: number
): EnrollmentsExitsChartData[] {
  const dailyNew: Record<string, number> = {};
  const dailyExits: Record<string, Set<string>> = {};
  const today = new Date();
  for (let i = 0; i < lastDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (lastDays - 1 - i));
    const key =
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0");
    dailyNew[key] = 0;
    dailyExits[key] = new Set();
  }

  students.forEach((row) => {
    if (!row.join_date) return;
    const key = String(row.join_date).slice(0, 10);
    if (!Object.prototype.hasOwnProperty.call(dailyNew, key)) return;
    dailyNew[key] += 1;
  });

  contracts.forEach((c) => {
    if (!c.end_date || !c.student_id) return;
    const key = String(c.end_date).slice(0, 10);
    if (!Object.prototype.hasOwnProperty.call(dailyExits, key)) return;
    dailyExits[key].add(c.student_id);
  });

  return Object.keys(dailyNew)
    .sort()
    .map((key) => ({
      date: key.slice(5),
      newEnrollments: dailyNew[key] ?? 0,
      exits: dailyExits[key]?.size ?? 0,
    }));
}

export function buildDailyAttendance(
  rows: AttendanceRowForChart[],
  lastDays: number
): AttendanceChartData[] {
  const daily: Record<string, number> = {};
  const today = new Date();
  for (let i = 0; i < lastDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (lastDays - 1 - i));
    const key =
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0");
    daily[key] = 0;
  }

  rows.forEach((row) => {
    if (!row.attended_on) return;
    if (!Object.prototype.hasOwnProperty.call(daily, row.attended_on)) return;
    daily[row.attended_on] += 1;
  });

  return Object.keys(daily)
    .sort()
    .map((dateStr) => ({
      date: dateStr.slice(5),
      count: daily[dateStr],
    }));
}
