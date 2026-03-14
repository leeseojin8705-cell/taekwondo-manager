"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";
import { supabase } from "../../../lib/supabase";

type Row = {
  id: string;
  student_id: string;
  checkin_date: string;
  warning_flags: string[] | null;
};

function getToday() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

export default function AttendanceDashboard() {

  const [rows,setRows] = useState<Row[]>([]);

  useEffect(()=>{
    load();
  },[]);

  async function load(){

    const {data,error} = await supabase
      .from("attendance_logs")
      .select("id,student_id,checkin_date,warning_flags")
      .order("checkin_date",{ascending:false})
      .limit(500);

    if(error){
      console.error(error);
      return;
    }

    setRows(data ?? []);
  }

  const today = getToday();

  const stats = useMemo(()=>{

    const todayAttendance = rows.filter(
      r => r.checkin_date === today
    ).length;

    const warnings = rows.filter(
      r => r.warning_flags && r.warning_flags.length > 0
    ).length;

    const uniqueStudents = new Set(
      rows.map(r=>r.student_id)
    ).size;

    return {
      todayAttendance,
      warnings,
      uniqueStudents
    };

  },[rows]);

  return(

    <AppShell
      title="Attendance Dashboard"
      description="Daily attendance overview"
    >

      <div style={{display:"grid",gap:20}}>

        <PageCard title="Attendance Summary">

          <div style={grid}>

            <Card
              title="Today Check-ins"
              value={stats.todayAttendance}
            />

            <Card
              title="Students Checked"
              value={stats.uniqueStudents}
            />

            <Card
              title="Warnings"
              value={stats.warnings}
            />

          </div>

        </PageCard>

      </div>

    </AppShell>

  );

}

function Card({title,value}:{title:string,value:number}){

  return(
    <div style={card}>
      <div style={label}>{title}</div>
      <div style={valueStyle}>{value}</div>
    </div>
  )

}

const grid:React.CSSProperties={
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
  gap:16
}

const card:React.CSSProperties={
  border:"1px solid #334155",
  borderRadius:12,
  padding:16,
  background:"#0f172a"
}

const label:React.CSSProperties={
  fontSize:12,
  color:"#94a3b8",
  fontWeight:800
}

const valueStyle:React.CSSProperties={
  fontSize:28,
  fontWeight:900,
  color:"#f8fafc"
}