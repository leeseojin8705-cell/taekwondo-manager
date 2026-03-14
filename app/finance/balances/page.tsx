"use client";

import { useEffect, useState } from "react";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import EmptyState from "../../../components/ui/EmptyState";

type Row = {
  id: string;
  invoice_number: string;
  balance_amount: number;
  due_date: string | null;
  status: string;
  students: {
    id: string;
    full_name?: string | null;
    name?: string | null;
  } | null;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function getStudentName(student: Row["students"]) {
  return student?.full_name || student?.name || "-";
}

export default function StudentBalancePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBalances();
  }, []);

  async function loadBalances() {
    try {
      const res = await fetch("/api/finance/balances");
      const json = res.ok ? await res.json() : { rows: [] };
      setRows(json.rows ?? []);
    } catch (err) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Student Balances">
        <LoadingBlock message="Loading balances..." />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Student Balances"
      description="Students with unpaid invoices"
    >
      <PageCard title="Unpaid Students">
        {rows.length === 0 ? (
          <EmptyState
            title="No unpaid balances"
            description="All students are paid."
          />
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Student</th>
                <th style={thStyle}>Invoice</th>
                <th style={thStyle}>Due Date</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Balance</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={trStyle}>
                  <td style={tdStyle}>
                    {getStudentName(row.students)}
                  </td>

                  <td style={tdStyle}>
                    {row.invoice_number}
                  </td>

                  <td style={tdStyle}>
                    {row.due_date || "-"}
                  </td>

                  <td style={tdStyle}>
                    {row.status}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      color: "#ef4444",
                      fontWeight: 800,
                    }}
                  >
                    {formatMoney(row.balance_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PageCard>
    </AppShell>
  );
}

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #334155",
  color: "#94a3b8",
};

const tdStyle: React.CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid #1e293b",
};

const trStyle: React.CSSProperties = {
  background: "#0f172a",
};