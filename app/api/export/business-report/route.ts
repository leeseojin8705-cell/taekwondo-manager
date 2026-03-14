import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [
      studentsRes,
      revenueMonthlyRes,
      expenseMonthlyRes,
      businessMonthlyRes,
      businessQuarterlyRes,
      expenseDetailRes,
      movementRes,
      paymentRes,
    ] = await Promise.all([
      supabase
        .from("students")
        .select("id, name, status, join_date")
        .order("name", { ascending: true }),

      supabase
        .from("monthly_revenue_stats")
        .select("*")
        .order("month_start", { ascending: true }),

      supabase
        .from("monthly_expense_stats")
        .select("*")
        .order("month_start", { ascending: true }),

      supabase
        .from("monthly_business_stats")
        .select("*")
        .order("month_start", { ascending: true }),

      supabase
        .from("quarterly_business_stats")
        .select("*")
        .order("quarter_start", { ascending: true }),

      supabase
        .from("expense_records")
        .select("*")
        .order("expense_date", { ascending: true }),

      supabase
        .from("monthly_student_movement_stats")
        .select("*")
        .order("month_start", { ascending: true }),

      supabase
        .from("payment_records")
        .select("*")
        .order("payment_date", { ascending: true }),
    ]);

    const workbook = XLSX.utils.book_new();

    const students = studentsRes.data ?? [];
    const monthlyRevenue = revenueMonthlyRes.data ?? [];
    const monthlyExpense = expenseMonthlyRes.data ?? [];
    const monthlyBusiness = businessMonthlyRes.data ?? [];
    const quarterlyBusiness = businessQuarterlyRes.data ?? [];
    const expenseDetails = expenseDetailRes.data ?? [];
    const studentMovement = movementRes.data ?? [];
    const paymentDetails = paymentRes.data ?? [];

    const activeStudents = students.filter((s: any) => s.status === "active").length;
    const totalJoin = students.filter((s: any) => s.join_date).length;
    const totalWithdraw = students.filter((s: any) => s.withdraw_date).length;

    const totalRevenue = monthlyRevenue.reduce(
      (sum: number, row: any) => sum + Number(row.total_revenue ?? 0),
      0
    );

    const totalExpense = monthlyExpense.reduce(
      (sum: number, row: any) => sum + Number(row.total_expense ?? 0),
      0
    );

    const executiveSummary = [
      { Metric: "Active Students", Value: activeStudents },
      { Metric: "Total Join", Value: totalJoin },
      { Metric: "Total Withdraw", Value: totalWithdraw },
      { Metric: "Net Change", Value: totalJoin - totalWithdraw },
      { Metric: "Total Revenue", Value: totalRevenue },
      { Metric: "Total Expense", Value: totalExpense },
      { Metric: "Net Profit", Value: totalRevenue - totalExpense },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(executiveSummary),
      "Executive Summary"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(monthlyBusiness),
      "Monthly Business"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(quarterlyBusiness),
      "Quarterly Business"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(studentMovement),
      "Student Movement"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(paymentDetails),
      "Payment Details"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(expenseDetails),
      "Expense Details"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(students),
      "Students"
    );

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="business-report.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Export failed" },
      { status: 500 }
    );
  }
}