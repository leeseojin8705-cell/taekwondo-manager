"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../../components/ui/AppShell";
import PageCard from "../../../components/ui/PageCard";
import LoadingBlock from "../../../components/ui/LoadingBlock";
import ErrorBlock from "../../../components/ui/ErrorBlock";
import { supabase } from "../../../lib/supabase";

type CheckinSettingsRow = {
  id: string;
  allow_expired_membership_checkin: boolean;
  allow_over_weekly_limit_checkin: boolean;
  auto_release_hold_on_checkin: boolean;
  prevent_duplicate_same_day_checkin: boolean;
  search_minimum_characters: number;
  click_cooldown_seconds: number;
  kiosk_auto_return_seconds: number;
  created_at?: string;
  updated_at?: string;
};

const DEFAULT_SETTINGS = {
  allow_expired_membership_checkin: true,
  allow_over_weekly_limit_checkin: true,
  auto_release_hold_on_checkin: true,
  prevent_duplicate_same_day_checkin: true,
  search_minimum_characters: 2,
  click_cooldown_seconds: 5,
  kiosk_auto_return_seconds: 3,
};

export default function CheckinSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rowId, setRowId] = useState<string | null>(null);

  const [form, setForm] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("checkin_settings")
        .select(`
          id,
          allow_expired_membership_checkin,
          allow_over_weekly_limit_checkin,
          auto_release_hold_on_checkin,
          prevent_duplicate_same_day_checkin,
          search_minimum_characters,
          click_cooldown_seconds,
          kiosk_auto_return_seconds,
          created_at,
          updated_at
        `)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setRowId(null);
        setForm(DEFAULT_SETTINGS);
        return;
      }

      const row = data as unknown as CheckinSettingsRow;

      setRowId(row.id);
      setForm({
        allow_expired_membership_checkin: row.allow_expired_membership_checkin,
        allow_over_weekly_limit_checkin: row.allow_over_weekly_limit_checkin,
        auto_release_hold_on_checkin: row.auto_release_hold_on_checkin,
        prevent_duplicate_same_day_checkin: row.prevent_duplicate_same_day_checkin,
        search_minimum_characters: row.search_minimum_characters,
        click_cooldown_seconds: row.click_cooldown_seconds,
        kiosk_auto_return_seconds: row.kiosk_auto_return_seconds,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load check-in settings.");
    } finally {
      setLoading(false);
    }
  }

  function updateField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (form.search_minimum_characters < 1) {
        setError("Search minimum characters must be at least 1.");
        return;
      }

      if (form.click_cooldown_seconds < 0) {
        setError("Click cooldown seconds cannot be negative.");
        return;
      }

      if (form.kiosk_auto_return_seconds < 1) {
        setError("Kiosk auto return seconds must be at least 1.");
        return;
      }

      const payload = {
        allow_expired_membership_checkin:
          form.allow_expired_membership_checkin,
        allow_over_weekly_limit_checkin:
          form.allow_over_weekly_limit_checkin,
        auto_release_hold_on_checkin:
          form.auto_release_hold_on_checkin,
        prevent_duplicate_same_day_checkin:
          form.prevent_duplicate_same_day_checkin,
        search_minimum_characters:
          Number(form.search_minimum_characters) || 2,
        click_cooldown_seconds:
          Number(form.click_cooldown_seconds) || 0,
        kiosk_auto_return_seconds:
          Number(form.kiosk_auto_return_seconds) || 3,
      };

      if (rowId) {
        const { error } = await supabase
          .from("checkin_settings")
          .update(payload)
          .eq("id", rowId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("checkin_settings")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;
        setRowId(data.id);
      }

      setSuccess("Check-in settings saved successfully.");
    } catch (err: any) {
      setError(err?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  function applyRecommendedDefaults() {
    setForm(DEFAULT_SETTINGS);
    setSuccess(null);
    setError(null);
  }

  if (loading) {
    return (
      <AppShell
        title="Check-in Settings"
        description="Configure kiosk and attendance rules"
      >
        <LoadingBlock message="Loading check-in settings..." />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Check-in Settings"
      description="Configure kiosk search, duplicate prevention, warning policy, and auto release behavior"
    >
      <div style={{ display: "grid", gap: 20 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Link href="/checkin" style={buttonGhostStyle}>
            Back to Check-in Home
          </Link>
          <Link href="/checkin/kiosk" style={buttonGhostStyle}>
            Open Kiosk
          </Link>
          <button
            type="button"
            onClick={applyRecommendedDefaults}
            style={buttonGhostButtonStyle}
          >
            Apply Recommended Defaults
          </button>
        </div>

        {error ? <ErrorBlock title="Settings Error" message={error} /> : null}

        {success ? (
          <div style={successBoxStyle}>{success}</div>
        ) : null}

        <PageCard title="Attendance Policy">
          <div style={gridStyle}>
            <ToggleField
              label="Allow Expired Membership Check-in"
              description="만료 학생도 출석은 허용하고 warning만 남긴다."
              checked={form.allow_expired_membership_checkin}
              onChange={(value) =>
                updateField("allow_expired_membership_checkin", value)
              }
            />

            <ToggleField
              label="Allow Over Weekly Limit Check-in"
              description="주 참여 횟수를 초과해도 출석은 허용하고 warning을 남긴다."
              checked={form.allow_over_weekly_limit_checkin}
              onChange={(value) =>
                updateField("allow_over_weekly_limit_checkin", value)
              }
            />

            <ToggleField
              label="Auto Release Hold on Check-in"
              description="hold 상태 학생이 체크인하면 자동 해제 처리한다."
              checked={form.auto_release_hold_on_checkin}
              onChange={(value) =>
                updateField("auto_release_hold_on_checkin", value)
              }
            />

            <ToggleField
              label="Prevent Duplicate Same-day Check-in"
              description="같은 날 중복 체크인을 막는다."
              checked={form.prevent_duplicate_same_day_checkin}
              onChange={(value) =>
                updateField("prevent_duplicate_same_day_checkin", value)
              }
            />
          </div>
        </PageCard>

        <PageCard title="Kiosk Behavior">
          <div style={gridStyle}>
            <NumberField
              label="Search Minimum Characters"
              description="검색 최소 글자 수. 추천값 2"
              value={form.search_minimum_characters}
              onChange={(value) =>
                updateField("search_minimum_characters", value)
              }
            />

            <NumberField
              label="Click Cooldown Seconds"
              description="같은 학생 사진 연속 클릭 방지 시간. 추천값 5"
              value={form.click_cooldown_seconds}
              onChange={(value) =>
                updateField("click_cooldown_seconds", value)
              }
            />

            <NumberField
              label="Kiosk Auto Return Seconds"
              description="체크인 성공 후 자동 복귀 시간. 추천값 3"
              value={form.kiosk_auto_return_seconds}
              onChange={(value) =>
                updateField("kiosk_auto_return_seconds", value)
              }
            />
          </div>
        </PageCard>

        <PageCard title="Current Recommended Rules">
          <div style={{ display: "grid", gap: 12 }}>
            <RuleRow
              title="Expired Membership"
              value={
                form.allow_expired_membership_checkin
                  ? "Allowed with warning"
                  : "Blocked"
              }
            />
            <RuleRow
              title="Over Weekly Limit"
              value={
                form.allow_over_weekly_limit_checkin
                  ? "Allowed with warning"
                  : "Blocked"
              }
            />
            <RuleRow
              title="Hold Auto Release"
              value={
                form.auto_release_hold_on_checkin
                  ? "Enabled"
                  : "Disabled"
              }
            />
            <RuleRow
              title="Duplicate Same-day Check-in"
              value={
                form.prevent_duplicate_same_day_checkin
                  ? "Prevented"
                  : "Allowed"
              }
            />
            <RuleRow
              title="Search Minimum"
              value={`${form.search_minimum_characters} characters`}
            />
            <RuleRow
              title="Click Cooldown"
              value={`${form.click_cooldown_seconds} seconds`}
            />
            <RuleRow
              title="Auto Return"
              value={`${form.kiosk_auto_return_seconds} seconds`}
            />
          </div>
        </PageCard>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={buttonPrimaryStyle}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div style={fieldCardStyle}>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={fieldLabelStyle}>{label}</div>
        <div style={fieldDescStyle}>{description}</div>
      </div>

      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          color: "#f8fafc",
          fontWeight: 700,
          marginTop: 12,
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        {checked ? "On" : "Off"}
      </label>
    </div>
  );
}

function NumberField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div style={fieldCardStyle}>
      <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
        <div style={fieldLabelStyle}>{label}</div>
        <div style={fieldDescStyle}>{description}</div>
      </div>

      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={inputStyle}
      />
    </div>
  );
}

function RuleRow({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #334155",
        background: "#0f172a",
        borderRadius: 12,
        padding: 14,
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          color: "#cbd5e1",
          fontWeight: 700,
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: "#f8fafc",
          fontWeight: 800,
        }}
      >
        {value}
      </div>
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
};

const fieldCardStyle: React.CSSProperties = {
  border: "1px solid #334155",
  background: "#0f172a",
  borderRadius: 14,
  padding: 16,
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  color: "#f8fafc",
};

const fieldDescStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.6,
  color: "#94a3b8",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #334155",
  background: "#020617",
  color: "#f8fafc",
  borderRadius: 10,
  padding: "12px 14px",
  outline: "none",
};

const buttonPrimaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "#22c55e",
  color: "#052e16",
  borderRadius: 10,
  padding: "12px 18px",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
};

const buttonGhostStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#e2e8f0",
  borderRadius: 10,
  padding: "12px 18px",
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
};

const buttonGhostButtonStyle: React.CSSProperties = {
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#e2e8f0",
  borderRadius: 10,
  padding: "12px 18px",
  fontWeight: 700,
  cursor: "pointer",
};

const successBoxStyle: React.CSSProperties = {
  border: "1px solid #166534",
  background: "rgba(34,197,94,0.12)",
  color: "#dcfce7",
  borderRadius: 14,
  padding: 16,
  fontWeight: 700,
};