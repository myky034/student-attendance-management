import { formatVietnamDateTime } from "@/lib/datetime";

/** Hiển thị createdAt audit log: UTC → giờ Việt Nam (Asia/Ho_Chi_Minh) */
export function formatAuditDateTime(iso: string | null | undefined): string {
  return formatVietnamDateTime(iso);
}
