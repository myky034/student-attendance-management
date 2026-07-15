export const APP_TIMEZONE = "Asia/Ho_Chi_Minh";

function getVietnamParts(
  date: Date,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    ...options,
  }).formatToParts(date);
}

function partValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((part) => part.type === type)?.value ?? "00";
}

/** YYYY-MM-DD theo giờ Việt Nam */
export function getVietnamDateString(date = new Date()): string {
  const parts = getVietnamParts(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `${partValue(parts, "year")}-${partValue(parts, "month")}-${partValue(parts, "day")}`;
}

/** YYYY-MM-DDTHH:mm:ss theo giờ Việt Nam (không có suffix Z) */
export function getVietnamTimestampString(date = new Date()): string {
  const parts = getVietnamParts(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const hour = partValue(parts, "hour").padStart(2, "0");
  return `${partValue(parts, "year")}-${partValue(parts, "month")}-${partValue(parts, "day")}T${hour}:${partValue(parts, "minute").padStart(2, "0")}:${partValue(parts, "second").padStart(2, "0")}`;
}

const HAS_TIMEZONE_SUFFIX = /(?:[Zz]|[+-]\d{2}(?::?\d{2})?)$/;

/**
 * Parse timestamp UTC từ Postgres/Supabase (TIMESTAMP WITHOUT TIME ZONE).
 * Chuỗi ISO không có suffix Z/offset được hiểu là UTC, không phải local browser.
 */
export function parseUtcTimestamp(value: string): Date {
  if (!value) return new Date(Number.NaN);

  let normalized = value.trim().replace(" ", "T");
  if (!HAS_TIMEZONE_SUFFIX.test(normalized)) {
    normalized = `${normalized}Z`;
  }

  return new Date(normalized);
}

/** Hiển thị ngày giờ đầy đủ theo múi giờ Việt Nam */
export function formatVietnamDateTime(value?: string | null): string {
  if (!value) return "—";

  const date = parseUtcTimestamp(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

/** Hiển thị HH:mm:ss từ giá trị đã lưu */
export function formatVietnamTime(value: string): string {
  if (!value || value === "-") return value;

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) && !value.endsWith("Z")) {
    return value.split("T")[1]!.slice(0, 8);
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

/** Chuẩn hóa trước khi ghi Postgres timestamp (without time zone) */
export function toVietnamTimestamp(value: string, date?: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  if (value.includes("T")) {
    return getVietnamTimestampString(new Date(value));
  }

  const datePart = date ? date.split("T")[0] : getVietnamDateString();
  return `${datePart}T${value}`;
}
