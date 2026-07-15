import type { UserRole } from "@/context/appContext";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "APPROVE"
  | "REJECT"
  | "CANCEL"
  | "LOCK"
  | "ACTIVATE";

export type AuditEntity =
  | "User"
  | "AttendanceRecord"
  | "LeaveRequest"
  | "AcademicYear"
  | "Semester"
  | "AttendancePeriodConfig"
  | "Grade"
  | "Class";

export type AuditScope = "admin" | "supervisor" | "teacher";

export type AuditContext = {
  userId: string;
  role: UserRole;
  classId?: string | null;
  userAgent?: string;
  ipAddress?: string;
};

export type WriteAuditLogInput = AuditContext & {
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | null;
  classId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
};

export type AuditLogRecord = {
  id: string;
  userId: string;
  actorRole: UserRole;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string | null;
  classId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actorName?: string;
  className?: string;
};

export type AuditLogFilters = {
  action?: AuditAction | "";
  entity?: AuditEntity | "";
  userId?: string;
  classId?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type AuditLogScopeContext = {
  scope: AuditScope;
  userId: string;
  classId?: string | null;
};
