"use client";

import type { CSSProperties } from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

type TabKey = "programs" | "extras" | "belts" | "plans" | "period";

type PeriodPriceRow = {
  id: string;
  program_id: string;
  period_months: number;
  amount: number | null;
  registration_fee: number | null;
  programs?: { name: string | null } | null;
};

type PlanRow = {
  id: string;
  name: string;
  program_id: string | null;
  billing_type: string | null;
  contract_months: number | null;
  weekly_frequency: number | null;
  sessions_per_week: number | null;
  amount: number | null;
  registration_fee: number | null;
  late_fee: number | null;
  sort_order: number | null;
  active: boolean | null;
  note: string | null;
  programs: { name: string | null } | null;
};

type ProgramRow = {
  id: string;
  name: string;
  price: number | null;
  active: boolean | null;
  sort_order: number | null;
};

type PricingItemRow = {
  id: string;
  name: string;
  category: string | null;
  unit_price: number | null;
  active: boolean | null;
  sort_order: number | null;
  inventory_variant_id?: string | null;
};

type InventoryVariantOption = {
  id: string;
  variant_name: string | null;
  inventory_item_id: string;
  inventory_items: { name: string | null } | null;
};

type BeltRow = {
  id: string;
  name: string;
  color: string | null;
  stripes?: number;
  active: boolean | null;
  sort_order?: number | null;
};

function formatPlanMoney(value: number | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-";
}

function formatBillingType(value: string | null | undefined) {
  if (!value) return "-";
  const map: Record<string, string> = {
    monthly: "Monthly",
    contract: "Contract",
    weekly: "Weekly",
    one_time: "One Time",
  };
  return map[value] ?? value;
}

function ProgramPricingContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: TabKey =
    tabParam === "plans" || tabParam === "programs" || tabParam === "extras" || tabParam === "belts" || tabParam === "period"
      ? tabParam
      : "programs";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [pricingItems, setPricingItems] = useState<PricingItemRow[]>([]);
  const [belts, setBelts] = useState<BeltRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [planFilter, setPlanFilter] = useState("");
  const [periodPrices, setPeriodPrices] = useState<PeriodPriceRow[]>([]);
  const [periodEditMap, setPeriodEditMap] = useState<Record<string, string>>({});
  const [savingPeriod, setSavingPeriod] = useState(false);

  const [programPriceMap, setProgramPriceMap] = useState<Record<string, string>>(
    {}
  );
  const [extraPriceMap, setExtraPriceMap] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [savingPrograms, setSavingPrograms] = useState(false);
  const [savingExtras, setSavingExtras] = useState(false);
  const [creatingProgram, setCreatingProgram] = useState(false);
  const [creatingExtra, setCreatingExtra] = useState(false);

  const [message, setMessage] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [extraFilter, setExtraFilter] = useState("");

  const [newProgramForm, setNewProgramForm] = useState({
    label: "",
    durationValue: "1",
    durationUnit: "month",
    active: true,
    price: "",
  });

  const [newExtraForm, setNewExtraForm] = useState({
    name: "",
    category: "misc",
    unit_price: "",
    active: true,
  });

  const [inventoryVariants, setInventoryVariants] = useState<InventoryVariantOption[]>([]);
  const [updatingInventoryLink, setUpdatingInventoryLink] = useState<string | null>(null);
  const [deletingExtraId, setDeletingExtraId] = useState<string | null>(null);
  const [deletingProgramId, setDeletingProgramId] = useState<string | null>(null);
  const [deletingBeltId, setDeletingBeltId] = useState<string | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [deletingPeriodProgramId, setDeletingPeriodProgramId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "plans" || t === "programs" || t === "extras" || t === "belts" || t === "period") {
      setActiveTab(t);
    }
  }, [searchParams]);

  async function fetchAll() {
    setLoading(true);
    setMessage("");

    const [programRes, pricingRes, beltsRes, plansRes, periodRes, variantsRes] = await Promise.all([
      supabase
        .from("programs")
        .select("id, name, price, active, sort_order")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabase
        .from("pricing_items")
        .select("id, name, category, unit_price, active, sort_order, inventory_variant_id")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabase
        .from("belts")
        .select("id, name, color, active")
        .order("name", { ascending: true }),

      supabase
        .from("pricing_plans")
        .select("id, name, program_id, billing_type, contract_months, weekly_frequency, sessions_per_week, amount, registration_fee, late_fee, sort_order, active, note, programs(name)")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabase
        .from("program_period_prices")
        .select("id, program_id, period_months, amount, registration_fee, programs(name)")
        .eq("active", true)
        .order("program_id", { ascending: true })
        .order("period_months", { ascending: true }),

      supabase
        .from("inventory_variants")
        .select("id, variant_name, inventory_item_id, inventory_items(name)")
        .order("variant_name", { ascending: true }),
    ]);

    let loadError = false;
    if (programRes.error) {
      console.warn("Programs load failed:", programRes.error.message);
      loadError = true;
      setMessage((prev) =>
        prev ? `${prev} Programs unavailable.` : "Programs could not be loaded (table or RLS)."
      );
    }

    if (pricingRes.error) {
      console.warn("Extra fees (pricing_items) load failed:", pricingRes.error.message);
      loadError = true;
      setMessage((prev) =>
        prev ? `${prev} Extra fees unavailable.` : "Extra fees could not be loaded (table or RLS)."
      );
    }

    if (beltsRes.error) {
      console.warn("Belts load failed:", beltsRes.error.message);
      loadError = true;
      setMessage((prev) =>
        prev ? `${prev} Belts unavailable.` : "Belts could not be loaded."
      );
    }

    if (plansRes.error) {
      console.warn("Plans load failed:", plansRes.error.message);
      loadError = true;
      setPlans([]);
    } else {
      setPlans(((plansRes.data ?? []) as unknown) as PlanRow[]);
    }
    if (loadError) {
      setMessage((prev) => prev + " Fix: Supabase SQL Editor에서 scripts/pricing_full_setup.sql 실행 (또는 programs_rls_fix.sql, pricing_items_rls_fix.sql 개별 실행).");
    }

    const nextPrograms = (programRes.data ?? []) as ProgramRow[];
    const nextPricingItems = (pricingRes.data ?? []) as PricingItemRow[];
    const nextBelts = (beltsRes.data ?? []).map((b: BeltRow) => ({ ...b, stripes: (b as { stripes?: number }).stripes ?? 0 })) as BeltRow[];

    setPrograms(nextPrograms);
    setPricingItems(nextPricingItems);
    setBelts(nextBelts);

    const nextProgramMap: Record<string, string> = {};
    nextPrograms.forEach((row) => {
      nextProgramMap[row.id] =
        row.price !== null && row.price !== undefined ? String(row.price) : "";
    });
    setProgramPriceMap(nextProgramMap);

    if (!variantsRes.error && variantsRes.data) {
      setInventoryVariants((variantsRes.data ?? []) as unknown as InventoryVariantOption[]);
    } else {
      setInventoryVariants([]);
    }

    const nextExtraMap: Record<string, string> = {};
    nextPricingItems.forEach((row) => {
      nextExtraMap[row.id] =
        row.unit_price !== null && row.unit_price !== undefined
          ? String(row.unit_price)
          : "";
    });
    setExtraPriceMap(nextExtraMap);

    if (periodRes.error) {
      console.warn("Period prices load failed:", periodRes.error.message);
      setPeriodPrices([]);
      setPeriodEditMap({});
    } else {
      const rows = ((periodRes.data ?? []) as unknown) as PeriodPriceRow[];
      setPeriodPrices(rows);
      const editMap: Record<string, string> = {};
      rows.forEach((r) => {
        const key = `${r.program_id}-${r.period_months}`;
        editMap[key] = r.amount != null ? String(r.amount) : "";
      });
      setPeriodEditMap(editMap);
    }

    setLoading(false);
  }

  function handleProgramPriceChange(id: string, value: string) {
    setProgramPriceMap((prev) => ({ ...prev, [id]: value }));
  }

  function handleExtraPriceChange(id: string, value: string) {
    setExtraPriceMap((prev) => ({ ...prev, [id]: value }));
  }

  function handlePeriodPriceChange(programId: string, periodMonths: number, value: string) {
    const key = `${programId}-${periodMonths}`;
    setPeriodEditMap((prev) => ({ ...prev, [key]: value }));
  }

  async function savePeriodPrices() {
    setSavingPeriod(true);
    setMessage("");
    const PERIODS = [1, 3, 6, 12, 24];
    const rows: { program_id: string; period_months: number; amount: number; registration_fee: number }[] = [];
    for (const program of programs) {
      for (const period of PERIODS) {
        const raw = periodEditMap[`${program.id}-${period}`] ?? "";
        const amount = raw === "" ? 0 : Number(raw);
        if (!Number.isNaN(amount) && amount >= 0) {
          rows.push({ program_id: program.id, period_months: period, amount, registration_fee: 0 });
        }
      }
    }
    if (rows.length === 0) {
      setMessage("No period prices to save.");
      setSavingPeriod(false);
      return;
    }
    const { error } = await supabase.from("program_period_prices").upsert(rows, {
      onConflict: "program_id,period_months",
      ignoreDuplicates: false,
    });
    if (error) {
      setMessage("Period prices save failed: " + error.message + ". Run scripts/program_period_prices.sql in Supabase.");
      setSavingPeriod(false);
      return;
    }
    setMessage("Period prices saved.");
    fetchAll();
    setSavingPeriod(false);
  }

  async function saveProgramPrices() {
    setSavingPrograms(true);
    setMessage("");

    try {
      for (const row of programs) {
        const raw = programPriceMap[row.id] ?? "";
        const parsed = raw === "" ? 0 : Number(raw);

        if (Number.isNaN(parsed) || parsed < 0) {
          throw new Error(`Invalid price: ${row.name}`);
        }

        const { error } = await supabase
          .from("programs")
          .update({ price: parsed })
          .eq("id", row.id);

        if (error) throw error;
      }

      setMessage("Program prices saved.");
      await fetchAll();
    } catch (error: unknown) {
      const msg = (error && typeof error === "object" && "message" in error) ? String((error as { message: string }).message) : (error instanceof Error ? error.message : "Failed to save program prices.");
      console.warn("Save program prices failed:", error);
      setMessage(msg);
    } finally {
      setSavingPrograms(false);
    }
  }

  async function saveExtraPrices() {
    setSavingExtras(true);
    setMessage("");

    try {
      for (const row of pricingItems) {
        const raw = extraPriceMap[row.id] ?? "";
        const parsed = raw === "" ? 0 : Number(raw);

        if (Number.isNaN(parsed) || parsed < 0) {
          throw new Error(`Invalid price: ${row.name}`);
        }

        const { error } = await supabase
          .from("pricing_items")
          .update({ unit_price: parsed })
          .eq("id", row.id);

        if (error) throw error;
      }

      setMessage("Extra fee prices saved.");
      await fetchAll();
    } catch (error: unknown) {
      const msg = (error && typeof error === "object" && "message" in error) ? String((error as { message: string }).message) : (error instanceof Error ? error.message : "Failed to save extra fee prices.");
      console.warn("Save extra prices failed:", error);
      setMessage(msg);
    } finally {
      setSavingExtras(false);
    }
  }

  async function deleteExtraItem(row: PricingItemRow) {
    if (!window.confirm(`Delete "${row.name}"?\n\nStudents or contracts using this item can be reassigned to another extra fee (or a newly created one) after deletion. Proceed?`)) return;
    setDeletingExtraId(row.id);
    setMessage("");
    try {
      const { error } = await supabase.from("pricing_items").delete().eq("id", row.id);
      if (error) throw error;
      setPricingItems((prev) => prev.filter((p) => p.id !== row.id));
      setExtraPriceMap((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      setMessage(`"${row.name}" deleted.`);
    } catch (error: unknown) {
      const msg = (error && typeof error === "object" && "message" in error) ? String((error as { message: string }).message) : (error instanceof Error ? error.message : "Failed to delete.");
      setMessage(msg);
    } finally {
      setDeletingExtraId(null);
    }
  }

  async function deleteProgram(row: ProgramRow) {
    if (!window.confirm(`Delete program "${row.name}"?\n\nStudents or contracts using this program can be reassigned to another program (or a newly created one) after deletion. Proceed?`)) return;
    setDeletingProgramId(row.id);
    setMessage("");
    try {
      const { error } = await supabase.from("programs").delete().eq("id", row.id);
      if (error) throw error;
      setPrograms((prev) => prev.filter((p) => p.id !== row.id));
      setProgramPriceMap((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      setMessage(`Program "${row.name}" deleted.`);
    } catch (error: unknown) {
      const msg = (error && typeof error === "object" && "message" in error) ? String((error as { message: string }).message) : (error instanceof Error ? error.message : "Failed to delete.");
      setMessage(msg);
    } finally {
      setDeletingProgramId(null);
    }
  }

  async function deleteBelt(row: BeltRow) {
    if (!window.confirm(`Delete belt "${row.name}"?\n\nStudents or promotions using this belt can be reassigned to another belt (or a newly created one) after deletion. Proceed?`)) return;
    setDeletingBeltId(row.id);
    setMessage("");
    try {
      const { error } = await supabase.from("belts").delete().eq("id", row.id);
      if (error) throw error;
      setBelts((prev) => prev.filter((b) => b.id !== row.id));
      setMessage(`Belt "${row.name}" deleted.`);
    } catch (error: unknown) {
      const msg = (error && typeof error === "object" && "message" in error) ? String((error as { message: string }).message) : (error instanceof Error ? error.message : "Failed to delete.");
      setMessage(msg);
    } finally {
      setDeletingBeltId(null);
    }
  }

  async function deletePlan(row: PlanRow) {
    if (!window.confirm(`Delete plan "${row.name}"?\n\nStudents or contracts using this plan can be reassigned to another plan (or a newly created one) after deletion. Proceed?`)) return;
    setDeletingPlanId(row.id);
    setMessage("");
    try {
      const { error } = await supabase.from("pricing_plans").delete().eq("id", row.id);
      if (error) throw error;
      setPlans((prev) => prev.filter((p) => p.id !== row.id));
      setMessage(`Plan "${row.name}" deleted.`);
    } catch (error: unknown) {
      const msg = (error && typeof error === "object" && "message" in error) ? String((error as { message: string }).message) : (error instanceof Error ? error.message : "Failed to delete.");
      setMessage(msg);
    } finally {
      setDeletingPlanId(null);
    }
  }

  async function deleteProgramPeriods(programId: string, programName: string) {
    if (!window.confirm(`Delete all period prices for "${programName}"?\n\nContracts using these prices can use another program or newly created period prices after deletion. Proceed?`)) return;
    setDeletingPeriodProgramId(programId);
    setMessage("");
    try {
      const { error } = await supabase.from("program_period_prices").delete().eq("program_id", programId);
      if (error) throw error;
      setPeriodPrices((prev) => prev.filter((p) => p.program_id !== programId));
      setPeriodEditMap((prev) => {
        const next = { ...prev };
        [1, 3, 6, 12, 24].forEach((m) => delete next[`${programId}-${m}`]);
        return next;
      });
      setMessage(`Period prices for "${programName}" deleted.`);
    } catch (error: unknown) {
      const msg = (error && typeof error === "object" && "message" in error) ? String((error as { message: string }).message) : (error instanceof Error ? error.message : "Failed to delete.");
      setMessage(msg);
    } finally {
      setDeletingPeriodProgramId(null);
    }
  }

  async function createProgram() {
    setCreatingProgram(true);
    setMessage("");

    try {
      const rawDuration = (newProgramForm.durationValue || "1").toString().trim();
      const durationValue = parseInt(rawDuration, 10);
      const price = Number(newProgramForm.price || 0);

      if (!newProgramForm.label.trim()) {
        throw new Error("Program label is required.");
      }

      if (!rawDuration || Number.isNaN(durationValue) || durationValue <= 0) {
        throw new Error("Please enter a duration (e.g. 1 or 3).");
      }

      if (Number.isNaN(price) || price < 0) {
        throw new Error("Price must be 0 or more.");
      }

      const unitLabel =
        newProgramForm.durationUnit === "week"
          ? durationValue === 1
            ? "Week"
            : "Weeks"
          : newProgramForm.durationUnit === "month"
          ? durationValue === 1
            ? "Month"
            : "Months"
          : durationValue === 1
          ? "Year"
          : "Years";

      const fullName = `${durationValue} ${unitLabel} ${newProgramForm.label}`.trim();

      const nextSort =
        programs.length > 0
          ? Math.max(...programs.map((item) => item.sort_order ?? 0)) + 1
          : 1;

      const { error } = await supabase.from("programs").insert({
        name: fullName,
        price,
        active: newProgramForm.active,
        sort_order: nextSort,
      });

      if (error) throw error;

      setMessage("Program created.");
      setNewProgramForm({
        label: "",
        durationValue: "1",
        durationUnit: "month",
        active: true,
        price: "",
      });

      await fetchAll();
    } catch (error: unknown) {
      const msg =
        (error && typeof error === "object" && "message" in error)
          ? String((error as { message: string }).message)
          : error instanceof Error
            ? error.message
            : "Failed to create program. Check Supabase: programs table exists and RLS allows INSERT.";
      console.warn("Create program failed:", error);
      setMessage(msg);
    } finally {
      setCreatingProgram(false);
    }
  }

  async function createExtraItem() {
    setCreatingExtra(true);
    setMessage("");

    try {
      const unitPrice = Number(newExtraForm.unit_price || 0);

      if (!newExtraForm.name.trim()) {
        throw new Error("Extra fee name is required.");
      }

      if (Number.isNaN(unitPrice) || unitPrice < 0) {
        throw new Error("Unit price must be 0 or more.");
      }

      const nextSort =
        pricingItems.length > 0
          ? Math.max(...pricingItems.map((item) => item.sort_order ?? 0)) + 1
          : 1;

      const { error } = await supabase.from("pricing_items").insert({
        name: newExtraForm.name.trim(),
        category: newExtraForm.category,
        unit_price: unitPrice,
        active: newExtraForm.active,
        sort_order: nextSort,
      });

      if (error) throw error;

      setMessage("Extra fee item created.");
      setNewExtraForm({
        name: "",
        category: "misc",
        unit_price: "",
        active: true,
      });

      await fetchAll();
    } catch (error: unknown) {
      const msg =
        (error && typeof error === "object" && "message" in error)
          ? String((error as { message: string }).message)
          : error instanceof Error
            ? error.message
            : "Failed to create extra fee item. Check Supabase: pricing_items table exists and RLS allows INSERT.";
      console.warn("Create extra item failed:", error);
      setMessage(msg);
    } finally {
      setCreatingExtra(false);
    }
  }

  const filteredPrograms = useMemo(() => {
    const keyword = programFilter.trim().toLowerCase();
    if (!keyword) return programs;
    return programs.filter((item) => item.name.toLowerCase().includes(keyword));
  }, [programs, programFilter]);

  const filteredExtras = useMemo(() => {
    const keyword = extraFilter.trim().toLowerCase();
    if (!keyword) return pricingItems;
    return pricingItems.filter((item) => item.name.toLowerCase().includes(keyword));
  }, [pricingItems, extraFilter]);

  const filteredPlans = useMemo(() => {
    const keyword = planFilter.trim().toLowerCase();
    if (!keyword) return plans;
    return plans.filter(
      (row) =>
        row.name.toLowerCase().includes(keyword) ||
        (row.programs?.name ?? "").toLowerCase().includes(keyword) ||
        (row.billing_type ?? "").toLowerCase().includes(keyword)
    );
  }, [plans, planFilter]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={wrapperStyle}>
          <div style={cardStyle}>Loading pricing data...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={wrapperStyle}>
        <div style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>Taekwondo Manager</div>
            <h1 style={titleStyle}>Pricing & Events</h1>
            <div style={descStyle}>
              Program, extra fee, and event pricing base management.
            </div>
          </div>

          <div style={actionWrapStyle}>
            <Link href="/dashboard" style={secondaryButtonStyle}>
              Dashboard
            </Link>
            <Link href="/events" style={primaryLinkStyle}>
              Open Events
            </Link>
          </div>
        </div>

        <div style={tabBarStyle}>
          <button onClick={() => setActiveTab("programs")} style={activeTab === "programs" ? activeTabStyle : tabStyle}>
            Programs
          </button>
          <button onClick={() => setActiveTab("extras")} style={activeTab === "extras" ? activeTabStyle : tabStyle}>
            Extra Fees
          </button>
          <button onClick={() => setActiveTab("belts")} style={activeTab === "belts" ? activeTabStyle : tabStyle}>
            Belts
          </button>
          <button onClick={() => setActiveTab("plans")} style={activeTab === "plans" ? activeTabStyle : tabStyle}>
            Plans
          </button>
          <button onClick={() => setActiveTab("period")} style={activeTab === "period" ? activeTabStyle : tabStyle}>
            Period
          </button>
        </div>

        {message ? <div style={messageStyle}>{message}</div> : null}

        {activeTab === "period" && (
          <>
            <div style={cardStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <div style={sectionTitleStyle}>Period prices (1 / 3 / 6 / 12 / 24 months)</div>
                  <div style={sectionDescStyle}>
                    Set amount per program per contract period. Used for contract options. Run scripts/program_period_prices.sql if table is missing.
                  </div>
                </div>
                <button onClick={savePeriodPrices} style={primaryButtonStyle} disabled={savingPeriod}>
                  {savingPeriod ? "Saving..." : "Apply"}
                </button>
              </div>
              <div style={compactTableWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Program</th>
                      <th style={thStyle}>1 mo</th>
                      <th style={thStyle}>3 mo</th>
                      <th style={thStyle}>6 mo</th>
                      <th style={thStyle}>12 mo</th>
                      <th style={thStyle}>24 mo</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programs.filter((p) => p.active !== false).map((row) => (
                      <tr key={row.id}>
                        <td style={tdStyle}>{row.name}</td>
                        {[1, 3, 6, 12, 24].map((period) => (
                          <td style={tdStyle} key={period}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={periodEditMap[`${row.id}-${period}`] ?? ""}
                              onChange={(e) => handlePeriodPriceChange(row.id, period, e.target.value)}
                              style={smallInputStyle}
                              placeholder="—"
                            />
                          </td>
                        ))}
                        <td style={tdStyle}>
                          <button
                            type="button"
                            onClick={() => deleteProgramPeriods(row.id, row.name)}
                            disabled={deletingPeriodProgramId === row.id}
                            style={{ ...deleteButtonStyle, cursor: deletingPeriodProgramId === row.id ? "not-allowed" : "pointer" }}
                          >
                            {deletingPeriodProgramId === row.id ? "..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {programs.filter((p) => p.active !== false).length === 0 && (
                      <tr>
                        <td style={tdStyle} colSpan={7}>No active programs.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === "programs" && (
          <>
            <div style={cardStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <div style={sectionTitleStyle}>Program Pricing</div>
                  <div style={sectionDescStyle}>
                    Saved prices become the base price for new students and renewals.
                  </div>
                </div>

                <div style={toolbarStyle}>
                  <input
                    placeholder="Filter program"
                    value={programFilter}
                    onChange={(e) => setProgramFilter(e.target.value)}
                    style={filterInputStyle}
                  />
                  <button onClick={saveProgramPrices} style={primaryButtonStyle} disabled={savingPrograms}>
                    {savingPrograms ? "Saving..." : "Apply"}
                  </button>
                </div>
              </div>

              <div style={compactTableWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Program</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Current</th>
                      <th style={thStyle}>New</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrograms.map((row) => (
                      <tr key={row.id}>
                        <td style={tdStyle}>{row.name}</td>
                        <td style={tdStyle}>{row.active === false ? "Inactive" : "Active"}</td>
                        <td style={tdStyle}>${Number(row.price ?? 0).toLocaleString()}</td>
                        <td style={tdStyle}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={programPriceMap[row.id] ?? ""}
                            onChange={(e) => handleProgramPriceChange(row.id, e.target.value)}
                            style={smallInputStyle}
                          />
                        </td>
                        <td style={tdStyle}>
                          <button
                            type="button"
                            onClick={() => deleteProgram(row)}
                            disabled={deletingProgramId === row.id}
                            style={{ ...deleteButtonStyle, cursor: deletingProgramId === row.id ? "not-allowed" : "pointer" }}
                          >
                            {deletingProgramId === row.id ? "..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredPrograms.length === 0 && (
                      <tr>
                        <td style={tdStyle} colSpan={5}>No matching programs.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ height: 24 }} />

            <div style={{ ...cardStyle, borderLeft: "4px solid #3b82f6" }}>
              <div style={sectionHeaderStyle}>
                <div>
                  <div style={sectionTitleStyle}>Create Program</div>
                  <div style={sectionDescStyle}>
                    Add a new program template. This price becomes the base price too.
                  </div>
                </div>

                <button onClick={createProgram} style={primaryButtonStyle} disabled={creatingProgram}>
                  {creatingProgram ? "Creating..." : "Create Program"}
                </button>
              </div>

              <div style={createRowGridStyleNarrow}>
                <label style={labelStyle}>
                  Label
                  <input
                    style={{ ...inputStyle, minWidth: 0 }}
                    value={newProgramForm.label}
                    onChange={(e) => setNewProgramForm((prev) => ({ ...prev, label: e.target.value }))}
                    placeholder="e.g. Basic"
                  />
                </label>
                <label style={labelStyle}>
                  Duration
                  <div style={{ display: "flex", gap: 8, minWidth: 0 }}>
                    <input
                      type="number"
                      min="1"
                      style={{ ...inputStyle, minWidth: 0, flex: "1 1 0" }}
                      value={newProgramForm.durationValue}
                      onChange={(e) => setNewProgramForm((prev) => ({ ...prev, durationValue: e.target.value }))}
                      placeholder="3"
                    />
                    <select
                      style={{ ...inputStyle, minWidth: 80 }}
                      value={newProgramForm.durationUnit}
                      onChange={(e) => setNewProgramForm((prev) => ({ ...prev, durationUnit: e.target.value }))}
                    >
                      <option value="week">week</option>
                      <option value="month">month</option>
                      <option value="year">year</option>
                    </select>
                  </div>
                </label>
                <label style={labelStyle}>
                  Price
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={{ ...inputStyle, minWidth: 0 }}
                    value={newProgramForm.price}
                    onChange={(e) => setNewProgramForm((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="0"
                  />
                </label>
                <label style={labelStyle}>
                  Status
                  <select
                    style={{ ...inputStyle, minWidth: 0 }}
                    value={newProgramForm.active ? "active" : "inactive"}
                    onChange={(e) => setNewProgramForm((prev) => ({ ...prev, active: e.target.value === "active" }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>
            </div>
          </>
        )}

        {activeTab === "extras" && (
          <>
            <div style={cardStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <div style={sectionTitleStyle}>Extra Fee Pricing</div>
                  <div style={sectionDescStyle}>
                    Add and manage Uniform, T-Shirt, Testing Fee, and custom fee items. Link an item to inventory below so when sold at registration, stock is auto-deducted. Run scripts/pricing_items_inventory_link.sql if the Inventory column does not appear.
                  </div>
                </div>

                <div style={toolbarStyle}>
                  <input
                    placeholder="Filter extra fee"
                    value={extraFilter}
                    onChange={(e) => setExtraFilter(e.target.value)}
                    style={filterInputStyle}
                  />
                  <button onClick={saveExtraPrices} style={primaryButtonStyle} disabled={savingExtras}>
                    {savingExtras ? "Saving..." : "Apply"}
                  </button>
                </div>
              </div>

              <div style={compactTableWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Item</th>
                      <th style={thStyle}>Category</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Current</th>
                      <th style={thStyle}>New</th>
                      <th style={thStyle}>Inventory</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExtras.map((row) => (
                      <tr key={row.id}>
                        <td style={tdStyle}>{row.name}</td>
                        <td style={tdStyle}>{row.category ?? "-"}</td>
                        <td style={tdStyle}>{row.active === false ? "Inactive" : "Active"}</td>
                        <td style={tdStyle}>${Number(row.unit_price ?? 0).toLocaleString()}</td>
                        <td style={tdStyle}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={extraPriceMap[row.id] ?? ""}
                            onChange={(e) => handleExtraPriceChange(row.id, e.target.value)}
                            style={smallInputStyle}
                          />
                        </td>
                        <td style={tdStyle}>
                          <select
                            value={row.inventory_variant_id ?? ""}
                            onChange={async (e) => {
                              const val = e.target.value || null;
                              setUpdatingInventoryLink(row.id);
                              try {
                                const { error } = await supabase
                                  .from("pricing_items")
                                  .update({ inventory_variant_id: val })
                                  .eq("id", row.id);
                                if (!error) {
                                  setPricingItems((prev) =>
                                    prev.map((p) =>
                                      p.id === row.id ? { ...p, inventory_variant_id: val } : p
                                    )
                                  );
                                } else {
                                  setMessage(error.message);
                                }
                              } finally {
                                setUpdatingInventoryLink(null);
                              }
                            }}
                            disabled={updatingInventoryLink === row.id}
                            style={{ ...smallInputStyle, minWidth: 140 }}
                          >
                            <option value="">— No link</option>
                            {inventoryVariants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.inventory_items?.name ?? "Item"} / {v.variant_name ?? v.id.slice(0, 8)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={tdStyle}>
                          <button
                            type="button"
                            onClick={() => deleteExtraItem(row)}
                            disabled={deletingExtraId === row.id}
                            style={{ ...deleteButtonStyle, cursor: deletingExtraId === row.id ? "not-allowed" : "pointer" }}
                          >
                            {deletingExtraId === row.id ? "..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredExtras.length === 0 && (
                      <tr>
                        <td style={tdStyle} colSpan={7}>No matching extra fees.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ height: 16 }} />

            <div style={cardStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <div style={sectionTitleStyle}>Create Extra Fee Item</div>
                  <div style={sectionDescStyle}>
                    Add a custom fee item that can be reused in money-related pages.
                  </div>
                </div>

                <button onClick={createExtraItem} style={primaryButtonStyle} disabled={creatingExtra}>
                  {creatingExtra ? "Creating..." : "Create Item"}
                </button>
              </div>

              <div style={createRowGridStyle}>
                <label style={labelStyle}>
                  Name
                  <input
                    style={inputStyle}
                    value={newExtraForm.name}
                    onChange={(e) => setNewExtraForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Uniform"
                  />
                </label>
                <label style={labelStyle}>
                  Category
                  <select
                    style={inputStyle}
                    value={newExtraForm.category}
                    onChange={(e) => setNewExtraForm((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="uniform">uniform</option>
                    <option value="t_shirt">t_shirt</option>
                    <option value="testing_fee">testing_fee</option>
                    <option value="kukkiwon_fee">kukkiwon_fee</option>
                    <option value="event_fee">event_fee</option>
                    <option value="misc">misc</option>
                  </select>
                </label>
                <label style={labelStyle}>
                  Unit price
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={inputStyle}
                    value={newExtraForm.unit_price}
                    onChange={(e) => setNewExtraForm((prev) => ({ ...prev, unit_price: e.target.value }))}
                    placeholder="0"
                  />
                </label>
                <label style={labelStyle}>
                  Status
                  <select
                    style={inputStyle}
                    value={newExtraForm.active ? "active" : "inactive"}
                    onChange={(e) => setNewExtraForm((prev) => ({ ...prev, active: e.target.value === "active" }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>
            </div>
          </>
        )}

        {activeTab === "belts" && (
          <div style={cardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <div style={sectionTitleStyle}>Belts</div>
                <div style={sectionDescStyle}>
                  Belt ranks used for students and promotions. Full edit in Settings.
                </div>
              </div>
              <Link href="/settings/belts" style={secondaryButtonStyle}>
                Manage Belts
              </Link>
            </div>
            <div style={compactTableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Color</th>
                    <th style={thStyle}>Stripes</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {belts.map((row) => (
                    <tr key={row.id}>
                      <td style={tdStyle}>{row.name}</td>
                      <td style={tdStyle}>{row.color ?? "-"}</td>
                      <td style={tdStyle}>{row.stripes ?? 0}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            background: row.active === true ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                            color: row.active === true ? "#4ade80" : "#f87171",
                          }}
                        >
                          {row.active === true ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          onClick={() => deleteBelt(row)}
                          disabled={deletingBeltId === row.id}
                          style={{ ...deleteButtonStyle, cursor: deletingBeltId === row.id ? "not-allowed" : "pointer" }}
                        >
                          {deletingBeltId === row.id ? "..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {belts.length === 0 && (
                    <tr>
                      <td style={tdStyle} colSpan={5}>No belts. Add them in Settings &gt; Belts.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "plans" && (
          <div style={cardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <div style={sectionTitleStyle}>Billing Plans</div>
                <div style={sectionDescStyle}>
                  Tuition plans by program, contract term, and billing type. Used for enrollments and renewals.
                </div>
              </div>
              <input
                placeholder="Search plans"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                style={filterInputStyle}
              />
            </div>
            <div style={compactTableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Order</th>
                    <th style={thStyle}>Plan Name</th>
                    <th style={thStyle}>Program</th>
                    <th style={thStyle}>Billing</th>
                    <th style={thStyle}>Months</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Reg Fee</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.map((row) => (
                    <tr key={row.id}>
                      <td style={tdStyle}>{row.sort_order ?? "-"}</td>
                      <td style={tdStyle}>{row.name}</td>
                      <td style={tdStyle}>{row.programs?.name ?? "-"}</td>
                      <td style={tdStyle}>{formatBillingType(row.billing_type)}</td>
                      <td style={tdStyle}>{row.contract_months ?? "-"}</td>
                      <td style={tdStyle}>{formatPlanMoney(row.amount)}</td>
                      <td style={tdStyle}>{formatPlanMoney(row.registration_fee)}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            background: row.active === true ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                            color: row.active === true ? "#4ade80" : "#f87171",
                          }}
                        >
                          {row.active === true ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          onClick={() => deletePlan(row)}
                          disabled={deletingPlanId === row.id}
                          style={{ ...deleteButtonStyle, cursor: deletingPlanId === row.id ? "not-allowed" : "pointer" }}
                        >
                          {deletingPlanId === row.id ? "..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPlans.length === 0 && (
                    <tr>
                      <td style={tdStyle} colSpan={9}>No billing plans yet, or the pricing_plans table uses a different schema. <Link href="/settings/pricing-plans" style={{ color: "#60a5fa" }}>Settings → Pricing Plans</Link> to create or edit.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: 12, fontSize: 13, color: "#94a3b8" }}>
              <Link href="/settings/pricing-plans" style={{ color: "#60a5fa" }}>Settings → Pricing Plans</Link> to create or edit plans.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProgramPricingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#020617", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>Loading...</div>}>
      <ProgramPricingContent />
    </Suspense>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#020617",
  color: "#ffffff",
  padding: 24,
};

const wrapperStyle: CSSProperties = {
  maxWidth: 1380,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 20,
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "#67e8f9",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontWeight: 800,
};

const titleStyle: CSSProperties = {
  margin: "8px 0 0 0",
  fontSize: 40,
  fontWeight: 900,
};

const descStyle: CSSProperties = {
  marginTop: 10,
  color: "#94a3b8",
  fontSize: 15,
  lineHeight: 1.6,
};

const actionWrapStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const tabBarStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 16,
};

const tabStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#0f172a",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
};

const activeTabStyle: CSSProperties = {
  ...tabStyle,
  background: "#1d4ed8",
  border: "1px solid #3b82f6",
};

const cardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 18,
  padding: 20,
  background: "#081226",
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 16,
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
};

const sectionDescStyle: CSSProperties = {
  marginTop: 6,
  color: "#94a3b8",
  fontSize: 14,
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const filterInputStyle: CSSProperties = {
  width: 220,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#020617",
  color: "#ffffff",
  outline: "none",
};

const compactTableWrapStyle: CSSProperties = {
  overflowX: "auto",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  color: "#94a3b8",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  fontSize: 14,
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};

const smallInputStyle: CSSProperties = {
  width: 110,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#020617",
  color: "#ffffff",
  outline: "none",
};

const deleteButtonStyle: CSSProperties = {
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 600,
  color: "#fecaca",
  background: "rgba(127,29,29,0.3)",
  border: "1px solid rgba(239,68,68,0.4)",
  borderRadius: 8,
  cursor: "pointer",
};

const createRowGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
};

const createRowGridStyleNarrow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: 16,
};

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  color: "#cbd5e1",
  fontSize: 14,
};

const inputStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#020617",
  color: "#ffffff",
  outline: "none",
};

const messageStyle: CSSProperties = {
  marginBottom: 14,
  padding: "12px 14px",
  borderRadius: 12,
  background: "rgba(56, 189, 248, 0.12)",
  color: "#7dd3fc",
  border: "1px solid rgba(56, 189, 248, 0.25)",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#111827",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 700,
};

const primaryButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #3b82f6",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
};

const primaryLinkStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #3b82f6",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 800,
  textDecoration: "none",
  display: "inline-block",
};