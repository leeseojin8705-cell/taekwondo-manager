"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "../../../../../components/ui/AppShell";
import PageCard from "../../../../../components/ui/PageCard";
import { supabase } from "../../../../../lib/supabase";

type Invoice = {
  id: string;
  invoice_number: string;
  balance_amount: number;
};

export default function AllocatePaymentPage() {

  const params = useParams();
  const paymentId = params?.id as string;

  const [invoices,setInvoices] = useState<Invoice[]>([]);
  const [selected,setSelected] = useState<string | null>(null);
  const [amount,setAmount] = useState<number>(0);

  useEffect(()=>{
    loadInvoices();
  },[]);

  async function loadInvoices(){

    const {data,error} = await supabase
      .from("invoices")
      .select("id,invoice_number,balance_amount")
      .gt("balance_amount",0)
      .order("invoice_number");

    if(error){
      console.error(error);
      return;
    }

    setInvoices(data ?? []);
  }

  async function allocate(){

    if(!selected) return;

    const {error} = await supabase
      .from("payment_allocations")
      .insert({
        payment_id: paymentId,
        invoice_id: selected,
        allocated_amount: amount
      });

    if(error){
      alert(error.message);
      return;
    }

    alert("Allocated");
  }

  return(

    <AppShell title="Allocate Payment">

      <PageCard title="Allocate Payment to Invoice">

        <div style={{display:"grid",gap:16}}>

          <select
            value={selected ?? ""}
            onChange={(e)=>setSelected(e.target.value)}
          >
            <option value="">Select Invoice</option>

            {invoices.map(i=>(
              <option key={i.id} value={i.id}>
                {i.invoice_number} - ${i.balance_amount}
              </option>
            ))}

          </select>

          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e)=>setAmount(Number(e.target.value))}
          />

          <button onClick={allocate}>
            Allocate
          </button>

        </div>

      </PageCard>

    </AppShell>

  );
}