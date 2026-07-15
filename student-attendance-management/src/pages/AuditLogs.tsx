import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "@/context/useAppContext";
import { AuditLogFilters } from "@/components/audit/AuditLogFilters";
import { AuditLogsTable } from "@/components/audit/AuditLogsTable";
import { getClassById } from "@/lib/api/classes";
import type { AuditLogFilters as AuditLogFiltersType } from "@/lib/audit/types";

const DEFAULT_FILTERS: AuditLogFiltersType = {
  page: 1,
  pageSize: 20,
};

export function AuditLogs() {
  const { user } = useAppContext();
  const [filters, setFilters] = useState<AuditLogFiltersType>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<AuditLogFiltersType>(DEFAULT_FILTERS);
  const [className, setClassName] = useState<string>("");

  const scopeContext = useMemo(
    () => ({
      scope: "teacher" as const,
      userId: user?.id ?? "",
      classId: user?.classId ?? null,
    }),
    [user?.id, user?.classId],
  );

  useEffect(() => {
    if (user?.classId) {
      void getClassById(user.classId).then((cls) => {
        if (cls) setClassName(cls.name);
      });
    }
  }, [user?.classId]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Nhật ký hoạt động lớp{className ? ` ${className}` : ""} của bạn
        </p>
      </div>

      <AuditLogFilters
        scope="teacher"
        filters={filters}
        onChange={setFilters}
        onApply={() => setAppliedFilters({ ...filters, page: 1 })}
        onReset={() => {
          setFilters(DEFAULT_FILTERS);
          setAppliedFilters(DEFAULT_FILTERS);
        }}
      />

      <AuditLogsTable
        scope="teacher"
        scopeContext={scopeContext}
        filters={appliedFilters}
        showIp={false}
        classSubtitle={className}
        onPageChange={(page) =>
          setAppliedFilters((prev) => ({ ...prev, page }))
        }
      />
    </div>
  );
}
