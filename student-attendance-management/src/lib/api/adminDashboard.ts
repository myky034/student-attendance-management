import { createClient } from "@/lib/supabase/client";
import { APP_TIMEZONE, getVietnamDateString } from "@/lib/datetime";
import { getAuditLogs } from "@/lib/api/auditLog";
import type { AuditLogRecord, AuditLogScopeContext } from "@/lib/audit/types";

export type AdminDashboardOverview = {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  todayAttendanceRate: number;
  todayPresent: number;
  todayTotal: number;
};

export type ClassAttendanceRate = {
  classId: string;
  className: string;
  rate: number;
  present: number;
  total: number;
};

export type WeekdayTrendPoint = {
  date: string;
  label: string;
  rate: number;
  present: number;
  total: number;
};

export type AbsentStudentAlert = {
  studentId: string;
  studentName: string;
  className: string;
  absentCount: number;
};

type StudentRow = {
  id: string;
  name: string;
  classId: string | null;
  class?: { name: string } | { name: string }[] | null;
};

type AttendanceRow = {
  studentId: string;
  status: string;
  date: string;
  class_id?: string | null;
};

type ClassRow = {
  id: string;
  name: string;
};

/** Thứ trong tuần theo múi giờ VN: 0=CN … 6=T7 */
function getVietnamWeekday(date: Date): number {
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[short] ?? 0;
}

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** 5 ngày làm việc (T2–T6) gần nhất, sắp xếp tăng dần theo ngày */
function getLast5Weekdays(): { date: string; label: string }[] {
  const result: { date: string; label: string }[] = [];
  const cursor = new Date();
  let safety = 21;

  while (result.length < 5 && safety > 0) {
    const wd = getVietnamWeekday(cursor);
    if (wd >= 1 && wd <= 5) {
      const date = getVietnamDateString(cursor);
      result.unshift({ date, label: WEEKDAY_LABELS[wd]! });
    }
    cursor.setDate(cursor.getDate() - 1);
    safety -= 1;
  }

  return result;
}

/** Thứ Hai đầu tuần hiện tại (giờ VN) */
function getCurrentWeekStartVN(): string {
  const cursor = new Date();
  while (getVietnamWeekday(cursor) !== 1) {
    cursor.setDate(cursor.getDate() - 1);
  }
  return getVietnamDateString(cursor);
}

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function calcRate(present: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((present / total) * 1000) / 10;
}

/** Lấy danh sách học sinh active — dùng chung cho nhiều aggregation */
async function fetchActiveStudents(): Promise<
  { id: string; classId: string | null }[]
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("User")
    .select("id, classId")
    .eq("role", "student")
    .eq("isDeleted", false);

  if (error) {
    console.error("fetchActiveStudents error:", error);
    throw error;
  }

  return (data ?? []) as { id: string; classId: string | null }[];
}

/** Overview cards — 3 count song song + 1 query điểm danh hôm nay */
export async function getAdminDashboardOverview(): Promise<AdminDashboardOverview> {
  const supabase = createClient();
  const today = getVietnamDateString();

  const [studentsRes, teachersRes, classesRes, students] = await Promise.all([
    supabase
      .from("User")
      .select("id", { count: "exact", head: true })
      .eq("role", "student")
      .eq("isDeleted", false),
    supabase
      .from("User")
      .select("id", { count: "exact", head: true })
      .eq("role", "teacher"),
    supabase.from("Class").select("id", { count: "exact", head: true }),
    fetchActiveStudents(),
  ]);

  if (studentsRes.error) throw studentsRes.error;
  if (teachersRes.error) throw teachersRes.error;
  if (classesRes.error) throw classesRes.error;

  const totalStudents = studentsRes.count ?? 0;
  const studentIds = students.map((s) => s.id);

  let todayPresent = 0;
  if (studentIds.length > 0) {
    const { data: todayRecords, error: attError } = await supabase
      .from("AttendanceRecord")
      .select("studentId, status")
      .eq("date", today)
      .in("studentId", studentIds);

    if (attError) throw attError;

    todayPresent = ((todayRecords ?? []) as AttendanceRow[]).filter(
      (r) => r.status === "present",
    ).length;
  }

  return {
    totalStudents,
    totalTeachers: teachersRes.count ?? 0,
    totalClasses: classesRes.count ?? 0,
    todayPresent,
    todayTotal: totalStudents,
    todayAttendanceRate: calcRate(todayPresent, totalStudents),
  };
}

/** Tỷ lệ điểm danh theo lớp trong ngày — gom nhóm in-memory, tránh N+1 */
export async function getAttendanceRateByClass(): Promise<
  ClassAttendanceRate[]
> {
  const supabase = createClient();
  const today = getVietnamDateString();

  const [classesRes, students] = await Promise.all([
    supabase.from("Class").select("id, name").order("name"),
    fetchActiveStudents(),
  ]);

  if (classesRes.error) throw classesRes.error;

  const classes = (classesRes.data ?? []) as ClassRow[];
  const studentsByClass = new Map<string, number>();
  for (const s of students) {
    if (!s.classId) continue;
    studentsByClass.set(s.classId, (studentsByClass.get(s.classId) ?? 0) + 1);
  }

  const studentIds = students.map((s) => s.id);
  const presentByClass = new Map<string, number>();

  if (studentIds.length > 0) {
    const { data: records, error } = await supabase
      .from("AttendanceRecord")
      .select("studentId, status, class_id")
      .eq("date", today)
      .in("studentId", studentIds);

    if (error) throw error;

    const studentClassMap = new Map(
      students.map((s) => [s.id, s.classId] as const),
    );

    for (const row of (records ?? []) as AttendanceRow[]) {
      if (row.status !== "present") continue;
      const classId = row.class_id ?? studentClassMap.get(row.studentId);
      if (!classId) continue;
      presentByClass.set(classId, (presentByClass.get(classId) ?? 0) + 1);
    }
  }

  return classes.map((cls) => {
    const total = studentsByClass.get(cls.id) ?? 0;
    const present = presentByClass.get(cls.id) ?? 0;
    return {
      classId: cls.id,
      className: cls.name,
      present,
      total,
      rate: calcRate(present, total),
    };
  });
}

/** Xu hướng 5 ngày làm việc gần nhất — 1 query AttendanceRecord theo khoảng ngày */
export async function getWeeklyAttendanceTrend(): Promise<WeekdayTrendPoint[]> {
  const weekdays = getLast5Weekdays();
  if (weekdays.length === 0) return [];

  const supabase = createClient();
  const students = await fetchActiveStudents();
  const totalStudents = students.length;
  const studentIds = students.map((s) => s.id);

  const presentByDate = new Map<string, number>();
  for (const { date } of weekdays) {
    presentByDate.set(date, 0);
  }

  if (studentIds.length > 0) {
    const { data: records, error } = await supabase
      .from("AttendanceRecord")
      .select("date, status, studentId")
      .gte("date", weekdays[0]!.date)
      .lte("date", weekdays[weekdays.length - 1]!.date)
      .in("studentId", studentIds);

    if (error) throw error;

    for (const row of (records ?? []) as AttendanceRow[]) {
      if (row.status !== "present") continue;
      const dateKey = row.date.split("T")[0]!;
      if (presentByDate.has(dateKey)) {
        presentByDate.set(dateKey, (presentByDate.get(dateKey) ?? 0) + 1);
      }
    }
  }

  return weekdays.map(({ date, label }) => {
    const present = presentByDate.get(date) ?? 0;
    return {
      date,
      label,
      present,
      total: totalStudents,
      rate: calcRate(present, totalStudents),
    };
  });
}

/** Top 5 học sinh vắng nhiều nhất trong tuần hiện tại */
export async function getTopAbsentStudentsThisWeek(): Promise<
  AbsentStudentAlert[]
> {
  const supabase = createClient();
  const weekStart = getCurrentWeekStartVN();
  const today = getVietnamDateString();

  const { data: absentRecords, error: attError } = await supabase
    .from("AttendanceRecord")
    .select("studentId")
    .eq("status", "absent")
    .gte("date", weekStart)
    .lte("date", today);

  if (attError) throw attError;

  const countMap = new Map<string, number>();
  for (const row of (absentRecords ?? []) as AttendanceRow[]) {
    countMap.set(row.studentId, (countMap.get(row.studentId) ?? 0) + 1);
  }

  const topIds = [...countMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  if (topIds.length === 0) return [];

  const { data: studentRows, error: userError } = await supabase
    .from("User")
    .select("id, name, class:Class(name)")
    .in("id", topIds);

  if (userError) throw userError;

  const studentMap = new Map<string, StudentRow>();
  for (const row of (studentRows ?? []) as StudentRow[]) {
    studentMap.set(row.id, row);
  }

  return topIds.map((id) => {
    const student = studentMap.get(id);
    const classRel = normalizeRelation(student?.class);
    return {
      studentId: id,
      studentName: student?.name ?? "—",
      className: classRel?.name ?? "—",
      absentCount: countMap.get(id) ?? 0,
    };
  });
}

/** 5 audit log mới nhất — tái sử dụng getAuditLogs với scope admin */
export async function getRecentAuditLogs(
  scopeCtx: AuditLogScopeContext,
  limit = 5,
): Promise<AuditLogRecord[]> {
  const result = await getAuditLogs(
    { page: 1, pageSize: limit },
    scopeCtx,
  );
  return result.logs;
}
