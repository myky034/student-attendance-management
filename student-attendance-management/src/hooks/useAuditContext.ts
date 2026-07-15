import { useMemo } from "react";
import { useAppContext } from "@/context/useAppContext";
import type { AuditContext } from "@/lib/audit/types";

/** Lấy AuditContext từ session hiện tại để truyền vào API mutations */
export function useAuditContext(): AuditContext | null {
  const { user } = useAppContext();

  return useMemo(() => {
    if (!user?.id) {
      if (import.meta.env.DEV) {
        console.error(
          "[audit] useAuditContext: session user thiếu id — AuditLog sẽ bị bỏ qua.",
          { hasUser: Boolean(user), role: user?.role },
        );
      }
      return null;
    }
    const classId =
      user.classId && user.classId.trim() !== "" ? user.classId : null;
    return {
      userId: user.id,
      role: user.role,
      classId,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };
  }, [user?.id, user?.role, user?.classId]);
}
