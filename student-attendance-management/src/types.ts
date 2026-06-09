import { type User, type UserRole } from "./context/appContext";

export interface AttendanceRecord {
  date: string;
  status: "present" | "absent" | "excused absence";
  timestamp: string;
  createdBy: User;
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
  role: UserRole;
}

export interface Classes {
  id: string;
  name: string;
  grade: Grades;
  createdAt: Date;
  updatedAt: Date;
}

export interface Grades {
  id: string;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}