import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
} from "@/lib/audit/constants";
import type { AuditLogRecord } from "@/lib/audit/types";
import { formatAuditDateTime } from "@/lib/audit/format";
import { cn } from "@/lib/utils";

type AuditLogDetailModalProps = {
  log: AuditLogRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showIp?: boolean;
};

function formatJson(value: Record<string, unknown> | null): string {
  if (!value) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function DiffBlock({
  label,
  value,
  variant,
}: {
  label: string;
  value: Record<string, unknown> | null;
  variant: "old" | "new";
}) {
  return (
    <div className="min-w-0 flex-1">
      <p
        className={cn(
          "mb-2 text-xs font-semibold uppercase tracking-wide",
          variant === "old"
            ? "text-red-600 dark:text-red-400"
            : "text-green-600 dark:text-green-400",
        )}
      >
        {label}
      </p>
      <pre className="max-h-64 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-800">
        {formatJson(value)}
      </pre>
    </div>
  );
}

export function AuditLogDetailModal({
  log,
  open,
  onOpenChange,
  showIp = true,
}: AuditLogDetailModalProps) {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết nhật ký</DialogTitle>
          <DialogDescription>
            {formatAuditDateTime(log.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">{AUDIT_ACTION_LABELS[log.action]}</Badge>
            <Badge variant="secondary">
              {AUDIT_ENTITY_LABELS[log.entity]}
            </Badge>
            {log.entityId && (
              <Badge variant="outline">ID: {log.entityId}</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="text-zinc-500">Người thực hiện: </span>
              <span className="font-medium">
                {log.actorName ?? log.userId}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Vai trò: </span>
              <span className="font-medium">{log.actorRole}</span>
            </div>
            {log.className && (
              <div>
                <span className="text-zinc-500">Lớp: </span>
                <span className="font-medium">{log.className}</span>
              </div>
            )}
            {showIp && log.ipAddress && (
              <div>
                <span className="text-zinc-500">IP: </span>
                <span className="font-medium">{log.ipAddress}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 lg:flex-row">
            <DiffBlock label="Giá trị cũ" value={log.oldValue} variant="old" />
            <DiffBlock label="Giá trị mới" value={log.newValue} variant="new" />
          </div>

          {log.userAgent && (
            <p className="break-all text-xs text-zinc-500">
              User-Agent: {log.userAgent}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
