import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Loader2, Eye, History } from "lucide-react";
import { toast } from "sonner";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
} from "@/lib/audit/constants";
import type {
  AuditLogFilters,
  AuditLogRecord,
  AuditScope,
} from "@/lib/audit/types";
import {
  getAuditLogs,
  type AuditLogScopeContext,
} from "@/lib/api/auditLog";
import { formatAuditDateTime } from "@/lib/audit/format";
import { AuditLogDetailModal } from "./AuditLogDetailModal";

type AuditLogsTableProps = {
  scope: AuditScope;
  scopeContext: AuditLogScopeContext;
  filters: AuditLogFilters;
  showIp?: boolean;
  classSubtitle?: string;
  onPageChange?: (page: number) => void;
};

function getActionVariant(
  action: AuditLogRecord["action"],
): "success" | "warning" | "danger" | "info" | "secondary" {
  if (action === "CREATE" || action === "APPROVE" || action === "LOGIN") {
    return "success";
  }
  if (action === "DELETE" || action === "REJECT") return "danger";
  if (action === "CANCEL") return "warning";
  return "info";
}

export function AuditLogsTable({
  scope,
  scopeContext,
  filters,
  showIp = true,
  classSubtitle,
  onPageChange,
}: AuditLogsTableProps) {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const pageSize = filters.pageSize ?? 20;
  const page = filters.page ?? 1;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAuditLogs(filters, scopeContext);
      setLogs(result.logs);
      setTotal(result.total);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không tải được nhật ký",
      );
    } finally {
      setLoading(false);
    }
  }, [filters, scopeContext]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
              <History size={20} />
            </div>
            <div>
              <CardTitle className="text-lg">Nhật ký hoạt động</CardTitle>
              <CardDescription>
                {scope === "supervisor"
                  ? "Chế độ giám sát — chỉ xem log vận hành"
                  : scope === "teacher"
                    ? `Lớp của bạn${classSubtitle ? `: ${classSubtitle}` : ""}`
                    : "Toàn bộ hoạt động hệ thống"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-zinc-500">
              <Loader2 className="mr-2 animate-spin" size={20} />
              Đang tải...
            </div>
          ) : logs.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              Không có nhật ký phù hợp bộ lọc.
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Người thực hiện</TableHead>
                      <TableHead>Hành động</TableHead>
                      <TableHead>Đối tượng</TableHead>
                      <TableHead>Lớp</TableHead>
                      {showIp && <TableHead>IP</TableHead>}
                      <TableHead className="text-right">Chi tiết</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatAuditDateTime(log.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.actorName ?? log.userId}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionVariant(log.action)}>
                            {AUDIT_ACTION_LABELS[log.action]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {AUDIT_ENTITY_LABELS[log.entity]}
                          {log.entityId && (
                            <span className="block text-xs text-zinc-500">
                              {log.entityId}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.className ?? "—"}
                        </TableCell>
                        {showIp && (
                          <TableCell className="text-xs text-zinc-500">
                            {log.ipAddress ?? "—"}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLog(log);
                              setDetailOpen(true);
                            }}
                          >
                            <Eye size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {log.actorName ?? log.userId}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatAuditDateTime(log.createdAt)}
                        </p>
                      </div>
                      <Badge variant={getActionVariant(log.action)}>
                        {AUDIT_ACTION_LABELS[log.action]}
                      </Badge>
                    </div>
                    <p className="text-sm">
                      {AUDIT_ENTITY_LABELS[log.entity]}
                      {log.entityId ? ` · ${log.entityId}` : ""}
                    </p>
                    {log.className && (
                      <p className="mt-1 text-xs text-zinc-500">
                        Lớp: {log.className}
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => {
                        setSelectedLog(log);
                        setDetailOpen(true);
                      }}
                    >
                      <Eye size={14} className="mr-1" />
                      Xem chi tiết
                    </Button>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(p) => onPageChange?.(p)}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AuditLogDetailModal
        log={selectedLog}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        showIp={showIp}
      />
    </>
  );
}
