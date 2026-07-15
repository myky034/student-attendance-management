import { createClient } from "@/lib/supabase/client";
import { redactAuditValue } from "./redact";
import type { WriteAuditLogInput } from "./types";

/** Chuẩn hóa classId — chuỗi rỗng gây lỗi FK khi insert AuditLog */
function normalizeAuditClassId(classId?: string | null): string | null {
  if (classId == null || classId.trim() === "") return null;
  return classId;
}

/** Đảm bảo JSONB insert được qua PostgREST (loại Date/circular ref) */
function toJsonSafe(value: unknown): unknown {
  if (value == null) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return { _auditError: "unserializable_value" };
  }
}

const RLS_BLOCKED_CODE = "42501";

function logAuditDev(message: string, detail?: unknown): void {
  if (import.meta.env.DEV) {
    console.log(`[audit] ${message}`, detail ?? "");
  }
}

function logAuditFailure(
  reason: string,
  detail: Record<string, unknown>,
): void {
  const payload = { reason, ...detail };
  if (import.meta.env.DEV) {
    console.error("[audit] writeAuditLog FAILED:", payload);
    if (detail.code === RLS_BLOCKED_CODE) {
      console.error(
        "[audit] RLS chặn INSERT vào AuditLog. Chạy prisma/rls-audit-log.sql trên Supabase SQL Editor.",
      );
    }
  } else {
    console.warn("[audit] writeAuditLog failed:", reason, detail.message ?? "");
  }
}

/**
 * Ghi audit log — lỗi không được làm vỡ luồng chính nhưng phải log rõ trong DEV.
 */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  if (!input.userId?.trim()) {
    logAuditFailure("missing userId", {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
    });
    return;
  }

  if (!input.role?.trim()) {
    logAuditFailure("missing role", {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      userId: input.userId,
    });
    return;
  }

  logAuditDev("inserting", {
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? null,
    userId: input.userId,
  });

  try {
    const supabase = createClient();
    const payload = {
      id: crypto.randomUUID(),
      userId: input.userId,
      actorRole: input.role,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      classId: normalizeAuditClassId(input.classId),
      oldValue:
        input.oldValue != null
          ? toJsonSafe(redactAuditValue(input.oldValue))
          : null,
      newValue:
        input.newValue != null
          ? toJsonSafe(redactAuditValue(input.newValue))
          : null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    };

    const { error } = await supabase.from("AuditLog").insert(payload);
    if (error) {
      logAuditFailure("supabase insert error", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
      });
      return;
    }

    logAuditDev("insert ok", {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
    });
  } catch (err) {
    logAuditFailure("unexpected error", {
      message: err instanceof Error ? err.message : String(err),
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
    });
  }
}

/** Helper gọi writeAuditLog mà không cần await */
export function writeAuditLogSafe(input: WriteAuditLogInput): void {
  void writeAuditLog(input);
}
