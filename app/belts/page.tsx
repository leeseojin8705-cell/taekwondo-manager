"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/ui/AppShell";
import PageCard from "../../components/ui/PageCard";
import { supabase } from "../../lib/supabase";

type Belt = {
  id: string;
  name: string;
  color: string | null;
  stripes?: number;
  active: boolean;
};

export default function BeltsPage() {

  const [belts,setBelts] = useState<Belt[]>([])

  useEffect(()=>{
    loadBelts()
  },[])

  async function loadBelts() {
    const withStripes = await supabase
      .from("belts")
      .select("id, name, color, stripes, active")
      .order("name", { ascending: true });

    if (withStripes.error) {
      const code = String((withStripes.error as { code?: string }).code ?? "");
      const msg = withStripes.error.message ?? "";
      if (code === "42703" || msg.includes("stripes") || msg.includes("does not exist")) {
        const withoutStripes = await supabase
          .from("belts")
          .select("id, name, color, active")
          .order("name", { ascending: true });
        if (withoutStripes.error) {
          console.error(withoutStripes.error);
          return;
        }
        setBelts(((withoutStripes.data ?? []).map((r) => ({ ...r, stripes: 0 })) as Belt[]));
        return;
      }
      console.error(withStripes.error);
      return;
    }

    setBelts((withStripes.data ?? []) as Belt[]);
  }

  return (

<AppShell title="Belts" description="Belt levels">

<PageCard title="Belts">

<table style={{width:"100%",borderCollapse:"collapse"}}>

<thead>

<tr>
<th style={{textAlign:"left"}}>Name</th>
<th style={{textAlign:"left"}}>Color</th>
<th style={{textAlign:"left"}}>Stripes</th>
<th style={{textAlign:"left"}}>Status</th>
</tr>

</thead>

<tbody>

{belts.map(belt=>(
<tr key={belt.id}>
<td>{belt.name}</td>
<td>{belt.color}</td>
<td>{belt.stripes ?? 0}</td>
<td>{belt.active ? "Active":"Inactive"}</td>

</tr>
))}

</tbody>

</table>

</PageCard>

</AppShell>

  )
}