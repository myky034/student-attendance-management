const SENSITIVE_KEYS = new Set([
  "password",
  "qrCode",
  "token",
  "secretKey",
  "accessToken",
  "refreshToken",
  "apiKey",
  "secret",
]);

const REDACTED = "[REDACTED]";

/** Loại bỏ field nhạy cảm trước khi ghi audit log */
export function redactAuditValue(value: unknown): unknown {
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.map(redactAuditValue);
  }

  if (typeof value !== "object") {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      result[key] = REDACTED;
    } else {
      result[key] = redactAuditValue(nested);
    }
  }
  return result;
}
