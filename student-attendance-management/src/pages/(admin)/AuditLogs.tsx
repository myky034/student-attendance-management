import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/context/useAppContext";
import { AuditLogFilters } from "@/components/audit/AuditLogFilters";
import { AuditLogsTable } from "@/components/audit/AuditLogsTable";
import { AuditLogRetentionPanel } from "@/components/audit/AuditLogRetentionPanel";
import { getClasses } from "@/lib/api/classes";
import type { AuditLogFilters as AuditLogFiltersType } from "@/lib/audit/types";
import { useEffect } from "react";
import { Shield } from "lucide-react";

const DEFAULT_FILTERS: AuditLogFiltersType = {
  page: 1,
  pageSize: 20,
};

export function AdminAuditLogs() {
  const { user } = useAppContext();
  const [filters, setFilters] = useState<AuditLogFiltersType>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<AuditLogFiltersType>(DEFAULT_FILTERS);
  const [classOptions, setClassOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const scope = user?.role === "supervisor" ? "supervisor" : "admin";

  const scopeContext = useMemo(
    () => ({
      scope: scope as "admin" | "supervisor",
      userId: user?.id ?? "",
      classId: user?.classId ?? null,
    }),
    [scope, user?.id, user?.classId],
  );

  useEffect(() => {
    if (scope === "admin") {
      void getClasses().then((classes) =>
        setClassOptions(classes.map((c) => ({ id: c.id, name: c.name }))),
      );
    }
  }, [scope]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {scope === "supervisor"
              ? "Giám sát — xem log vận hành và hoạt động do bạn thực hiện"
              : "Theo dõi hoạt động hệ thống theo vai trò"}
          </p>
        </div>
        {scope === "supervisor" && (
          <Badge variant="info" className="gap-1.5 px-3 py-1.5">
            <Shield size={14} />
            Giám sát — Chỉ xem
          </Badge>
        )}
      </div>

      <AuditLogFilters
        scope={scope}
        filters={filters}
        onChange={setFilters}
        onApply={() => setAppliedFilters({ ...filters, page: 1 })}
        onReset={() => {
          setFilters(DEFAULT_FILTERS);
          setAppliedFilters(DEFAULT_FILTERS);
        }}
        showClassFilter={scope === "admin"}
        classOptions={classOptions}
      />

      {scope === "admin" && (
        <AuditLogRetentionPanel
          scopeContext={scopeContext}
          onCleared={() => setRefreshKey((k) => k + 1)}
        />
      )}

      <AuditLogsTable
        key={refreshKey}
        scope={scope}
        scopeContext={scopeContext}
        filters={appliedFilters}
        showIp
        onPageChange={(page) =>
          setAppliedFilters((prev) => ({ ...prev, page }))
        }
      />
    </div>
  );
}
