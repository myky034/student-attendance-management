/** Cảnh báo khi mutation không truyền AuditContext — ghi log sẽ bị bỏ qua */
export function warnMissingAudit(action: string): void {
  const msg = `[audit] ${action}: thiếu AuditContext — không ghi AuditLog. Kiểm tra useAuditContext / session user.`;
  if (import.meta.env.DEV) {
    console.error(msg);
  } else {
    console.warn(msg);
  }
}

/** Chuỗi rỗng classId gây lỗi FK khi ghi AuditLog */
export function normalizeClassIdForAudit(classId?: string | null): string | null {
  if (classId == null || classId.trim() === "") return null;
  return classId;
}
