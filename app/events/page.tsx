"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type EventRow = {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  status: string;
  event_type: string;
  participant_count: number | null;
  price_per_person: number | null;
  manual_income: number | null;
  total_income: number | null;
  total_expense: number | null;
  net_profit: number | null;
  display_order: number | null;
  is_settled: boolean | null;
  settled_at: string | null;
  settlement_note: string | null;
  note: string | null;
};

type EventExpenseRow = {
  id: string;
  event_id: string;
  category: string;
  description: string | null;
  amount: number | null;
  note: string | null;
  created_at?: string;
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [expenses, setExpenses] = useState<EventExpenseRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");

  const [loading, setLoading] = useState(true);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [settling, setSettling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState("");
  const [message, setMessage] = useState("");

  const [editingEventId, setEditingEventId] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState("");

  const [eventForm, setEventForm] = useState({
    title: "",
    event_date: "",
    start_time: "",
    end_time: "",
    location: "",
    status: "scheduled",
    event_type: "general",
    participant_count: "0",
    price_per_person: "0",
    manual_income: "0",
    display_order: "0",
    note: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    event_id: "",
    category: "other",
    description: "",
    amount: "0",
    note: "",
  });

  const [settlementNote, setSettlementNote] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    setMessage("");

    const [eventRes, expenseRes] = await Promise.all([
      supabase
        .from("academy_events")
        .select(
          "id,title,event_date,start_time,end_time,location,status,event_type,participant_count,price_per_person,manual_income,total_income,total_expense,net_profit,display_order,is_settled,settled_at,settlement_note,note"
        )
        .order("event_date", { ascending: true })
        .order("display_order", { ascending: true }),

      supabase
        .from("academy_event_expenses")
        .select("id,event_id,category,description,amount,note,created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (eventRes.error) {
      console.error(eventRes.error);
      setMessage(`Event load error: ${eventRes.error.message}`);
    }

    if (expenseRes.error) {
      console.error(expenseRes.error);
      setMessage((prev) =>
        prev
          ? `${prev} | Expense load error: ${expenseRes.error?.message}`
          : `Expense load error: ${expenseRes.error?.message}`
      );
    }

    const nextEvents = (eventRes.data ?? []) as EventRow[];
    const nextExpenses = (expenseRes.data ?? []) as EventExpenseRow[];

    setEvents(nextEvents);
    setExpenses(nextExpenses);

    const firstId = nextEvents[0]?.id ?? "";
    const nextSelected =
      selectedEventId && nextEvents.some((e) => e.id === selectedEventId)
        ? selectedEventId
        : firstId;

    setSelectedEventId(nextSelected);

    setExpenseForm((prev) => ({
      ...prev,
      event_id: editingExpenseId ? prev.event_id : nextSelected,
    }));

    const selected = nextEvents.find((e) => e.id === nextSelected);
    setSettlementNote(selected?.settlement_note || "");

    setLoading(false);
  }

  function resetEventForm() {
    setEditingEventId("");
    setEventForm({
      title: "",
      event_date: "",
      start_time: "",
      end_time: "",
      location: "",
      status: "scheduled",
      event_type: "general",
      participant_count: "0",
      price_per_person: "0",
      manual_income: "0",
      display_order: "0",
      note: "",
    });
  }

  function resetExpenseForm(eventId?: string) {
    setEditingExpenseId("");
    setExpenseForm({
      event_id: eventId ?? selectedEventId ?? "",
      category: "other",
      description: "",
      amount: "0",
      note: "",
    });
  }

  async function createEvent() {
    setCreatingEvent(true);
    setMessage("");

    try {
      if (!eventForm.title.trim()) {
        throw new Error("Event name is required.");
      }

      if (!eventForm.event_date) {
        throw new Error("Event date is required.");
      }

      const participantCount = Number(eventForm.participant_count || 0);
      const pricePerPerson = Number(eventForm.price_per_person || 0);
      const manualIncome = Number(eventForm.manual_income || 0);
      const displayOrder = Number(eventForm.display_order || 0);

      if (Number.isNaN(participantCount) || participantCount < 0) {
        throw new Error("Participant count must be 0 or more.");
      }

      if (Number.isNaN(pricePerPerson) || pricePerPerson < 0) {
        throw new Error("Price per person must be 0 or more.");
      }

      if (Number.isNaN(manualIncome) || manualIncome < 0) {
        throw new Error("Manual income must be 0 or more.");
      }

      const { data, error } = await supabase
        .from("academy_events")
        .insert({
          title: eventForm.title.trim(),
          event_date: eventForm.event_date,
          start_time: eventForm.start_time || null,
          end_time: eventForm.end_time || null,
          location: eventForm.location || null,
          status: eventForm.status,
          event_type: eventForm.event_type,
          participant_count: participantCount,
          price_per_person: pricePerPerson,
          manual_income: manualIncome,
          display_order: Number.isNaN(displayOrder) ? 0 : displayOrder,
          note: eventForm.note || null,
        })
        .select()
        .single();

      if (error) throw error;

      setMessage("Event created successfully.");
      resetEventForm();

      await fetchAll();

      if (data?.id) {
        setSelectedEventId(data.id);
        resetExpenseForm(data.id);
      }
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Failed to create event.");
    } finally {
      setCreatingEvent(false);
    }
  }

  async function updateEvent() {
    if (!editingEventId) return;

    setSavingEvent(true);
    setMessage("");

    try {
      if (!eventForm.title.trim()) {
        throw new Error("Event name is required.");
      }

      if (!eventForm.event_date) {
        throw new Error("Event date is required.");
      }

      const participantCount = Number(eventForm.participant_count || 0);
      const pricePerPerson = Number(eventForm.price_per_person || 0);
      const manualIncome = Number(eventForm.manual_income || 0);
      const displayOrder = Number(eventForm.display_order || 0);

      if (Number.isNaN(participantCount) || participantCount < 0) {
        throw new Error("Participant count must be 0 or more.");
      }

      if (Number.isNaN(pricePerPerson) || pricePerPerson < 0) {
        throw new Error("Price per person must be 0 or more.");
      }

      if (Number.isNaN(manualIncome) || manualIncome < 0) {
        throw new Error("Manual income must be 0 or more.");
      }

      const { error } = await supabase
        .from("academy_events")
        .update({
          title: eventForm.title.trim(),
          event_date: eventForm.event_date,
          start_time: eventForm.start_time || null,
          end_time: eventForm.end_time || null,
          location: eventForm.location || null,
          status: eventForm.status,
          event_type: eventForm.event_type,
          participant_count: participantCount,
          price_per_person: pricePerPerson,
          manual_income: manualIncome,
          display_order: Number.isNaN(displayOrder) ? 0 : displayOrder,
          note: eventForm.note || null,
        })
        .eq("id", editingEventId);

      if (error) throw error;

      setMessage("Event updated.");
      await fetchAll();
      resetEventForm();
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Failed to update event.");
    } finally {
      setSavingEvent(false);
    }
  }

  function startEditEvent(row: EventRow) {
    setEditingEventId(row.id);
    setSelectedEventId(row.id);

    setEventForm({
      title: row.title || "",
      event_date: row.event_date || "",
      start_time: row.start_time || "",
      end_time: row.end_time || "",
      location: row.location || "",
      status: row.status || "scheduled",
      event_type: row.event_type || "general",
      participant_count: String(row.participant_count ?? 0),
      price_per_person: String(row.price_per_person ?? 0),
      manual_income: String(row.manual_income ?? 0),
      display_order: String(row.display_order ?? 0),
      note: row.note || "",
    });

    setSettlementNote(row.settlement_note || "");
  }

  async function saveExpense() {
    setSavingExpense(true);
    setMessage("");

    try {
      if (!expenseForm.event_id) {
        throw new Error("Select an event first.");
      }

      const amount = Number(expenseForm.amount || 0);

      if (Number.isNaN(amount) || amount < 0) {
        throw new Error("Expense amount must be 0 or more.");
      }

      if (editingExpenseId) {
        const { error } = await supabase
          .from("academy_event_expenses")
          .update({
            event_id: expenseForm.event_id,
            category: expenseForm.category,
            description: expenseForm.description || null,
            amount,
            note: expenseForm.note || null,
          })
          .eq("id", editingExpenseId);

        if (error) throw error;

        setMessage("Expense updated.");
      } else {
        const { error } = await supabase.from("academy_event_expenses").insert({
          event_id: expenseForm.event_id,
          category: expenseForm.category,
          description: expenseForm.description || null,
          amount,
          note: expenseForm.note || null,
        });

        if (error) throw error;

        setMessage("Event expense added.");
      }

      await fetchAll();
      resetExpenseForm(expenseForm.event_id);
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Failed to save event expense.");
    } finally {
      setSavingExpense(false);
    }
  }

  function startEditExpense(row: EventExpenseRow) {
    setEditingExpenseId(row.id);
    setExpenseForm({
      event_id: row.event_id,
      category: row.category || "other",
      description: row.description || "",
      amount: String(row.amount ?? 0),
      note: row.note || "",
    });
    setSelectedEventId(row.event_id);
  }

  async function deleteExpense(expenseId: string) {
    const ok = window.confirm("Delete this expense?");
    if (!ok) return;

    setDeletingExpenseId(expenseId);
    setMessage("");

    try {
      const { error } = await supabase
        .from("academy_event_expenses")
        .delete()
        .eq("id", expenseId);

      if (error) throw error;

      if (editingExpenseId === expenseId) {
        resetExpenseForm(selectedEventId);
      }

      setMessage("Expense deleted.");
      await fetchAll();
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Failed to delete expense.");
    } finally {
      setDeletingExpenseId("");
    }
  }

  async function confirmSettlement() {
    if (!selectedEventId) {
      setMessage("Select an event first.");
      return;
    }

    setSettling(true);
    setMessage("");

    try {
      const { error } = await supabase.rpc("confirm_event_settlement", {
        p_event_id: selectedEventId,
        p_settlement_note: settlementNote || null,
      });

      if (error) throw error;

      setMessage("Event settlement confirmed.");
      await fetchAll();
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Failed to confirm settlement.");
    } finally {
      setSettling(false);
    }
  }

  async function unconfirmSettlement() {
    if (!selectedEventId) {
      setMessage("Select an event first.");
      return;
    }

    setSettling(true);
    setMessage("");

    try {
      const { error } = await supabase.rpc("unconfirm_event_settlement", {
        p_event_id: selectedEventId,
      });

      if (error) throw error;

      setMessage("Event settlement reverted.");
      await fetchAll();
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Failed to unconfirm settlement.");
    } finally {
      setSettling(false);
    }
  }

  async function deleteEvent() {
    if (!selectedEventId) {
      setMessage("Select an event first.");
      return;
    }

    const ok = window.confirm("Delete this event?");
    if (!ok) return;

    setDeleting(true);
    setMessage("");

    try {
      const { error } = await supabase.rpc("delete_academy_event", {
        p_event_id: selectedEventId,
      });

      if (error) throw error;

      setMessage("Event deleted.");

      if (editingEventId === selectedEventId) {
        resetEventForm();
      }

      setSelectedEventId("");
      resetExpenseForm("");
      await fetchAll();
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Failed to delete event.");
    } finally {
      setDeleting(false);
    }
  }

  const selectedEvent = useMemo(() => {
    return events.find((item) => item.id === selectedEventId) ?? null;
  }, [events, selectedEventId]);

  const selectedExpenseEvent = useMemo(() => {
    return events.find((item) => item.id === expenseForm.event_id) ?? null;
  }, [events, expenseForm.event_id]);

  const selectedExpenses = useMemo(() => {
    return expenses.filter((item) => item.event_id === selectedEventId);
  }, [expenses, selectedEventId]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={wrapperStyle}>
          <div style={cardStyle}>Loading events...</div>
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
            <h1 style={titleStyle}>Event Management</h1>
            <div style={descStyle}>
              Create event, edit event, add expense, and confirm settlement.
            </div>
          </div>

          <div style={headerButtonWrapStyle}>
            <Link href="/dashboard" style={secondaryButtonStyle}>
              Dashboard
            </Link>
            <Link href="/program-pricing" style={secondaryButtonStyle}>
              Pricing
            </Link>
          </div>
        </div>

        {message ? <div style={messageStyle}>{message}</div> : null}

        <div style={topGridStyle}>
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>
              {editingEventId ? "Edit Event" : "Create Event"}
            </div>

            {editingEventId ? (
              <div style={selectedInfoBoxStyle}>
                <div style={selectedInfoTitleStyle}>Editing event</div>
                <div style={selectedInfoMainStyle}>{eventForm.title || "-"}</div>
                <div style={selectedInfoSubStyle}>
                  Date: {eventForm.event_date || "-"}
                </div>
              </div>
            ) : null}

            <div style={formGridStyle}>
              <label style={labelStyle}>
                Event Name
                <input
                  style={inputStyle}
                  value={eventForm.title}
                  onChange={(e) =>
                    setEventForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </label>

              <label style={labelStyle}>
                Date
                <input
                  type="date"
                  style={inputStyle}
                  value={eventForm.event_date}
                  onChange={(e) =>
                    setEventForm((prev) => ({
                      ...prev,
                      event_date: e.target.value,
                    }))
                  }
                />
              </label>

              <label style={labelStyle}>
                Start Time
                <input
                  type="time"
                  style={inputStyle}
                  value={eventForm.start_time}
                  onChange={(e) =>
                    setEventForm((prev) => ({
                      ...prev,
                      start_time: e.target.value,
                    }))
                  }
                />
              </label>

              <label style={labelStyle}>
                End Time
                <input
                  type="time"
                  style={inputStyle}
                  value={eventForm.end_time}
                  onChange={(e) =>
                    setEventForm((prev) => ({
                      ...prev,
                      end_time: e.target.value,
                    }))
                  }
                />
              </label>

              <label style={labelStyle}>
                Location
                <input
                  style={inputStyle}
                  value={eventForm.location}
                  onChange={(e) =>
                    setEventForm((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                />
              </label>

              <label style={labelStyle}>
                Status
                <select
                  style={inputStyle}
                  value={eventForm.status}
                  onChange={(e) =>
                    setEventForm((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                >
                  <option value="scheduled">scheduled</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </label>

              <label style={labelStyle}>
                Type
                <select
                  style={inputStyle}
                  value={eventForm.event_type}
                  onChange={(e) =>
                    setEventForm((prev) => ({
                      ...prev,
                      event_type: e.target.value,
                    }))
                  }
                >
                  <option value="general">general</option>
                  <option value="tournament">tournament</option>
                  <option value="demo">demo</option>
                  <option value="promotion_test">promotion_test</option>
                  <option value="seminar">seminar</option>
                  <option value="camp">camp</option>
                </select>
              </label>

              <label style={labelStyle}>
                Participant Count
                <input
                  type="number"
                  min="0"
                  style={inputStyle}
                  value={eventForm.participant_count}
                  onChange={(e) =>
                    setEventForm((prev) => ({
                      ...prev,
                      participant_count: e.target.value,
                    }))
                  }
                />
              </label>

              <label style={labelStyle}>
                Price Per Person
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={inputStyle}
                  value={eventForm.price_per_person}
                  onChange={(e) =>
                    setEventForm((prev) => ({
                      ...prev,
                      price_per_person: e.target.value,
                    }))
                  }
                />
              </label>

              <label style={labelStyle}>
                <span>Manual Income</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={inputStyle}
                  value={eventForm.manual_income}
                  onChange={(e) =>
                    setEventForm((prev) => ({
                      ...prev,
                      manual_income: e.target.value,
                    }))
                  }
                />
                <span style={helperTextStyle}>
                  Extra income you enter manually. Example: sponsor, snack sale,
                  special fee.
                </span>
              </label>

              <label style={labelStyle}>
                <span>Display Order</span>
                <input
                  type="number"
                  min="0"
                  style={inputStyle}
                  value={eventForm.display_order}
                  onChange={(e) =>
                    setEventForm((prev) => ({
                      ...prev,
                      display_order: e.target.value,
                    }))
                  }
                />
                <span style={helperTextStyle}>
                  Smaller number shows first in the event list.
                </span>
              </label>
            </div>

            <label style={{ ...labelStyle, marginTop: 12 }}>
              Note
              <textarea
                style={textareaStyle}
                value={eventForm.note}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, note: e.target.value }))
                }
              />
            </label>

            <div style={actionRowStyle}>
              {editingEventId ? (
                <>
                  <button
                    onClick={updateEvent}
                    style={primaryButtonStyle}
                    disabled={savingEvent}
                  >
                    {savingEvent ? "Saving..." : "Update Event"}
                  </button>

                  <button
                    onClick={resetEventForm}
                    style={secondaryActionButtonStyle}
                    disabled={savingEvent}
                  >
                    Cancel Edit
                  </button>
                </>
              ) : (
                <button
                  onClick={createEvent}
                  style={primaryButtonStyle}
                  disabled={creatingEvent}
                >
                  {creatingEvent ? "Creating..." : "Create Event"}
                </button>
              )}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={sectionTitleStyle}>
              {editingExpenseId ? "Edit Event-Day Expense" : "Add Event-Day Expense"}
            </div>

            <label style={labelStyle}>
              Event
              <select
                style={inputStyle}
                value={expenseForm.event_id}
                onChange={(e) => {
                  const nextId = e.target.value;
                  const nextEvent =
                    events.find((item) => item.id === nextId) ?? null;

                  setExpenseForm((prev) => ({
                    ...prev,
                    event_id: nextId,
                  }));
                  setSelectedEventId(nextId);
                  setSettlementNote(nextEvent?.settlement_note || "");
                }}
              >
                <option value="">Select event</option>
                {events.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.title} | {row.event_date}
                  </option>
                ))}
              </select>
            </label>

            <div style={selectedInfoBoxStyle}>
              {selectedExpenseEvent ? (
                <>
                  <div style={selectedInfoTitleStyle}>
                    {editingExpenseId ? "Editing expense for" : "Selected event"}
                  </div>
                  <div style={selectedInfoMainStyle}>
                    {selectedExpenseEvent.title}
                  </div>
                  <div style={selectedInfoSubStyle}>
                    Date: {selectedExpenseEvent.event_date}
                    {selectedExpenseEvent.location
                      ? ` | Location: ${selectedExpenseEvent.location}`
                      : ""}
                  </div>
                </>
              ) : (
                <div style={mutedTextStyle}>No event selected.</div>
              )}
            </div>

            <div style={formGridStyle}>
              <label style={labelStyle}>
                Category
                <select
                  style={inputStyle}
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                >
                  <option value="other">other</option>
                  <option value="venue">venue</option>
                  <option value="transportation">transportation</option>
                  <option value="food">food</option>
                  <option value="uniform">uniform</option>
                  <option value="equipment">equipment</option>
                  <option value="entry_fee">entry_fee</option>
                  <option value="trophy">trophy</option>
                  <option value="medal">medal</option>
                </select>
              </label>

              <label style={labelStyle}>
                Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={inputStyle}
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                />
              </label>

              <label style={labelStyle}>
                Description
                <input
                  style={inputStyle}
                  value={expenseForm.description}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <label style={{ ...labelStyle, marginTop: 12 }}>
              Note
              <textarea
                style={textareaStyle}
                value={expenseForm.note}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    note: e.target.value,
                  }))
                }
              />
            </label>

            <div style={actionRowStyle}>
              <button
                onClick={saveExpense}
                style={primaryButtonStyle}
                disabled={savingExpense || !expenseForm.event_id}
              >
                {savingExpense
                  ? "Saving..."
                  : editingExpenseId
                  ? "Update Expense"
                  : "Add Expense"}
              </button>

              {editingExpenseId ? (
                <button
                  onClick={() => resetExpenseForm(selectedEventId)}
                  style={secondaryActionButtonStyle}
                  disabled={savingExpense}
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div style={bottomGridStyle}>
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>Event List</div>

            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Title</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Settled</th>
                    <th style={thStyle}>Income</th>
                    <th style={thStyle}>Expense</th>
                    <th style={thStyle}>Profit</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((row) => (
                    <tr
                      key={row.id}
                      style={{
                        background:
                          selectedEventId === row.id
                            ? "rgba(37,99,235,0.15)"
                            : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setSelectedEventId(row.id);
                        setExpenseForm((prev) => ({
                          ...prev,
                          event_id: row.id,
                        }));
                        setSettlementNote(row.settlement_note || "");
                      }}
                    >
                      <td style={tdStyle}>{row.event_date}</td>
                      <td style={tdStyle}>{row.title}</td>
                      <td style={tdStyle}>{row.event_type}</td>
                      <td style={tdStyle}>{row.status}</td>
                      <td style={tdStyle}>{row.is_settled ? "Yes" : "No"}</td>
                      <td style={tdStyle}>
                        ${Number(row.total_income ?? 0).toLocaleString()}
                      </td>
                      <td style={tdStyle}>
                        ${Number(row.total_expense ?? 0).toLocaleString()}
                      </td>
                      <td style={tdStyle}>
                        ${Number(row.net_profit ?? 0).toLocaleString()}
                      </td>
                      <td
                        style={tdStyle}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <button
                          onClick={() => startEditEvent(row)}
                          style={miniSecondaryButtonStyle}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}

                  {events.length === 0 && (
                    <tr>
                      <td style={tdStyle} colSpan={9}>
                        No events found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={sectionTitleStyle}>Selected Event Summary</div>

            {selectedEvent ? (
              <>
                <div style={summaryLineStyle}>
                  <strong>Event Name:</strong> {selectedEvent.title}
                </div>
                <div style={summaryLineStyle}>
                  <strong>Date:</strong> {selectedEvent.event_date}
                </div>
                <div style={summaryLineStyle}>
                  <strong>Time:</strong> {selectedEvent.start_time || "-"} ~{" "}
                  {selectedEvent.end_time || "-"}
                </div>
                <div style={summaryLineStyle}>
                  <strong>Location:</strong> {selectedEvent.location || "-"}
                </div>
                <div style={summaryLineStyle}>
                  <strong>Participants:</strong>{" "}
                  {selectedEvent.participant_count ?? 0}
                </div>
                <div style={summaryLineStyle}>
                  <strong>Price / Person:</strong> $
                  {Number(selectedEvent.price_per_person ?? 0).toLocaleString()}
                </div>
                <div style={summaryLineStyle}>
                  <strong>Manual Income:</strong> $
                  {Number(selectedEvent.manual_income ?? 0).toLocaleString()}
                </div>
                <div style={summaryLineStyle}>
                  <strong>Total Income:</strong> $
                  {Number(selectedEvent.total_income ?? 0).toLocaleString()}
                </div>
                <div style={summaryLineStyle}>
                  <strong>Total Expense:</strong> $
                  {Number(selectedEvent.total_expense ?? 0).toLocaleString()}
                </div>
                <div style={summaryLineStyle}>
                  <strong>Net Profit:</strong> $
                  {Number(selectedEvent.net_profit ?? 0).toLocaleString()}
                </div>
                <div style={summaryLineStyle}>
                  <strong>Settled:</strong>{" "}
                  {selectedEvent.is_settled ? "Yes" : "No"}
                </div>

                <label style={{ ...labelStyle, marginTop: 12 }}>
                  Settlement Note
                  <textarea
                    style={textareaStyle}
                    value={settlementNote}
                    onChange={(e) => setSettlementNote(e.target.value)}
                  />
                </label>

                <div style={summaryButtonWrapStyle}>
                  <button
                    onClick={confirmSettlement}
                    style={primaryButtonStyle}
                    disabled={settling}
                  >
                    Confirm Settlement
                  </button>

                  <button
                    onClick={unconfirmSettlement}
                    style={secondaryActionButtonStyle}
                    disabled={settling}
                  >
                    Unconfirm
                  </button>

                  <button
                    onClick={deleteEvent}
                    style={dangerButtonStyle}
                    disabled={deleting}
                  >
                    Delete Event
                  </button>
                </div>

                <div style={{ marginTop: 18 }}>
                  <div style={subSectionTitleStyle}>Expense Details</div>

                  {selectedExpenses.length === 0 ? (
                    <div style={mutedTextStyle}>No expense rows yet.</div>
                  ) : (
                    <div style={expenseListWrapStyle}>
                      {selectedExpenses.map((row) => (
                        <div
                          key={row.id}
                          style={{
                            ...expenseItemStyle,
                            border:
                              editingExpenseId === row.id
                                ? "1px solid rgba(59,130,246,0.7)"
                                : expenseItemStyle.border,
                            boxShadow:
                              editingExpenseId === row.id
                                ? "0 0 0 1px rgba(59,130,246,0.35) inset"
                                : "none",
                          }}
                        >
                          <div style={expenseItemTopStyle}>
                            <span>{row.category}</span>
                            <strong>
                              ${Number(row.amount ?? 0).toLocaleString()}
                            </strong>
                          </div>

                          <div style={mutedTextStyle}>
                            {row.description || "-"}
                          </div>

                          {row.note ? (
                            <div style={{ ...mutedTextStyle, marginTop: 6 }}>
                              Note: {row.note}
                            </div>
                          ) : null}

                          {row.created_at ? (
                            <div style={{ ...tinyTextStyle, marginTop: 6 }}>
                              Created: {row.created_at.slice(0, 10)}
                            </div>
                          ) : null}

                          <div style={expenseActionWrapStyle}>
                            <button
                              onClick={() => startEditExpense(row)}
                              style={miniSecondaryButtonStyle}
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteExpense(row.id)}
                              style={miniDangerButtonStyle}
                              disabled={deletingExpenseId === row.id}
                            >
                              {deletingExpenseId === row.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={mutedTextStyle}>Select an event first.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#020617",
  color: "#ffffff",
  padding: 24,
};

const wrapperStyle: CSSProperties = {
  maxWidth: 1440,
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

const headerButtonWrapStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const topGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr",
  gap: 18,
};

const bottomGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr",
  gap: 18,
};

const cardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 18,
  padding: 20,
  background: "#081226",
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  marginBottom: 14,
};

const subSectionTitleStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 800,
  marginBottom: 10,
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  fontSize: 14,
  color: "#cbd5e1",
};

const inputStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#020617",
  color: "#ffffff",
  outline: "none",
};

const textareaStyle: CSSProperties = {
  minHeight: 88,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#020617",
  color: "#ffffff",
  outline: "none",
  resize: "vertical",
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

const secondaryButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#111827",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 700,
};

const secondaryActionButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #475569",
  background: "#1e293b",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #ef4444",
  background: "#b91c1c",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
};

const miniSecondaryButtonStyle: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #475569",
  background: "#1e293b",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
};

const miniDangerButtonStyle: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ef4444",
  background: "#7f1d1d",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
};

const messageStyle: CSSProperties = {
  marginBottom: 14,
  padding: "12px 14px",
  borderRadius: 12,
  background: "rgba(56, 189, 248, 0.12)",
  color: "#7dd3fc",
  border: "1px solid rgba(56, 189, 248, 0.25)",
};

const helperTextStyle: CSSProperties = {
  fontSize: 12,
  color: "#94a3b8",
  lineHeight: 1.5,
};

const selectedInfoBoxStyle: CSSProperties = {
  marginTop: 12,
  marginBottom: 14,
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(59,130,246,0.28)",
  background: "rgba(37,99,235,0.10)",
};

const selectedInfoTitleStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#7dd3fc",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginBottom: 4,
};

const selectedInfoMainStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: "#ffffff",
  marginBottom: 4,
};

const selectedInfoSubStyle: CSSProperties = {
  fontSize: 13,
  color: "#cbd5e1",
};

const tableWrapStyle: CSSProperties = {
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
};

const tdStyle: CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  verticalAlign: "middle",
};

const summaryLineStyle: CSSProperties = {
  marginBottom: 8,
  color: "#e2e8f0",
  fontSize: 14,
};

const mutedTextStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 14,
};

const tinyTextStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
};

const expenseListWrapStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const expenseItemStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 12,
  padding: 12,
  background: "#07101f",
};

const expenseItemTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 6,
};

const expenseActionWrapStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 10,
};

const actionRowStyle: CSSProperties = {
  marginTop: 16,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const summaryButtonWrapStyle: CSSProperties = {
  marginTop: 16,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};