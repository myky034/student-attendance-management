export interface AttendanceRecord {
  date: string;
  status: "present" | "absent";
  timestamp: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  class: string;
  attendanceRecords: AttendanceRecord[];
}
