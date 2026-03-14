"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useParams } from "next/navigation";
import AppShell from "../../../../components/ui/AppShell";
import PageCard from "../../../../components/ui/PageCard";
import LoadingBlock from "../../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../../components/ui/ErrorBlock";
import EmptyState from "../../../../components/ui/EmptyState";
import { supabase } from "../../../../lib/supabase";
import { formatDate, formatDateTime, formatMoney } from "../../../../lib/format";

type TestingEventDetail = {
  id: string;
  title: string;
  testing_date: string | null;
  location: string | null;
  status: string | null;
  testing_fee: number | null;
  notes: string | null;
  created_at: string;
  testing_type_id?: string | null;
};

type BeltRow = {
  id: string;
  name: string;
};

type StudentSearchRow = {
  id: string;
  name: string;
  status: string | null;
  current_belt_id: string | null;
  classes: {
    name: string | null;
  } | null;
  belts: {
    id: string | null;
    name: string | null;
  } | null;
};

type EventStudentRow = {
  id: string;
  testing_event_id: string;
  student_id: string;
  result_status: string | null;
  note: string | null;
  created_at: string;
  students: {
    id: string;
    name: string | null;
    status: string | null;
    current_belt_id: string | null;
    classes: {
      name: string | null;
    } | null;
    belts: {
      id: string | null;
      name: string | null;
    } | null;
  } | null;
};

type PromotionHistoryRow = {
  id: string;
  student_id: string;
  testing_event_id: string | null;
  from_belt_id: string | null;
  to_belt_id: string | null;
  promoted_at: string | null;
};

type InvoiceRow = {
  id: string;
  student_id: string | null;
  testing_event_id: string | null;
  testing_event_student_id: string | null;
  final_amount: number | null;
  paid_amount: number | null;
  balance_amount: number | null;
  payment_status: string | null;
  created_at: string;
};

type ResultStatus = "pending" | "pass" | "fail";

export default function TestingEventDetailPage() {
  const params = useParams();
  const eventId = String(params?.id ?? "");

  const [loading, setLoading] = useState(true);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [addingStudent, setAddingStudent] = useState(false);
  const [confirmingPromotions, setConfirmingPromotions] = useState(false);
  const [generatingInvoices, setGeneratingInvoices] = useState(false);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [event, setEvent] = useState<TestingEventDetail | null>(null);
  const [belts, setBelts] = useState<BeltRow[]>([]);
  const [participants, setParticipants] = useState<EventStudentRow[]>([]);
  const [promotionHistories, setPromotionHistories] = useState<PromotionHistoryRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<StudentSearchRow[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setHeaderError(null);

        const [eventRes, beltsRes, participantsRes, promotionHistoryRes, invoicesRes] =
          await Promise.all([
            supabase
              .from("testing_events")
              .select(
                "id, title, testing_date, location, status, testing_fee, notes, created_at, testing_type_id"
              )
              .eq("id", eventId)
              .single(),

            supabase
              .from("belts")
              .select("id, name")
              .order("name", { ascending: true }),

            supabase
              .from("testing_event_students")
              .select(`
                id,
                testing_event_id,
                student_id,
                result_status,
                note,
                created_at,
                students:student_id (
                  id,
                  name,
                  status,
                  current_belt_id,
                  classes:class_id ( name ),
                  belts:current_belt_id ( id, name )
                )
              `)
              .eq("testing_event_id", eventId)
              .order("created_at", { ascending: true }),

            supabase
              .from("promotion_histories")
              .select("id, student_id, testing_event_id, from_belt_id, to_belt_id, promoted_at")
              .eq("testing_event_id", eventId),

            supabase
              .from("invoices")
              .select(`
                id,
                student_id,
                testing_event_id,
                testing_event_student_id,
                final_amount,
                paid_amount,
                balance_amount,
                payment_status,
                created_at
              `)
              .eq("testing_event_id", eventId)
              .order("created_at", { ascending: false }),
          ]);

        if (eventRes.error) throw eventRes.error;
        if (beltsRes.error) throw beltsRes.error;
        if (participantsRes.error) throw participantsRes.error;
        if (promotionHistoryRes.error) throw promotionHistoryRes.error;
        if (invoicesRes.error) throw invoicesRes.error;

        if (!active) return;

        setEvent(eventRes.data as unknown as TestingEventDetail);
        setBelts((beltsRes.data ?? []) as unknown as BeltRow[]);
        setParticipants((participantsRes.data ?? []) as unknown as EventStudentRow[]);
        setPromotionHistories((promotionHistoryRes.data ?? []) as unknown as PromotionHistoryRow[]);
        setInvoices((invoicesRes.data ?? []) as unknown as InvoiceRow[]);
      } catch (err: any) {
        if (!active) return;
        setHeaderError(err?.message ?? "Failed to load testing event detail.");
      } finally {
        if (active) setLoading(false);
      }
    }

    if (eventId) {
      load();
    }

    return () => {
      active = false;
    };
  }, [eventId]);

  useEffect(() => {
    let active = true;

    async function searchStudents() {
      const q = studentSearch.trim();

      if (!q) {
        setStudentResults([]);
        return;
      }

      try {
        setSearchingStudents(true);

        const res = await supabase
          .from("students")
          .select(`
            id,
            name,
            status,
            current_belt_id,
            classes:class_id ( name ),
            belts:current_belt_id ( id, name )
          `)
          .ilike("name", `%${q}%`)
          .order("name", { ascending: true })
          .limit(20);

        if (res.error) throw res.error;
        if (!active) return;

        setStudentResults((res.data ?? []) as unknown as StudentSearchRow[]);
      } catch {
        if (!active) return;
        setStudentResults([]);
      } finally {
        if (active) setSearchingStudents(false);
      }
    }

    const timer = setTimeout(searchStudents, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [studentSearch]);

  const participantStudentIds = useMemo(() => {
    return new Set(participants.map((row) => row.student_id));
  }, [participants]);

  const filteredStudentResults = useMemo(() => {
    return studentResults.filter((row) => !participantStudentIds.has(row.id));
  }, [studentResults, participantStudentIds]);

  const summary = useMemo(() => {
    const total = participants.length;
    const pending = participants.filter(
      (row) => !row.result_status || row.result_status === "pending"
    ).length;
    const passed = participants.filter((row) => row.result_status === "pass").length;
    const failed = participants.filter((row) => row.result_status === "fail").length;

    return { total, pending, passed, failed };
  }, [participants]);

  function getNextBelt(currentBeltId: string | null | undefined) {
    if (!currentBeltId || belts.length === 0) return null;
    const idx = belts.findIndex((b) => b.id === currentBeltId);
    if (idx < 0 || idx >= belts.length - 1) return null;
    return belts[idx + 1];
  }

  const promotedStudentIds = useMemo(() => {
    return new Set(promotionHistories.map((row) => row.student_id));
  }, [promotionHistories]);

  const invoicedEventStudentIds = useMemo(() => {
    return new Set(
      invoices
        .map((row) => row.testing_event_student_id)
        .filter(Boolean) as string[]
    );
  }, [invoices]);

  const invoiceCandidates = useMemo(() => {
    return participants.filter((row) => !invoicedEventStudentIds.has(row.id));
  }, [participants, invoicedEventStudentIds]);

  const promotionCandidates = useMemo(() => {
    return participants
      .map((row) => {
        const currentBeltId = row.students?.belts?.id ?? null;
        const nextBelt = getNextBelt(currentBeltId);

        return {
          row,
          nextBelt,
          alreadyPromoted: promotedStudentIds.has(row.student_id),
        };
      })
      .filter(
        (item) =>
          item.row.result_status === "pass" &&
          !!item.row.students &&
          !!item.nextBelt &&
          !item.alreadyPromoted
      );
  }, [participants, promotedStudentIds, belts]);

  const invoiceSummary = useMemo(() => {
    const totalInvoices = invoices.length;
    const unpaid = invoices.filter(
      (row) => (row.payment_status ?? "unpaid") !== "paid"
    ).length;
    const paid = invoices.filter((row) => row.payment_status === "paid").length;
    const totalAmount = invoices.reduce(
      (sum, row) => sum + Number(row.final_amount ?? 0),
      0
    );

    return {
      totalInvoices,
      unpaid,
      paid,
      totalAmount,
    };
  }, [invoices]);

  async function handleAddStudent(student: StudentSearchRow) {
    try {
      setAddingStudent(true);
      setHeaderError(null);
      setSuccessMessage(null);

      const insertRes = await supabase
        .from("testing_event_students")
        .insert({
          testing_event_id: eventId,
          student_id: student.id,
          result_status: "pending",
          note: null,
        })
        .select(`
          id,
          testing_event_id,
          student_id,
          result_status,
          note,
          created_at,
          students:student_id (
            id,
            name,
            status,
            current_belt_id,
            classes:class_id ( name ),
            belts:current_belt_id ( id, name )
          )
        `)
        .single();

      if (insertRes.error) throw insertRes.error;

      setParticipants((prev) => [...prev, insertRes.data as unknown as EventStudentRow]);
      setStudentSearch("");
      setStudentResults([]);
    } catch (err: any) {
      setHeaderError(err?.message ?? "Failed to add student to testing event.");
    } finally {
      setAddingStudent(false);
    }
  }

  async function handleUpdateResult(rowId: string, nextStatus: ResultStatus) {
    try {
      setSavingRowId(rowId);
      setHeaderError(null);
      setSuccessMessage(null);

      const updateRes = await supabase
        .from("testing_event_students")
        .update({ result_status: nextStatus })
        .eq("id", rowId)
        .select("id, result_status")
        .single();

      if (updateRes.error) throw updateRes.error;

      setParticipants((prev) =>
        prev.map((row) =>
          row.id === rowId ? { ...row, result_status: nextStatus } : row
        )
      );
    } catch (err: any) {
      setHeaderError(err?.message ?? "Failed to update result.");
    } finally {
      setSavingRowId(null);
    }
  }

  async function handleRemoveStudent(rowId: string) {
    try {
      setSavingRowId(rowId);
      setHeaderError(null);
      setSuccessMessage(null);

      const deleteRes = await supabase
        .from("testing_event_students")
        .delete()
        .eq("id", rowId);

      if (deleteRes.error) throw deleteRes.error;

      setParticipants((prev) => prev.filter((row) => row.id !== rowId));
    } catch (err: any) {
      setHeaderError(err?.message ?? "Failed to remove student.");
    } finally {
      setSavingRowId(null);
    }
  }

  async function handleGenerateTestingFeeInvoices() {
    if (!event) return;

    try {
      setGeneratingInvoices(true);
      setHeaderError(null);
      setSuccessMessage(null);

      if ((event.testing_fee ?? 0) <= 0) {
        setHeaderError("Testing fee must be greater than 0 before generating invoices.");
        return;
      }

      if (invoiceCandidates.length === 0) {
        setHeaderError("No invoice candidates found. All participants already have testing fee invoices.");
        return;
      }

      const createdInvoices: InvoiceRow[] = [];

      for (const row of invoiceCandidates) {
        const duplicateRes = await supabase
          .from("invoices")
          .select("id")
          .eq("testing_event_student_id", row.id)
          .limit(1);

        if (duplicateRes.error) throw duplicateRes.error;
        if ((duplicateRes.data ?? []).length > 0) {
          continue;
        }

        const amount = Number(event.testing_fee ?? 0);

        const payload = {
          student_id: row.student_id,
          student_name: row.students?.name ?? null,
          student_program_id: null,
          payment_category: "testing_fee",
          description: `Testing Fee - ${event.title}`,
          base_amount: amount,
          discount_amount: 0,
          final_amount: amount,
          paid_amount: 0,
          balance_amount: amount,
          payment_status: "unpaid",
          payment_method: null,
          due_date: event.testing_date ?? null,
          paid_at: null,
          note: null,
          testing_event_id: event.id,
          testing_event_student_id: row.id,
        };

        const insertRes = await supabase
          .from("invoices")
          .insert(payload)
          .select(`
            id,
            student_id,
            testing_event_id,
            testing_event_student_id,
            final_amount,
            paid_amount,
            balance_amount,
            payment_status,
            created_at
          `)
          .single();

        if (insertRes.error) throw insertRes.error;

        createdInvoices.push(insertRes.data as unknown as InvoiceRow);
      }

      setInvoices((prev) => [...createdInvoices, ...prev]);
      setSuccessMessage(
        `${createdInvoices.length} testing fee invoice${createdInvoices.length === 1 ? "" : "s"} created successfully.`
      );
    } catch (err: any) {
      setHeaderError(err?.message ?? "Failed to generate testing fee invoices.");
    } finally {
      setGeneratingInvoices(false);
    }
  }

  async function handleConfirmPromotions() {
    if (!event) return;

    try {
      setConfirmingPromotions(true);
      setHeaderError(null);
      setSuccessMessage(null);

      if (promotionCandidates.length === 0) {
        setHeaderError("No eligible passed students are ready for promotion.");
        return;
      }

      const createdHistories: PromotionHistoryRow[] = [];
      const updatedStudentIds: string[] = [];

      for (const item of promotionCandidates) {
        const student = item.row.students;
        const nextBelt = item.nextBelt;

        if (!student || !nextBelt) continue;

        const existingRes = await supabase
          .from("promotion_histories")
          .select("id, student_id")
          .eq("testing_event_id", eventId)
          .eq("student_id", item.row.student_id)
          .limit(1);

        if (existingRes.error) throw existingRes.error;
        if ((existingRes.data ?? []).length > 0) {
          continue;
        }

        const historyPayload = {
          student_id: item.row.student_id,
          testing_event_id: eventId,
          from_belt_id: student.current_belt_id ?? null,
          to_belt_id: nextBelt.id,
          promoted_at: event.testing_date ?? new Date().toISOString(),
        };

        const historyRes = await supabase
          .from("promotion_histories")
          .insert(historyPayload)
          .select("id, student_id, testing_event_id, from_belt_id, to_belt_id, promoted_at")
          .single();

        if (historyRes.error) throw historyRes.error;

        const studentUpdateRes = await supabase
          .from("students")
          .update({ current_belt_id: nextBelt.id })
          .eq("id", item.row.student_id);

        if (studentUpdateRes.error) throw studentUpdateRes.error;

        createdHistories.push(historyRes.data as unknown as PromotionHistoryRow);
        updatedStudentIds.push(item.row.student_id);
      }

      const completedRes = await supabase
        .from("testing_events")
        .update({ status: "completed" })
        .eq("id", eventId)
        .select("id, status")
        .single();

      if (completedRes.error) throw completedRes.error;

      setEvent((prev) => (prev ? { ...prev, status: "completed" } : prev));
      setPromotionHistories((prev) => [...prev, ...createdHistories]);

      setParticipants((prev) =>
        prev.map((row) => {
          const matched = promotionCandidates.find((item) => item.row.id === row.id);
          if (!matched) return row;
          if (!updatedStudentIds.includes(row.student_id)) return row;
          if (!matched.nextBelt || !row.students) return row;

          return {
            ...row,
            students: {
              ...row.students,
              current_belt_id: matched.nextBelt.id,
              belts: {
                id: matched.nextBelt.id,
                name: matched.nextBelt.name,
              },
            },
          };
        })
      );

      setSuccessMessage(
        `${updatedStudentIds.length} student${updatedStudentIds.length === 1 ? "" : "s"} promoted successfully.`
      );
    } catch (err: any) {
      setHeaderError(err?.message ?? "Failed to confirm promotions.");
    } finally {
      setConfirmingPromotions(false);
    }
  }

  if (loading) {
    return (
      <AppShell
        title="Testing Event Detail"
        description="Manage participants, invoices, and results."
      >
        <LoadingBlock message="Loading testing event..." />
      </AppShell>
    );
  }

  if (headerError && !event) {
    return (
      <AppShell
        title="Testing Event Detail"
        description="Manage participants, invoices, and results."
      >
        <ErrorBlock message={headerError} />
      </AppShell>
    );
  }

  if (!event) {
    return (
      <AppShell
        title="Testing Event Detail"
        description="Manage participants, invoices, and results."
      >
        <EmptyState
          title="Testing event not found"
          description="The requested event could not be loaded."
        />
      </AppShell>
    );
  }

  const breadcrumbStyle: CSSProperties = {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 12,
  };
  const breadcrumbLinkStyle: CSSProperties = {
    color: "#38bdf8",
    textDecoration: "none",
    fontWeight: 600,
  };

  return (
    <AppShell
      title={event.title}
      description="Add participants, generate testing fee invoices, enter results, and confirm promotion."
    >
      <div style={breadcrumbStyle}>
        <Link href="/promotions/events" style={breadcrumbLinkStyle}>
          ← Testing Events
        </Link>
      </div>
      <div style={{ display: "grid", gap: 16 }}>
        {headerError ? <ErrorBlock message={headerError} /> : null}
        {successMessage ? <SuccessBlock message={successMessage} /> : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <SummaryCard label="Participants" value={String(summary.total)} />
          <SummaryCard label="Pending" value={String(summary.pending)} />
          <SummaryCard label="Passed" value={String(summary.passed)} />
          <SummaryCard label="Failed" value={String(summary.failed)} />
        </div>

        <PageCard title="Event Overview">
          <div style={overviewGridStyle}>
            <InfoBox
              label="Testing Date"
              value={event.testing_date ? formatDate(event.testing_date) : "No date"}
            />
            <InfoBox label="Location" value={event.location || "No location"} />
            <InfoBox label="Status" value={event.status || "scheduled"} />
            <InfoBox label="Testing Fee" value={formatMoney(event.testing_fee ?? 0)} />
            <InfoBox label="Created" value={formatDateTime(event.created_at)} />
          </div>

          {event.notes ? (
            <div style={noteBoxStyle}>
              <div style={noteTitleStyle}>Notes</div>
              <div style={noteTextStyle}>{event.notes}</div>
            </div>
          ) : null}

          <div style={topActionRowStyle}>
            <Link href="/promotions/events" style={secondaryButtonStyle}>
              Back to Events
            </Link>
            <Link href="/promotions/history" style={secondaryButtonStyle}>
              Promotion History
            </Link>
            <Link href="/finance/invoices" style={secondaryButtonStyle}>
              Finance Invoices
            </Link>
          </div>
        </PageCard>

        <PageCard
          title="Testing Fee Invoices"
          subtitle="Generate one invoice per participant. Duplicate invoices are skipped automatically."
        >
          <div style={{ display: "grid", gap: 14 }}>
            <div style={confirmSummaryGridStyle}>
              <MiniInfoBox
                label="Existing Invoices"
                value={String(invoiceSummary.totalInvoices)}
              />
              <MiniInfoBox
                label="Invoice Candidates"
                value={String(invoiceCandidates.length)}
              />
              <MiniInfoBox
                label="Unpaid"
                value={String(invoiceSummary.unpaid)}
              />
              <MiniInfoBox
                label="Total Amount"
                value={formatMoney(invoiceSummary.totalAmount)}
              />
            </div>

            {invoices.length === 0 ? (
              <EmptyState
                title="No testing fee invoices yet"
                description="Generate invoices after adding participants."
              />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {invoices.slice(0, 8).map((row) => (
                  <div key={row.id} style={candidateRowStyle}>
                    <div>
                      <div style={studentNameStyle}>
                        Invoice #{row.id.slice(0, 8)}
                      </div>
                      <div style={studentMetaStyle}>
                        {formatMoney(row.final_amount ?? 0)} · {row.payment_status || "unpaid"}
                      </div>
                    </div>

                    <div style={candidateStatusStyle}>
                      {row.payment_status === "paid" ? "PAID" : "UNPAID"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={confirmButtonRowStyle}>
              <button
                type="button"
                disabled={generatingInvoices || invoiceCandidates.length === 0}
                onClick={handleGenerateTestingFeeInvoices}
                style={primaryButtonStyle}
              >
                {generatingInvoices ? "Generating..." : "Generate Testing Fee Invoices"}
              </button>
            </div>
          </div>
        </PageCard>

        <PageCard
          title="Promotion Confirmation"
          subtitle="Only passed students with a valid next belt and no duplicate promotion history will be processed."
        >
          <div style={{ display: "grid", gap: 14 }}>
            <div style={confirmSummaryGridStyle}>
              <MiniInfoBox
                label="Eligible Candidates"
                value={String(promotionCandidates.length)}
              />
              <MiniInfoBox
                label="Already Promoted in This Event"
                value={String(promotedStudentIds.size)}
              />
              <MiniInfoBox
                label="Event Status"
                value={event.status || "scheduled"}
              />
            </div>

            {promotionCandidates.length === 0 ? (
              <EmptyState
                title="No promotion candidates yet"
                description="Set some students to pass first. Students also need a next belt available."
              />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {promotionCandidates.map((item) => (
                  <div key={item.row.id} style={candidateRowStyle}>
                    <div>
                      <div style={studentNameStyle}>
                        {item.row.students?.name || "Unknown Student"}
                      </div>
                      <div style={studentMetaStyle}>
                        {item.row.students?.belts?.name || "No belt"} → {item.nextBelt?.name || "No next belt"}
                      </div>
                    </div>

                    <div style={candidateStatusStyle}>READY</div>
                  </div>
                ))}
              </div>
            )}

            <div style={confirmButtonRowStyle}>
              <button
                type="button"
                disabled={confirmingPromotions || promotionCandidates.length === 0}
                onClick={handleConfirmPromotions}
                style={primaryButtonStyle}
              >
                {confirmingPromotions ? "Confirming..." : "Confirm Promotions"}
              </button>
            </div>
          </div>
        </PageCard>

        <PageCard
          title="Add Student"
          subtitle="Search active students and attach them to this testing event."
        >
          <div style={{ display: "grid", gap: 14 }}>
            <input
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search student name"
              style={inputStyle}
            />

            {searchingStudents ? (
              <div style={helperTextStyle}>Searching students...</div>
            ) : filteredStudentResults.length === 0 ? (
              <div style={helperTextStyle}>
                {studentSearch.trim()
                  ? "No available students found."
                  : "Start typing a student name."}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {filteredStudentResults.map((student) => (
                  <div key={student.id} style={searchResultRowStyle}>
                    <div>
                      <div style={studentNameStyle}>{student.name}</div>
                      <div style={studentMetaStyle}>
                        {student.classes?.name || "No class"} · {student.belts?.name || "No belt"} ·{" "}
                        {student.status || "unknown"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddStudent(student)}
                      disabled={addingStudent}
                      style={primaryButtonStyle}
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PageCard>

        <PageCard
          title="Participant Results"
          subtitle="Update pass, fail, or pending status for each student."
        >
          {participants.length === 0 ? (
            <EmptyState
              title="No participants yet"
              description="Add students first, then result management will appear here."
            />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {participants.map((row) => {
                const currentBeltId = row.students?.belts?.id ?? null;
                const nextBelt = getNextBelt(currentBeltId);
                const alreadyPromoted = promotedStudentIds.has(row.student_id);
                const hasInvoice = invoicedEventStudentIds.has(row.id);

                return (
                  <div key={row.id} style={participantCardStyle}>
                    <div style={participantTopStyle}>
                      <div>
                        <div style={studentNameStyle}>
                          {row.students?.name || "Unknown Student"}
                        </div>
                        <div style={studentMetaStyle}>
                          {row.students?.classes?.name || "No class"} · {row.students?.status || "unknown"}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={miniLabelStyle}>Current Result</div>
                        <div style={getResultBadgeStyle(row.result_status || "pending")}>
                          {row.result_status || "pending"}
                        </div>
                      </div>
                    </div>

                    <div style={beltGridStyle}>
                      <MiniInfoBox
                        label="Current Belt"
                        value={row.students?.belts?.name || "No belt"}
                      />
                      <MiniInfoBox
                        label="Next Belt Preview"
                        value={nextBelt?.name || "No next belt"}
                      />
                      <MiniInfoBox
                        label="Promotion State"
                        value={alreadyPromoted ? "Confirmed" : "Not confirmed"}
                      />
                      <MiniInfoBox
                        label="Invoice State"
                        value={hasInvoice ? "Created" : "Not created"}
                      />
                      <MiniInfoBox
                        label="Added At"
                        value={formatDateTime(row.created_at)}
                      />
                    </div>

                    <div style={participantActionRowStyle}>
                      <button
                        type="button"
                        disabled={savingRowId === row.id}
                        onClick={() => handleUpdateResult(row.id, "pending")}
                        style={getActionButtonStyle(row.result_status === "pending")}
                      >
                        Pending
                      </button>

                      <button
                        type="button"
                        disabled={savingRowId === row.id}
                        onClick={() => handleUpdateResult(row.id, "pass")}
                        style={getActionButtonStyle(row.result_status === "pass")}
                      >
                        Pass
                      </button>

                      <button
                        type="button"
                        disabled={savingRowId === row.id}
                        onClick={() => handleUpdateResult(row.id, "fail")}
                        style={getActionButtonStyle(row.result_status === "fail")}
                      >
                        Fail
                      </button>

                      <button
                        type="button"
                        disabled={savingRowId === row.id}
                        onClick={() => handleRemoveStudent(row.id)}
                        style={dangerButtonStyle}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PageCard>
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 18,
        background: "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(15,23,42,0.78))",
        border: "1px solid rgba(148,163,184,0.18)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 30,
          fontWeight: 900,
          color: "#f8fafc",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SuccessBlock({ message }: { message: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(34,197,94,0.25)",
        background: "rgba(20,83,45,0.25)",
        color: "#bbf7d0",
        borderRadius: 12,
        padding: 14,
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      {message}
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={infoBoxStyle}>
      <div style={miniLabelStyle}>{label}</div>
      <div style={infoValueStyle}>{value}</div>
    </div>
  );
}

function MiniInfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={miniInfoBoxStyle}>
      <div style={miniLabelStyle}>{label}</div>
      <div style={miniValueStyle}>{value}</div>
    </div>
  );
}

function getResultBadgeStyle(status: string): CSSProperties {
  if (status === "pass") {
    return {
      fontSize: 14,
      fontWeight: 700,
      color: "#22c55e",
      marginTop: 4,
    };
  }

  if (status === "fail") {
    return {
      fontSize: 14,
      fontWeight: 700,
      color: "#ef4444",
      marginTop: 4,
    };
  }

  return {
    fontSize: 14,
    fontWeight: 700,
    color: "#f59e0b",
    marginTop: 4,
  };
}

function getActionButtonStyle(active: boolean): CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    border: active
      ? "1px solid rgba(59,130,246,0.45)"
      : "1px solid rgba(148,163,184,0.2)",
    background: active ? "rgba(29,78,216,0.18)" : "#0f172a",
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  };
}

const overviewGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

const infoBoxStyle: CSSProperties = {
  border: "1px solid rgba(148,163,184,0.16)",
  borderRadius: 12,
  padding: 14,
  background: "rgba(15,23,42,0.38)",
};

const miniInfoBoxStyle: CSSProperties = {
  border: "1px solid rgba(148,163,184,0.14)",
  borderRadius: 10,
  padding: 12,
  background: "rgba(2,6,23,0.35)",
};

const miniLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const infoValueStyle: CSSProperties = {
  marginTop: 8,
  fontSize: 15,
  fontWeight: 700,
  color: "#f8fafc",
};

const miniValueStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 14,
  fontWeight: 700,
  color: "#f8fafc",
};

const noteBoxStyle: CSSProperties = {
  marginTop: 14,
  border: "1px solid rgba(148,163,184,0.14)",
  borderRadius: 12,
  padding: 14,
  background: "rgba(2,6,23,0.3)",
};

const noteTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#cbd5e1",
  marginBottom: 6,
};

const noteTextStyle: CSSProperties = {
  fontSize: 13,
  color: "#cbd5e1",
  lineHeight: 1.6,
};

const topActionRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 14,
};

const secondaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: 10,
  textDecoration: "none",
  border: "1px solid rgba(148,163,184,0.22)",
  background: "#0f172a",
  color: "#f8fafc",
  fontSize: 13,
  fontWeight: 700,
};

const primaryButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(59,130,246,0.3)",
  background: "#1d4ed8",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(239,68,68,0.3)",
  background: "rgba(127,29,29,0.3)",
  color: "#fecaca",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.22)",
  background: "#0f172a",
  color: "#f8fafc",
  outline: "none",
  fontSize: 14,
};

const helperTextStyle: CSSProperties = {
  fontSize: 13,
  color: "#94a3b8",
};

const searchResultRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  border: "1px solid rgba(148,163,184,0.14)",
  borderRadius: 12,
  padding: 12,
  background: "rgba(15,23,42,0.35)",
};

const studentNameStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  color: "#f8fafc",
};

const studentMetaStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  color: "#94a3b8",
};

const participantCardStyle: CSSProperties = {
  border: "1px solid rgba(148,163,184,0.16)",
  borderRadius: 14,
  padding: 16,
  background: "rgba(15,23,42,0.4)",
};

const participantTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const beltGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 10,
  marginTop: 14,
};

const participantActionRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 14,
};

const confirmSummaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 10,
};

const candidateRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  border: "1px solid rgba(148,163,184,0.14)",
  borderRadius: 12,
  padding: 12,
  background: "rgba(15,23,42,0.35)",
};

const candidateStatusStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#22c55e",
  letterSpacing: "0.08em",
};

const confirmButtonRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  marginTop: 6,
};