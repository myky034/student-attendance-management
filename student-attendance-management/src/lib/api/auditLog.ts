import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_RETENTION_DAYS,
  SUPERVISOR_EXCLUDED_ENTITIES,
  SUPERVISOR_OPERATIONAL_ENTITIES,
} from "@/lib/audit/constants";
import type {
  AuditAction,
  AuditEntity,
  AuditLogFilters,
  AuditLogRecord,
  AuditLogScopeContext,
  AuditScope,
} from "@/lib/audit/types";

type AuditLogRow = {
  id: string;
  userId: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string | null;
  classId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: { id: string; name: string } | { id: string; name: string }[] | null;
  class?: { id: string; name: string } | { id: string; name: string }[] | null;
};

const auditLogSelect = `
  id, userId, actorRole, action, entity, entityId, classId,
  oldValue, newValue, ipAddress, userAgent, createdAt,
  user:User(id, name),
  class:Class(id, name)
`;

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapAuditLogRow(row: AuditLogRow): AuditLogRecord {
  const user = normalizeRelation(row.user);
  const classRow = normalizeRelation(row.class);

  return {
    id: row.id,
    userId: row.userId,
    actorRole: row.actorRole as AuditLogRecord["actorRole"],
    action: row.action as AuditAction,
    entity: row.entity as AuditEntity,
    entityId: row.entityId,
    classId: row.classId,
    oldValue: row.oldValue,
    newValue: row.newValue,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
    actorName: user?.name,
    className: classRow?.name,
  };
}

function getTargetUserRole(log: AuditLogRecord): string | null {
  const fromNew =
    log.newValue && typeof log.newValue.role === "string"
      ? log.newValue.role
      : null;
  const fromOld =
    log.oldValue && typeof log.oldValue.role === "string"
      ? log.oldValue.role
      : null;
  return fromNew ?? fromOld;
}

/** Supervisor chỉ thấy User log liên quan student/teacher (trừ log do chính mình thực hiện) */
function isSupervisorUserLogAllowed(
  log: AuditLogRecord,
  actorUserId: string,
): boolean {
  // Luôn hiển thị hành động do chính supervisor thực hiện (LOGIN, settings, v.v.)
  if (log.userId === actorUserId) return true;

  if (log.entity !== "User") return true;
  const role = getTargetUserRole(log);
  if (!role) return true;
  return role === "student" || role === "teacher";
}

/** Lọc log theo scope role — bắt buộc ở application layer */
export function filterLogsByScope(
  logs: AuditLogRecord[],
  scopeCtx: AuditLogScopeContext,
): AuditLogRecord[] {
  const { scope, userId, classId } = scopeCtx;

  return logs.filter((log) => {
    if (scope === "admin") return true;

    if (scope === "supervisor") {
      // Log do chính supervisor thực hiện — luôn hiển thị (kể cả LOGIN, settings)
      if (log.userId === userId) return true;
      if (SUPERVISOR_EXCLUDED_ENTITIES.includes(log.entity)) return false;
      if (!SUPERVISOR_OPERATIONAL_ENTITIES.includes(log.entity)) return false;
      return isSupervisorUserLogAllowed(log, userId);
    }

    if (scope === "teacher") {
      if (log.userId === userId) return true;
      if (classId && log.classId === classId) return true;
      return false;
    }

    return false;
  });
}

function applyFiltersToQuery(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters: AuditLogFilters,
  scopeCtx: AuditLogScopeContext,
) {
  const { scope, userId } = scopeCtx;
  let q = query;

  if (filters.action) {
    q = q.eq("action", filters.action);
  }
  if (filters.entity) {
    q = q.eq("entity", filters.entity);
  }
  if (filters.userId) {
    q = q.eq("userId", filters.userId);
  }
  if (filters.classId) {
    q = q.eq("classId", filters.classId);
  }
  if (filters.entityId) {
    q = q.eq("entityId", filters.entityId);
  }
  if (filters.dateFrom) {
    q = q.gte("createdAt", `${filters.dateFrom}T00:00:00.000Z`);
  }
  if (filters.dateTo) {
    q = q.lte("createdAt", `${filters.dateTo}T23:59:59.999Z`);
  }

  // Supervisor: log của chính mình (mọi entity) HOẶC log vận hành của người khác
  if (scope === "supervisor" && userId) {
    const operational = SUPERVISOR_OPERATIONAL_ENTITIES.join(",");
    q = q.or(`userId.eq.${userId},entity.in.(${operational})`);
  }

  if (scope === "teacher" && filters.classId) {
    q = q.eq("classId", filters.classId);
  }

  return q;
}

export type GetAuditLogsResult = {
  logs: AuditLogRecord[];
  total: number;
};

export async function getAuditLogs(
  filters: AuditLogFilters,
  scopeCtx: AuditLogScopeContext,
): Promise<GetAuditLogsResult> {
  const supabase = createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("AuditLog")
    .select(auditLogSelect, { count: "exact" })
    .order("createdAt", { ascending: false });

  query = applyFiltersToQuery(query, filters, scopeCtx);

  if (scopeCtx.scope === "teacher") {
    // Teacher: log của mình HOẶC thuộc lớp mình
    if (scopeCtx.classId) {
      query = query.or(
        `userId.eq.${scopeCtx.userId},classId.eq.${scopeCtx.classId}`,
      );
    } else {
      query = query.eq("userId", scopeCtx.userId);
    }
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error("getAuditLogs error:", error);
    throw error;
  }

  let logs = ((data ?? []) as AuditLogRow[]).map(mapAuditLogRow);
  logs = filterLogsByScope(logs, scopeCtx);

  if (filters.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    logs = logs.filter(
      (log) =>
        log.actorName?.toLowerCase().includes(term) ||
        log.entityId?.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term) ||
        log.entity.toLowerCase().includes(term),
    );
  }

  // total sau lọc scope/search — tránh hiển thị trang trống khi count DB > rows hiển thị
  const total =
    scopeCtx.scope === "admin" && !filters.search?.trim()
      ? (count ?? logs.length)
      : logs.length;

  return { logs, total };
}

export async function getAuditLogById(
  id: string,
  scopeCtx: AuditLogScopeContext,
): Promise<AuditLogRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("AuditLog")
    .select(auditLogSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getAuditLogById error:", error);
    throw error;
  }

  if (!data) return null;

  const log = mapAuditLogRow(data as AuditLogRow);
  const [filtered] = filterLogsByScope([log], scopeCtx);
  return filtered ?? null;
}

export async function countOldAuditLogs(
  olderThanDays = DEFAULT_RETENTION_DAYS,
): Promise<number> {
  const supabase = createClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const { count, error } = await supabase
    .from("AuditLog")
    .select("id", { count: "exact", head: true })
    .lt("createdAt", cutoff.toISOString());

  if (error) {
    console.error("countOldAuditLogs error:", error);
    throw error;
  }

  return count ?? 0;
}

export async function getOldAuditLogsForBackup(
  olderThanDays = DEFAULT_RETENTION_DAYS,
): Promise<AuditLogRecord[]> {
  const supabase = createClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const { data, error } = await supabase
    .from("AuditLog")
    .select(auditLogSelect)
    .lt("createdAt", cutoff.toISOString())
    .order("createdAt", { ascending: true });

  if (error) {
    console.error("getOldAuditLogsForBackup error:", error);
    throw error;
  }

  return ((data ?? []) as AuditLogRow[]).map(mapAuditLogRow);
}

/** Tải JSON backup log cũ — admin dùng trước khi xóa */
export function exportAuditLogsBackup(logs: AuditLogRecord[]): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    count: logs.length,
    logs,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `audit-logs-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function clearOldAuditLogs(
  scopeCtx: AuditLogScopeContext,
  olderThanDays = DEFAULT_RETENTION_DAYS,
): Promise<number> {
  if (scopeCtx.scope !== "admin") {
    throw new Error("Chỉ admin mới được xóa log cũ");
  }

  const supabase = createClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const { data, error } = await supabase
    .from("AuditLog")
    .delete()
    .lt("createdAt", cutoff.toISOString())
    .select("id");

  if (error) {
    console.error("clearOldAuditLogs error:", error);
    throw error;
  }

  return (data ?? []).length;
}
