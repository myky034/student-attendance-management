export interface AttendanceRecord {
  date: string;
  status: "present" | "absent" | "excused absence";
  timestamp: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  class: Classes;
  attendanceRecords: AttendanceRecord[];
  qrCode: string;
  isActive: boolean;
  isDeleted: boolean;
  isVerified: boolean;
  isSuspended: boolean;
  isLocked: boolean;
}

export interface Classes {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}