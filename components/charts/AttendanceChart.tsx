"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Data = {
  date: string;
  count: number;
};

export default function AttendanceChart({
  data,
}: {
  data: Data[];
}) {
  return (
    <div style={{ width: "100%", minWidth: 1, height: 300, minHeight: 1 }}>
      <ResponsiveContainer width="100%" height={300} minHeight={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#64748b"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}