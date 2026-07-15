import type { AuditAction, AuditEntity } from "./types";

export const AUDIT_ACTIONS: AuditAction[] = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "APPROVE",
  "REJECT",
  "CANCEL",
  "LOCK",
  "ACTIVATE",
];

export const AUDIT_ENTITIES: AuditEntity[] = [
  "User",
  "AttendanceRecord",
  "LeaveRequest",
  "AcademicYear",
  "Semester",
  "AttendancePeriodConfig",
  "Grade",
  "Class",
];

/** Supervisor chỉ xem log vận hành — không xem cấu hình hệ thống */
export const SUPERVISOR_OPERATIONAL_ENTITIES: AuditEntity[] = [
  "AttendanceRecord",
  "LeaveRequest",
  "User",
];

/** Entity cấu hình bị ẩn khỏi supervisor */
export const SUPERVISOR_EXCLUDED_ENTITIES: AuditEntity[] = [
  "AcademicYear",
  "Semester",
  "AttendancePeriodConfig",
  "Grade",
  "Class",
];

export const DEFAULT_RETENTION_DAYS = 90;

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "Tạo mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  LOGIN: "Đăng nhập",
  APPROVE: "Duyệt",
  REJECT: "Từ chối",
  CANCEL: "Hủy",
  LOCK: "Khóa/Mở khóa",
  ACTIVATE: "Kích hoạt/Vô hiệu",
};

export const AUDIT_ENTITY_LABELS: Record<AuditEntity, string> = {
  User: "Người dùng",
  AttendanceRecord: "Điểm danh",
  LeaveRequest: "Đơn nghỉ",
  AcademicYear: "Năm học",
  Semester: "Học kỳ",
  AttendancePeriodConfig: "Kỳ điểm danh",
  Grade: "Khối",
  Class: "Lớp",
};
