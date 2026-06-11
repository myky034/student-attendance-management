import { createClient } from "@/lib/supabase/client";
import { getVietnamDateString, toVietnamTimestamp } from "@/lib/datetime";

export type Status = "present" | "absent" | "excused_absence";

export type CreateAttendanceRecordInput = {
  id: string;
  studentId: string;
  date: string;
  status: Status;
  timestamp: string;
  createdById: string;
};

export type AttendanceRecord = {
  id: string;
  studentId: string;
  date: string;
  status: Status;
  timestamp: string;
  createdById: string;
};

export type GetAttendanceRecordsInput = {
  studentId: string;
  date: string;
};

function toDateOnly(value: string): string {
  return value.split("T")[0];
}

export async function getAttendanceRecords(
  input: GetAttendanceRecordsInput,
): Promise<AttendanceRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("AttendanceRecord")
    .select("*")
    .eq("studentId", input.studentId)
    .eq("date", input.date);

  if (error) {
    console.error("getAttendanceRecords error:", error);
    throw error;
  }
  return data as AttendanceRecord[];
}

export async function createAttendanceRecord(
  input: CreateAttendanceRecordInput,
): Promise<AttendanceRecord> {
  const supabase = createClient();
  const date = input.date ? toDateOnly(input.date) : getVietnamDateString();
  const timestamp = toVietnamTimestamp(input.timestamp, date);
  const { data, error } = await supabase
    .from("AttendanceRecord")
    .insert({
      id: input.id,
      studentId: input.studentId,
      date,
      status: input.status,
      timestamp,
      createdById: input.createdById,
    })
    .select()
    .single();
  if (error) {
    console.error("createAttendanceRecord error:", error);
    throw error;
  }
  return data as AttendanceRecord;
}

export type UpdateAttendanceRecordInput = {
  id: string;
  status: Status;
  timestamp: string;
  createdById?: string;
};

export async function updateAttendanceRecord(
  input: UpdateAttendanceRecordInput,
): Promise<AttendanceRecord> {
  const supabase = createClient();
  const timestamp = toVietnamTimestamp(input.timestamp);
  const payload: {
    status: Status;
    timestamp: string;
    createdById?: string;
  } = {
    status: input.status,
    timestamp,
  };
  if (input.createdById) {
    payload.createdById = input.createdById;
  }
  const { data, error } = await supabase
    .from("AttendanceRecord")
    .update(payload)
    .eq("id", input.id)
    .select()
    .single();
  if (error) {
    console.error("updateAttendanceRecord error:", error);
    throw error;
  }
  return data as AttendanceRecord;
}

export type SaveAttendanceRecordInput = {
  studentId: string;
  date?: string;
  status: Status;
  timestamp: string;
  createdById: string;
};

/** Tạo mới hoặc cập nhật nếu học sinh đã có bản ghi trong ngày */
export async function saveAttendanceRecord(
  input: SaveAttendanceRecordInput,
): Promise<AttendanceRecord> {
  const date = input.date ? toDateOnly(input.date) : getVietnamDateString();
  const timestamp = toVietnamTimestamp(input.timestamp, date);

  const existing = await getAttendanceRecords({
    studentId: input.studentId,
    date,
  });

  if (existing.length > 0) {
    return updateAttendanceRecord({
      id: existing[0].id,
      status: input.status,
      timestamp,
      createdById: input.createdById,
    });
  }

  return createAttendanceRecord({
    id: crypto.randomUUID(),
    studentId: input.studentId,
    date,
    status: input.status,
    timestamp,
    createdById: input.createdById,
  });
}
