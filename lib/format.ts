export function formatMoney(value: number | string | null | undefined) {
  const amount = toNumber(value);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return value;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return value;
}

export function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}