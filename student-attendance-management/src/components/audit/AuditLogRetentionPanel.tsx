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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Archive, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_RETENTION_DAYS } from "@/lib/audit/constants";
import type { AuditLogScopeContext } from "@/lib/audit/types";
import {
  countOldAuditLogs,
  getOldAuditLogsForBackup,
  exportAuditLogsBackup,
  clearOldAuditLogs,
} from "@/lib/api/auditLog";

type AuditLogRetentionPanelProps = {
  scopeContext: AuditLogScopeContext;
  onCleared?: () => void;
};

export function AuditLogRetentionPanel({
  scopeContext,
  onCleared,
}: AuditLogRetentionPanelProps) {
  const [oldCount, setOldCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [backupDone, setBackupDone] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadCount = useCallback(async () => {
    setLoading(true);
    try {
      const count = await countOldAuditLogs(DEFAULT_RETENTION_DAYS);
      setOldCount(count);
    } catch (err) {
      toast.error("Không đếm được log cũ");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCount();
  }, [loadCount]);

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const logs = await getOldAuditLogsForBackup(DEFAULT_RETENTION_DAYS);
      if (logs.length === 0) {
        toast.info("Không có log cũ để backup");
        return;
      }
      exportAuditLogsBackup(logs);
      setBackupDone(true);
      toast.success(`Đã tải backup ${logs.length} bản ghi`);
    } catch (err) {
      toast.error("Backup thất bại");
      console.error(err);
    } finally {
      setBackingUp(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      const deleted = await clearOldAuditLogs(
        scopeContext,
        DEFAULT_RETENTION_DAYS,
      );
      toast.success(`Đã xóa ${deleted} bản ghi cũ hơn ${DEFAULT_RETENTION_DAYS} ngày`);
      setBackupDone(false);
      setConfirmOpen(false);
      await loadCount();
      onCleared?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Xóa log thất bại",
      );
    } finally {
      setClearing(false);
    }
  };

  return (
    <>
      <Card className="border-amber-200 dark:border-amber-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={20} />
            <CardTitle className="text-base">Lưu trữ & dọn dẹp</CardTitle>
          </div>
          <CardDescription>
            Log cũ hơn {DEFAULT_RETENTION_DAYS} ngày cần backup JSON trước khi
            xóa khỏi hệ thống.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center text-sm text-zinc-500">
              <Loader2 className="mr-2 animate-spin" size={16} />
              Đang kiểm tra...
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="warning">{oldCount} bản ghi cần dọn</Badge>
              {backupDone && (
                <Badge variant="success">Đã backup — có thể xóa</Badge>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={backingUp || oldCount === 0}
              onClick={() => void handleBackup()}
            >
              {backingUp ? (
                <Loader2 className="mr-2 animate-spin" size={16} />
              ) : (
                <Archive className="mr-2" size={16} />
              )}
              Tải backup JSON
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!backupDone || oldCount === 0 || clearing}
              onClick={() => setConfirmOpen(true)}
            >
              {clearing ? (
                <Loader2 className="mr-2 animate-spin" size={16} />
              ) : (
                <Trash2 className="mr-2" size={16} />
              )}
              Xóa log cũ
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa log cũ?</AlertDialogTitle>
            <AlertDialogDescription>
              Chú đã backup {oldCount} bản ghi. Thao tác này không thể hoàn tác
              trên UI. Chỉ xóa log cũ hơn {DEFAULT_RETENTION_DAYS} ngày.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleClear()}>
              Xác nhận xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
