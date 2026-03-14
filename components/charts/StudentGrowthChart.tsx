"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

type Data = {
  month: string
  students: number
}

export default function StudentGrowthChart({data}:{data:Data[]}){

  return(

    <div style={{ width: "100%", minWidth: 1, height: 300, minHeight: 1 }}>

      <ResponsiveContainer width="100%" height={300} minHeight={300}>

        <LineChart data={data}>

          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="month" />

          <YAxis />

          <Tooltip />

          <Line
            type="monotone"
            dataKey="students"
            stroke="#3b82f6"
            strokeWidth={3}
          />

        </LineChart>

      </ResponsiveContainer>

    </div>

  )

}