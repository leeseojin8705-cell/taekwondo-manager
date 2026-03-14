"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "../../components/ui/AppShell";
import PageCard from "../../components/ui/PageCard";
import { supabase } from "../../lib/supabase";

type BusinessSettingsRow = {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  currency_code: string;
  currency_symbol: string;
  tax_rate: number | null;
  default_payment_day: number | null;
  late_fee_amount: number | null;
  invoice_note: string | null;
  receipt_note: string | null;
  logo_url: string | null;
  active: boolean | null;
  created_at: string;
  updated_at: string;
};

type FormState = {
  business_name: string;
  owner_name: string;
  phone: string;
  email: string;
  website: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  currency_code: string;
  currency_symbol: string;
  tax_rate: string;
  default_payment_day: string;
  late_fee_amount: string;
  invoice_note: string;
  receipt_note: string;
  logo_url: string;
  active: boolean;
};

const emptyForm: FormState = {
  business_name: "",
  owner_name: "",
  phone: "",
  email: "",
  website: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "USA",
  currency_code: "USD",
  currency_symbol: "$",
  tax_rate: "0",
  default_payment_day: "1",
  late_fee_amount: "0",
  invoice_note: "",
  receipt_note: "",
  logo_url: "",
  active: true,
};

export default function BusinessSettingsPage() {
  const [rowId, setRowId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  async function fetchBusinessSettings() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("business_settings")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (!data) {
      setForm(emptyForm);
      setRowId(null);
      setLoading(false);
      return;
    }

    const row = data as BusinessSettingsRow;

    setRowId(row.id);
    setForm({
      business_name: row.business_name ?? "",
      owner_name: row.owner_name ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      website: row.website ?? "",
      address_line_1: row.address_line_1 ?? "",
      address_line_2: row.address_line_2 ?? "",
      city: row.city ?? "",
      state: row.state ?? "",
      postal_code: row.postal_code ?? "",
      country: row.country ?? "USA",
      currency_code: row.currency_code ?? "USD",
      currency_symbol: row.currency_symbol ?? "$",
      tax_rate: String(row.tax_rate ?? 0),
      default_payment_day: String(row.default_payment_day ?? 1),
      late_fee_amount: String(row.late_fee_amount ?? 0),
      invoice_note: row.invoice_note ?? "",
      receipt_note: row.receipt_note ?? "",
      logo_url: row.logo_url ?? "",
      active: row.active ?? true,
    });
    setLastUpdated(row.updated_at);
    setLoading(false);
  }

  useEffect(() => {
    fetchBusinessSettings();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!form.business_name.trim()) {
      setError("Business name is required.");
      return;
    }

    const taxRate = Number(form.tax_rate || 0);
    const defaultPaymentDay = Number(form.default_payment_day || 1);
    const lateFeeAmount = Number(form.late_fee_amount || 0);

    if (Number.isNaN(taxRate)) {
      setError("Tax rate must be a valid number.");
      return;
    }

    if (Number.isNaN(defaultPaymentDay)) {
      setError("Default payment day must be a valid number.");
      return;
    }

    if (defaultPaymentDay < 1 || defaultPaymentDay > 31) {
      setError("Default payment day must be between 1 and 31.");
      return;
    }

    if (Number.isNaN(lateFeeAmount)) {
      setError("Late fee amount must be a valid number.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      business_name: form.business_name.trim(),
      owner_name: form.owner_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      address_line_1: form.address_line_1.trim() || null,
      address_line_2: form.address_line_2.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      postal_code: form.postal_code.trim() || null,
      country: form.country.trim() || "USA",
      currency_code: form.currency_code.trim() || "USD",
      currency_symbol: form.currency_symbol.trim() || "$",
      tax_rate: taxRate,
      default_payment_day: defaultPaymentDay,
      late_fee_amount: lateFeeAmount,
      invoice_note: form.invoice_note.trim() || null,
      receipt_note: form.receipt_note.trim() || null,
      logo_url: form.logo_url.trim() || null,
      active: form.active,
    };

    if (rowId) {
      const { error } = await supabase
        .from("business_settings")
        .update(payload)
        .eq("id", rowId);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("business_settings")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }

      setRowId(data.id);
    }

    await fetchBusinessSettings();
    setSaving(false);
  }

  return (
    <AppShell
      title="Business Settings"
      description="Base business information used by invoices, receipts, finance, and reports"
    >
      <div style={{ display: "grid", gap: 16 }}>
        <PageCard title="Business Information">
          <div style={{ display: "grid", gap: 16 }}>
            <p style={sectionDescription}>
              This is the core business profile for the whole system.
            </p>

            {error ? <div style={errorBoxStyle}>{error}</div> : null}

            {loading ? (
              <div style={infoBoxStyle}>Loading business settings...</div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 12,
                  }}
                >
                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>Business Name</span>
                    <input
                      value={form.business_name}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          business_name: e.target.value,
                        }))
                      }
                      style={inputStyle}
                      placeholder="Taekwondo School"
                    />
                  </label>

                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>Owner Name</span>
                    <input
                      value={form.owner_name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, owner_name: e.target.value }))
                      }
                      style={inputStyle}
                      placeholder="Owner name"
                    />
                  </label>

                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>Phone</span>
                    <input
                      value={form.phone}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      style={inputStyle}
                      placeholder="Phone number"
                    />
                  </label>

                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>Email</span>
                    <input
                      value={form.email}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      style={inputStyle}
                      placeholder="Email"
                    />
                  </label>

                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>Website</span>
                    <input
                      value={form.website}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, website: e.target.value }))
                      }
                      style={inputStyle}
                      placeholder="Website"
                    />
                  </label>

                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>Logo URL</span>
                    <input
                      value={form.logo_url}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, logo_url: e.target.value }))
                      }
                      style={inputStyle}
                      placeholder="https://..."
                    />
                  </label>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 12,
                  }}
                >
                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>Address Line 1</span>
                    <input
                      value={form.address_line_1}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          address_line_1: e.target.value,
                        }))
                      }
                      style={inputStyle}
                      placeholder="Street address"
                    />
                  </label>

                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>Address Line 2</span>
                    <input
                      value={form.address_line_2}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          address_line_2: e.target.value,
                        }))
                      }
                      style={inputStyle}
                      placeholder="Suite / unit"
                    />
                  </label>

                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>City</span>
                    <input
                      value={form.city}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, city: e.target.value }))
                      }
                      style={inputStyle}
                      placeholder="City"
                    />
                  </label>

                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>State</span>
                    <input
                      value={form.state}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, state: e.target.value }))
                      }
                      style={inputStyle}
                      placeholder="State"
                    />
                  </label>

                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>Postal Code</span>
                    <input
                      value={form.postal_code}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          postal_code: e.target.value,
                        }))
                      }
                      style={inputStyle}
                      placeholder="Postal code"
                    />
                  </label>

                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>Country</span>
                    <input
                      value={form.country}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, country: e.target.value }))
                      }
                      style={inputStyle}
                      placeholder="USA"
                    />
                  </label>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>Currency Code</span>
                    <input
                      value={form.currency_code}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          currency_code: e.target.value,
                        }))
                      }
                      style={inputStyle}
                      placeholder="USD"
                    />
                  </label>

                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>Currency Symbol</span>
                    <input
                      value={form.currency_symbol}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          currency_symbol: e.target.value,
                        }))
                      }
                      style={inputStyle}
                      placeholder="$"
                    />
                  </label>

                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>Tax Rate (%)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={form.tax_rate}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, tax_rate: e.target.value }))
                      }
                      style={inputStyle}
                      placeholder="0"
                    />
                  </label>

                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>Default Payment Day</span>
                    <input
                      type="number"
                      value={form.default_payment_day}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          default_payment_day: e.target.value,
                        }))
                      }
                      style={inputStyle}
                      placeholder="1"
                    />
                  </label>

                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>Late Fee Amount</span>
                    <input
                      type="number"
                      step="0.01"
                      value={form.late_fee_amount}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          late_fee_amount: e.target.value,
                        }))
                      }
                      style={inputStyle}
                      placeholder="0"
                    />
                  </label>
                </div>

                <label style={fieldWrapStyle}>
                  <span style={labelStyle}>Invoice Note</span>
                  <textarea
                    value={form.invoice_note}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        invoice_note: e.target.value,
                      }))
                    }
                    rows={3}
                    style={textareaStyle}
                    placeholder="Message shown on invoices"
                  />
                </label>

                <label style={fieldWrapStyle}>
                  <span style={labelStyle}>Receipt Note</span>
                  <textarea
                    value={form.receipt_note}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        receipt_note: e.target.value,
                      }))
                    }
                    rows={3}
                    style={textareaStyle}
                    placeholder="Message shown on receipts"
                  />
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#e2e8f0",
                    fontWeight: 700,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, active: e.target.checked }))
                    }
                  />
                  Active
                </label>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="submit" disabled={saving} style={primaryButtonStyle}>
                    {saving ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </PageCard>

        <PageCard title="Current Status">
          <div style={{ display: "grid", gap: 12 }}>
            <div style={infoBoxStyle}>
              Business settings are system-wide master data.
            </div>

            <div style={statusGridStyle}>
              <div style={statusCardStyle}>
                <div style={statusLabelStyle}>Business Name</div>
                <div style={statusValueStyle}>
                  {form.business_name || "-"}
                </div>
              </div>

              <div style={statusCardStyle}>
                <div style={statusLabelStyle}>Currency</div>
                <div style={statusValueStyle}>
                  {form.currency_code || "-"} / {form.currency_symbol || "-"}
                </div>
              </div>

              <div style={statusCardStyle}>
                <div style={statusLabelStyle}>Default Payment Day</div>
                <div style={statusValueStyle}>
                  {form.default_payment_day || "-"}
                </div>
              </div>

              <div style={statusCardStyle}>
                <div style={statusLabelStyle}>Last Updated</div>
                <div style={statusValueStyle}>
                  {lastUpdated ? new Date(lastUpdated).toLocaleString() : "-"}
                </div>
              </div>
            </div>
          </div>
        </PageCard>
      </div>
    </AppShell>
  );
}

const fieldWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const sectionDescription: React.CSSProperties = {
  margin: 0,
  color: "#94a3b8",
  fontSize: 14,
  lineHeight: 1.6,
};

const labelStyle: React.CSSProperties = {
  fontWeight: 700,
  color: "#e2e8f0",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0f172a",
  color: "#f8fafc",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: "12px 14px",
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  background: "#0f172a",
  color: "#f8fafc",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: "12px 14px",
  outline: "none",
  resize: "vertical",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: 12,
  padding: "12px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

const errorBoxStyle: React.CSSProperties = {
  background: "#7f1d1d",
  color: "#fee2e2",
  border: "1px solid #991b1b",
  borderRadius: 12,
  padding: "12px 14px",
  fontWeight: 700,
};

const infoBoxStyle: React.CSSProperties = {
  background: "#0f172a",
  color: "#cbd5e1",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: "14px 16px",
  fontWeight: 600,
};

const statusGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const statusCardStyle: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 14,
  padding: 16,
  display: "grid",
  gap: 8,
};

const statusLabelStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  fontWeight: 700,
};

const statusValueStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: 18,
  fontWeight: 800,
};