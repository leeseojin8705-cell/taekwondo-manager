"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import EmptyState from "../../../components/ui/EmptyState";
import { supabase } from "../../../lib/supabase";

type LowStockRow = {
  id: string;
  variant_name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  inventory_items: {
    id: string;
    name: string | null;
  } | null;
};

export default function InventoryLowStockPage() {

  const [loading,setLoading] = useState(true)
  const [error,setError] = useState<string | null>(null)

  const [rows,setRows] = useState<LowStockRow[]>([])

  useEffect(()=>{
    fetchLowStock()
  },[])

  async function fetchLowStock(){

    try{

      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("inventory_variants")
        .select(`
          id,
          variant_name,
          stock_quantity,
          low_stock_threshold,
          inventory_items:inventory_item_id (
            id,
            name
          )
        `)
        .eq("active", true)
        .order("stock_quantity", { ascending: true });

      if (error) {
        setRows([]);
        return;
      }
      const all = (data ?? []) as unknown as LowStockRow[];
      const lowStock = all.filter((r) => r.stock_quantity <= r.low_stock_threshold);
      setRows(lowStock);

    }catch(err:any){

      setError(err?.message || "Failed to load low stock list.")

    }finally{

      setLoading(false)

    }

  }

  const summary = useMemo(()=>{

    const totalLowStock = rows.length

    const critical = rows.filter(r=>r.stock_quantity === 0).length

    return{
      totalLowStock,
      critical
    }

  },[rows])

  if(loading){
    return(
      <AppShell
        title="Low Stock Alert"
        description="Items that require restocking"
      >
        <LoadingBlock message="Checking stock levels..." />
      </AppShell>
    )
  }

  if(error){
    return(
      <AppShell
        title="Low Stock Alert"
        description="Items that require restocking"
      >
        <ErrorBlock title="Failed to load stock alert" message={error}/>
      </AppShell>
    )
  }

  return(
    <AppShell
      title="Low Stock Alert"
      description="Items that require restocking"
    >

      <div style={{display:"grid",gap:20}}>

        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>

          <Link href="/inventory" style={buttonStyle}>
            Inventory Home
          </Link>

          <Link href="/inventory/stock-in" style={buttonStyle}>
            Stock In
          </Link>

          <Link href="/inventory/items" style={buttonStyle}>
            Item Catalog
          </Link>

        </div>

        <PageCard title="Low Stock Summary">

          <div style={summaryGrid}>

            <SummaryCard
              title="Low Stock Items"
              value={`${summary.totalLowStock}`}
              tone="red"
            />

            <SummaryCard
              title="Critical (0 Stock)"
              value={`${summary.critical}`}
              tone="yellow"
            />

          </div>

        </PageCard>

        <PageCard title="Items Requiring Restock">

          {rows.length === 0 ? (

            <EmptyState
              title="Stock levels are healthy"
              description="No items require restocking."
            />

          ) : (

            <div style={{display:"grid",gap:12}}>

              {rows.map(row =>{

                const critical = row.stock_quantity === 0

                return(

                  <div key={row.id} style={cardStyle}>

                    <div style={headerStyle}>

                      <div>

                        <div style={itemTitle}>
                          {row.inventory_items?.name || "-"}
                        </div>

                        <div style={variantText}>
                          Variant: {row.variant_name}
                        </div>

                      </div>

                      <div style={{
                        fontSize:22,
                        fontWeight:900,
                        color: critical ? "#ef4444" : "#facc15"
                      }}>
                        {row.stock_quantity}
                      </div>

                    </div>

                    <div style={metaGrid}>

                      <MetaItem
                        label="Current Stock"
                        value={`${row.stock_quantity}`}
                      />

                      <MetaItem
                        label="Threshold"
                        value={`${row.low_stock_threshold}`}
                      />

                      <MetaItem
                        label="Status"
                        value={critical ? "Out of Stock" : "Low Stock"}
                      />

                    </div>

                  </div>

                )

              })}

            </div>

          )}

        </PageCard>

      </div>

    </AppShell>
  )

}

function SummaryCard({title,value,tone="default"}:{
  title:string
  value:string
  tone?: "default" | "red" | "yellow"
}){

  const color = tone === "red"
    ? "#fecaca"
    : tone === "yellow"
    ? "#fde68a"
    : "#f8fafc"

  return(
    <div style={{
      border:"1px solid #334155",
      background:"#0f172a",
      borderRadius:14,
      padding:16,
      display:"grid",
      gap:6
    }}>
      <div style={{
        fontSize:12,
        color:"#94a3b8",
        fontWeight:700,
        textTransform:"uppercase"
      }}>
        {title}
      </div>
      <div style={{
        fontSize:26,
        fontWeight:900,
        color
      }}>
        {value}
      </div>
    </div>
  )
}

function MetaItem({label,value}:{label:string,value:string}){

  return(
    <div style={{
      border:"1px solid #1e293b",
      background:"#0b1220",
      borderRadius:10,
      padding:10,
      display:"grid",
      gap:4
    }}>
      <div style={{
        fontSize:11,
        color:"#94a3b8",
        fontWeight:700,
        textTransform:"uppercase"
      }}>
        {label}
      </div>
      <div style={{
        fontSize:14,
        fontWeight:700,
        color:"#f8fafc"
      }}>
        {value}
      </div>
    </div>
  )
}

const summaryGrid:React.CSSProperties={
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
  gap:14
}

const buttonStyle:React.CSSProperties={
  border:"1px solid #334155",
  background:"#0f172a",
  color:"#e2e8f0",
  padding:"10px 16px",
  borderRadius:10,
  textDecoration:"none",
  fontWeight:700
}

const cardStyle:React.CSSProperties={
  border:"1px solid #334155",
  background:"#0f172a",
  borderRadius:14,
  padding:14,
  display:"grid",
  gap:12
}

const headerStyle:React.CSSProperties={
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center"
}

const itemTitle:React.CSSProperties={
  fontSize:16,
  fontWeight:900,
  color:"#f8fafc"
}

const variantText:React.CSSProperties={
  fontSize:13,
  color:"#94a3b8"
}

const metaGrid:React.CSSProperties={
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",
  gap:10
}