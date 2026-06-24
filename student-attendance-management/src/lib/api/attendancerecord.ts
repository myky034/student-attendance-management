import { createClient } from "@/lib/supabase/client";
import { getVietnamDateString, toVietnamTimestamp } from "@/lib/datetime";
import { getSemesterForDate } from "@/lib/api/semester";

export type Status = "present" | "absent" | "excused_absence";

type AttendanceRecordRow = {
  id: string;
  studentId: string;
  date: string;
  status: Status;
  timestamp: string;
  createdById: string;
  class_id?: string | null;
  leave_request_id?: number | string | null;
  semester_id?: number | string | null;
};

export type CreateAttendanceRecordInput = {
  id: string;
  studentId: string;
  date: string;
  status: Status;
  timestamp: string;
  createdById: string;
  leaveRequestId?: string | null;
  classId: string;
  semesterId?: string | null;
};

export type AttendanceRecord = {
  id: string;
  studentId: string;
  date: string;
  status: Status;
  timestamp: string;
  createdById: string;
  leaveRequestId?: string | null;
  classId: string;
  semesterId?: string | null;
};

export type GetAttendanceRecordsInput = {
  studentId: string;
  date: string;
  semesterId?: string | null;
};

export type GetAttendanceRecordsBulkInput = {
  studentIds: string[];
  dateFrom?: string;
  dateTo?: string;
  semesterId?: string | null;
};

function toDateOnly(value: string): string {
  return value.split("T")[0];
}

function formatSupabaseError(error: {
  code?: string;
  message?: string;
}): string {
  if (error.code === "42501") {
    return "Permission denied on AttendanceRecord (RLS). Run prisma/rls-attendance-leave.sql in Supabase SQL Editor.";
  }
  return error.message ?? "Attendance record operation failed.";
}

function mapAttendanceRecordRow(row: AttendanceRecordRow): AttendanceRecord {
  return {
    id: row.id,
    studentId: row.studentId,
    date: row.date,
    status: row.status,
    timestamp: row.timestamp,
    createdById: row.createdById,
    classId: row.class_id ?? "",
    leaveRequestId:
      row.leave_request_id != null ? String(row.leave_request_id) : null,
    semesterId: row.semester_id != null ? String(row.semester_id) : null,
  };
}

function buildWritePayload(input: {
  studentId?: string;
  date?: string;
  status: Status;
  timestamp: string;
  createdById?: string;
  classId: string;
  leaveRequestId?: string | null;
  semesterId?: string | null;
  isLate?: boolean;
}) {
  const payload: Record<string, unknown> = {
    status: input.status,
    timestamp: input.timestamp,
    class_id: input.classId,
  };

  if (input.date) {
    payload.date = input.date;
  }

  if (input.studentId) {
    payload.studentId = input.studentId;
  }
  if (input.createdById) {
    payload.createdById = input.createdById;
  }
  if (input.leaveRequestId != null && input.leaveRequestId !== "") {
    payload.leave_request_id = Number(input.leaveRequestId);
  }
  if (input.semesterId != null && input.semesterId !== "") {
    payload.semester_id = Number(input.semesterId);
  }
  if (input.isLate != null) {
    payload.is_late = input.isLate;
  }

  return payload;
}

export async function resolveSemesterIdForDate(
  date: string,
): Promise<string | null> {
  const semester = await getSemesterForDate(date);
  return semester?.id ?? null;
}

export function normalizeAttendanceDate(value: string): string {
  return toDateOnly(value);
}

export async function getAttendanceRecords(
  input: GetAttendanceRecordsInput,
): Promise<AttendanceRecord[]> {
  const supabase = createClient();
  let query = supabase
    .from("AttendanceRecord")
    .select("*")
    .eq("studentId", input.studentId)
    .eq("date", input.date);

  if (input.semesterId) {
    query = query.eq("semester_id", Number(input.semesterId));
  }

  const { data, error } = await query;

  if (error) {
    console.error("getAttendanceRecords error:", error);
    throw error;
  }
  return ((data ?? []) as AttendanceRecordRow[]).map(mapAttendanceRecordRow);
}

export async function getAttendanceRecordsByStudentIds(
  input: GetAttendanceRecordsBulkInput,
): Promise<AttendanceRecord[]> {
  if (input.studentIds.length === 0) {
    return [];
  }

  const supabase = createClient();
  let query = supabase
    .from("AttendanceRecord")
    .select("*")
    .in("studentId", input.studentIds);

  if (input.dateFrom) {
    query = query.gte("date", input.dateFrom);
  }
  if (input.dateTo) {
    query = query.lte("date", input.dateTo);
  }
  if (input.semesterId) {
    query = query.eq("semester_id", Number(input.semesterId));
  }

  const { data, error } = await query.order("date", { ascending: true });

  if (error) {
    console.error("getAttendanceRecordsByStudentIds error:", error);
    throw error;
  }

  return ((data ?? []) as AttendanceRecordRow[]).map(mapAttendanceRecordRow);
}

export async function createAttendanceRecord(
  input: CreateAttendanceRecordInput,
): Promise<AttendanceRecord> {
  const supabase = createClient();
  const date = input.date ? toDateOnly(input.date) : getVietnamDateString();
  const timestamp = toVietnamTimestamp(input.timestamp, date);
  const semesterId = input.semesterId ?? (await resolveSemesterIdForDate(date));

  const { data, error } = await supabase
    .from("AttendanceRecord")
    .insert({
      id: input.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...buildWritePayload({
        studentId: input.studentId,
        date,
        status: input.status,
        timestamp,
        createdById: input.createdById,
        classId: input.classId,
        leaveRequestId: input.leaveRequestId,
        semesterId,
      }),
    })
    .select()
    .single();
  if (error) {
    console.error("createAttendanceRecord error:", error);
    throw new Error(formatSupabaseError(error));
  }
  return mapAttendanceRecordRow(data as AttendanceRecordRow);
}

export type UpdateAttendanceRecordInput = {
  id: string;
  status: Status;
  timestamp: string;
  createdById?: string;
  leaveRequestId?: string | null;
  classId: string;
  semesterId?: string | null;
  isLate?: boolean;
};

export async function updateAttendanceRecord(
  input: UpdateAttendanceRecordInput,
): Promise<AttendanceRecord> {
  const supabase = createClient();
  const timestamp = toVietnamTimestamp(input.timestamp);
  const payload = buildWritePayload({
    status: input.status,
    timestamp,
    createdById: input.createdById,
    classId: input.classId,
    leaveRequestId: input.leaveRequestId,
    semesterId: input.semesterId,
    isLate: input.isLate,
  });

  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("AttendanceRecord")
    .update(payload)
    .eq("id", input.id)
    .select()
    .single();
  if (error) {
    console.error("updateAttendanceRecord error:", error);
    throw new Error(formatSupabaseError(error));
  }
  return mapAttendanceRecordRow(data as AttendanceRecordRow);
}

export type SaveAttendanceRecordInput = {
  studentId: string;
  date?: string;
  status: Status;
  timestamp: string;
  createdById: string;
  leaveRequestId?: string | null;
  classId: string;
  semesterId?: string | null;
};

/** Tạo mới hoặc cập nhật nếu học sinh đã có bản ghi trong ngày */
export async function saveAttendanceRecord(
  input: SaveAttendanceRecordInput,
): Promise<AttendanceRecord> {
  const date = input.date ? toDateOnly(input.date) : getVietnamDateString();
  const timestamp = toVietnamTimestamp(input.timestamp, date);
  const semesterId = input.semesterId ?? (await resolveSemesterIdForDate(date));

  const existing = await getAttendanceRecords({
    studentId: input.studentId,
    date,
    semesterId,
  });

  if (existing.length > 0) {
    return updateAttendanceRecord({
      id: existing[0].id,
      status: input.status,
      timestamp,
      createdById: input.createdById,
      leaveRequestId:
        input.leaveRequestId ?? existing[0].leaveRequestId ?? null,
      classId: input.classId,
      semesterId: semesterId ?? existing[0].semesterId ?? null,
    });
  }

  return createAttendanceRecord({
    id: crypto.randomUUID(),
    studentId: input.studentId,
    date,
    status: input.status,
    timestamp,
    createdById: input.createdById,
    leaveRequestId: input.leaveRequestId ?? null,
    classId: input.classId,
    semesterId,
  });
}
