"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import { supabase } from "../../../lib/supabase";

type ItemRow = {
  id: string;
  name: string;
  sale_price: number;
  cost_price: number;
};

type VariantRow = {
  id: string;
  inventory_item_id: string;
  variant_name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  sale_price_override: number | null;
  cost_price_override: number | null;
  inventory_items: {
    name: string | null;
    sale_price: number;
    cost_price: number;
  } | null;
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function InventorySummaryPage() {

  const [loading,setLoading] = useState(true)
  const [error,setError] = useState<string | null>(null)

  const [items,setItems] = useState<ItemRow[]>([])
  const [variants,setVariants] = useState<VariantRow[]>([])

  useEffect(()=>{
    fetchSummary()
  },[])

  async function fetchSummary(){

    try{

      setLoading(true)
      setError(null)

      const [itemsRes,variantsRes] = await Promise.all([

        supabase
          .from("inventory_items")
          .select("id,name,sale_price,cost_price")
          .eq("active",true),

        supabase
          .from("inventory_variants")
          .select(`
            id,
            inventory_item_id,
            variant_name,
            stock_quantity,
            low_stock_threshold,
            sale_price_override,
            cost_price_override,
            inventory_items:inventory_item_id (
              name,
              sale_price,
              cost_price
            )
          `)
          .eq("active",true)

      ])

      setItems((itemsRes.error ? [] : itemsRes.data ?? []) as unknown as ItemRow[])
      setVariants((variantsRes.error ? [] : variantsRes.data ?? []) as unknown as VariantRow[])

    }catch(err:any){

      setError(err?.message || "Failed to load summary")

    }finally{

      setLoading(false)

    }

  }

  const summary = useMemo(()=>{

    const totalItems = items.length
    const totalVariants = variants.length

    const totalUnits = variants.reduce(
      (sum,v)=>sum + Number(v.stock_quantity || 0),
      0
    )

    const lowStock = variants.filter(
      v => Number(v.stock_quantity) <= Number(v.low_stock_threshold)
    ).length

    const costValue = variants.reduce((sum,v)=>{

      const cost =
        v.cost_price_override ??
        v.inventory_items?.cost_price ??
        0

      return sum + cost * v.stock_quantity

    },0)

    const saleValue = variants.reduce((sum,v)=>{

      const price =
        v.sale_price_override ??
        v.inventory_items?.sale_price ??
        0

      return sum + price * v.stock_quantity

    },0)

    const topStock = [...variants]
      .sort((a,b)=>b.stock_quantity - a.stock_quantity)
      .slice(0,10)

    return{
      totalItems,
      totalVariants,
      totalUnits,
      lowStock,
      costValue,
      saleValue,
      topStock
    }

  },[items,variants])

  if(loading){
    return(
      <AppShell title="Inventory Summary" description="Inventory overview">
        <LoadingBlock message="Loading inventory summary..." />
      </AppShell>
    )
  }

  if(error){
    return(
      <AppShell title="Inventory Summary" description="Inventory overview">
        <ErrorBlock title="Error" message={error}/>
      </AppShell>
    )
  }

  return(

    <AppShell
      title="Inventory Summary"
      description="Inventory overview and stock value"
    >

      <div style={{display:"grid",gap:20}}>

        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>

          <Link href="/inventory" style={buttonStyle}>
            Inventory Home
          </Link>

          <Link href="/inventory/items" style={buttonStyle}>
            Item Catalog
          </Link>

          <Link href="/inventory/low-stock" style={buttonStyle}>
            Low Stock
          </Link>

        </div>

        <PageCard title="Inventory Overview">

          <div style={gridStyle}>

            <SummaryCard title="Items" value={`${summary.totalItems}`} />

            <SummaryCard title="Variants" value={`${summary.totalVariants}`} />

            <SummaryCard title="Total Units" value={`${summary.totalUnits}`} />

            <SummaryCard
              title="Low Stock"
              value={`${summary.lowStock}`}
              tone="red"
            />

            <SummaryCard
              title="Cost Value"
              value={formatMoney(summary.costValue)}
              tone="yellow"
            />

            <SummaryCard
              title="Sale Value"
              value={formatMoney(summary.saleValue)}
              tone="green"
            />

          </div>

        </PageCard>

        <PageCard title="Top Stock Items">

          <div style={{display:"grid",gap:10}}>

            {summary.topStock.map(v=>(

              <div key={v.id} style={rowStyle}>

                <div>

                  <div style={titleStyle}>
                    {v.inventory_items?.name}
                  </div>

                  <div style={variantStyle}>
                    {v.variant_name}
                  </div>

                </div>

                <div style={stockStyle}>
                  {v.stock_quantity}
                </div>

              </div>

            ))}

          </div>

        </PageCard>

      </div>

    </AppShell>

  )

}

function SummaryCard({title,value,tone="default"}:{
  title:string
  value:string
  tone?: "default"|"red"|"green"|"yellow"
}){

  const color =
    tone==="red"
      ? "#fecaca"
      : tone==="green"
      ? "#bbf7d0"
      : tone==="yellow"
      ? "#fde68a"
      : "#f8fafc"

  return(
    <div style={{
      border:"1px solid #334155",
      background:"#0f172a",
      borderRadius:14,
      padding:18,
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

const gridStyle:React.CSSProperties={
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

const rowStyle:React.CSSProperties={
  border:"1px solid #334155",
  background:"#0f172a",
  borderRadius:12,
  padding:12,
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center"
}

const titleStyle:React.CSSProperties={
  fontWeight:900,
  color:"#f8fafc"
}

const variantStyle:React.CSSProperties={
  fontSize:13,
  color:"#94a3b8"
}

const stockStyle:React.CSSProperties={
  fontSize:20,
  fontWeight:900,
  color:"#60a5fa"
}