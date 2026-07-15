import { createClient } from "@/lib/supabase/client";
import { writeAuditLog, writeAuditLogSafe } from "@/lib/audit/writeAuditLog";
import {
  normalizeClassIdForAudit,
  warnMissingAudit,
} from "@/lib/audit/warnMissingAudit";
import type { AuditContext } from "@/lib/audit/types";

type CreateStudentInput = {
  name: string;
  email: string;
  username: string;
  password: string;
  qrCode: string;
  classId: string;
  isActive: boolean;
  isLocked: boolean;
  holy_name?: string;
};

type UpdateStudentInput = {
  id: string;
  name: string;
  email: string;
  username: string;
  password?: string;
  qrCode: string;
  classId: string;
  isActive: boolean;
  isLocked: boolean;
  holy_name?: string;
};

type GetStudentsOptions = {
  classId?: string;
};

type GradeRow = {
  id: string;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
};

type ClassRelation = {
  id: string;
  name: string;
  grade: GradeRow | GradeRow[] | null;
};

type AttendanceRecordRow = {
  id: string;
  date: string;
  status: string;
  timestamp: string;
  createdById: string;
};

export type StudentAttendanceItem = {
  id: string;
  date: string;
  status: string;
  timestamp: string;
  createdById: string;
  createdByName: string;
  isLate?: boolean | null;
  leaveRequestId?: string | null;
};

type StudentRow = {
  id: string;
  name: string;
  holy_name?: string;
  email: string;
  username: string;
  role: string;
  qrCode: string;
  isActive: boolean;
  isDeleted: boolean;
  isLocked: boolean;
  classId: string;
  createdAt: string;
  updatedAt: string;
  class: ClassRelation | ClassRelation[] | null;
  studentAttendance: {
    id: string;
    date: string;
    status: string;
    timestamp: string;
    createdById: string;
    is_late?: boolean | null;
    leave_request_id?: number | string | null;
  }[];
};

export type StudentRecord = Omit<StudentRow, "class" | "studentAttendance"> & {
  createdAt: string;
  updatedAt: string;
  class: {
    id: string;
    name: string;
    grade: GradeRow | null;
  } | null;
  studentAttendance: StudentAttendanceItem[];
  attendance: AttendanceRecordRow[];
};

export type SaveStudentInput = {
  id?: string;
  name: string;
  holy_name?: string;
  email: string;
  username: string;
  password?: string;
  qrCode: string;
  classId: string;
  isActive: boolean;
  isLocked: boolean;
};

const studentSelect = `id, name, holy_name, email, username, role, qrCode, isActive, isDeleted, isLocked, classId, createdAt, updatedAt,
  class:Class(id, name, grade:Grade(id, name, description, color, isActive))`;

const studentAttendanceSelect =
  "studentAttendance:AttendanceRecord!studentId(id, date, status, timestamp, createdById, is_late, leave_request_id)";

async function fetchCreatorNames(
  creatorIds: string[],
): Promise<Map<string, string>> {
  if (creatorIds.length === 0) return new Map();

  const supabase = createClient();
  const { data, error } = await supabase
    .from("User")
    .select("id, name")
    .in("id", creatorIds);

  if (error || !data) {
    console.warn("fetchCreatorNames failed:", error?.message);
    return new Map();
  }

  return new Map(data.map((user) => [user.id, user.name]));
}

async function enrichStudentRecordCreators(
  record: StudentRecord,
): Promise<StudentRecord> {
  const creatorIds = [
    ...new Set(
      record.studentAttendance
        .map((attendance) => attendance.createdById)
        .filter(Boolean),
    ),
  ];

  const nameById = await fetchCreatorNames(creatorIds);
  if (nameById.size === 0) return record;

  const studentAttendance = record.studentAttendance.map((attendance) => ({
    ...attendance,
    createdByName:
      nameById.get(attendance.createdById) ?? attendance.createdByName,
  }));

  return {
    ...record,
    studentAttendance,
    attendance: studentAttendance.map(
      ({ id, date, status, timestamp, createdById }) => ({
        id,
        date,
        status,
        timestamp,
        createdById,
      }),
    ),
  };
}

function normalizeClass(
  classValue: ClassRelation | ClassRelation[] | null | undefined,
): StudentRecord["class"] {
  const row = Array.isArray(classValue) ? classValue[0] : classValue;
  if (!row) return null;

  const grade = Array.isArray(row.grade) ? (row.grade[0] ?? null) : row.grade;

  return {
    id: row.id,
    name: row.name,
    grade,
  };
}

function mapStudentAttendance(
  items: StudentRow["studentAttendance"] | undefined,
): StudentAttendanceItem[] {
  return (items ?? []).map((attendance) => ({
    id: attendance.id,
    date: attendance.date,
    status: attendance.status,
    timestamp: attendance.timestamp,
    createdById: attendance.createdById,
    createdByName: "Unknown",
    isLate: attendance.is_late ?? null,
    leaveRequestId:
      attendance.leave_request_id != null
        ? String(attendance.leave_request_id)
        : null,
  }));
}

function mapStudentRow(student: StudentRow): StudentRecord {
  const studentAttendance = mapStudentAttendance(student.studentAttendance);

  return {
    ...student,
    class: normalizeClass(student.class),
    studentAttendance,
    attendance: studentAttendance.map(
      ({ id, date, status, timestamp, createdById }) => ({
        id,
        date,
        status,
        timestamp,
        createdById,
      }),
    ),
  };
}

export async function getStudentById(
  id: string,
): Promise<StudentRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("User")
    .select(`${studentSelect}, ${studentAttendanceSelect}`)
    .eq("id", id)
    .eq("role", "student")
    .or("isDeleted.eq.false,isDeleted.is.null")
    .maybeSingle();

  if (error) {
    console.error("getStudentById error:", error);
    throw error;
  }

  if (!data) return null;
  return enrichStudentRecordCreators(
    mapStudentRow(data as unknown as StudentRow),
  );
}

export async function getStudents(
  options?: GetStudentsOptions,
): Promise<StudentRecord[]> {
  const supabase = createClient();

  const buildQuery = (select: string) => {
    let query = supabase
      .from("User")
      .select(select)
      .eq("role", "student")
      .or("isDeleted.eq.false,isDeleted.is.null")
      .order("name", { ascending: true });

    if (options?.classId) {
      query = query.eq("classId", options.classId);
    }

    return query.order("name");
  };

  let { data, error } = await buildQuery(
    `${studentSelect}, ${studentAttendanceSelect}`,
  );

  if (error) {
    console.warn(
      "getStudents attendance embed failed, retrying without:",
      error.message,
    );
    const fallback = await buildQuery(
      `${studentSelect}, ${studentAttendanceSelect}`,
    );
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("getStudents error:", error);
    throw error;
  }

  return ((data ?? []) as unknown as StudentRow[]).map(mapStudentRow);
}

export async function getStudentsForAttendance(
  options?: GetStudentsOptions,
): Promise<StudentRecord[]> {
  const supabase = createClient();

  const buildQuery = (select: string) => {
    let query = supabase
      .from("User")
      .select(select)
      .eq("role", "student")
      .eq("isActive", true)
      .eq("isDeleted", false)
      .eq("isLocked", false)
      .order("name", { ascending: true });

    if (options?.classId) {
      query = query.eq("classId", options.classId);
    }

    return query.order("name");
  };

  let { data, error } = await buildQuery(
    `${studentSelect}, ${studentAttendanceSelect}`,
  );

  if (error) {
    console.warn(
      "getStudents attendance embed failed, retrying without:",
      error.message,
    );
    const fallback = await buildQuery(
      `${studentSelect}, ${studentAttendanceSelect}`,
    );
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("getStudents error:", error);
    throw error;
  }

  return ((data ?? []) as unknown as StudentRow[]).map(mapStudentRow);
}

export async function createStudent(
  student: CreateStudentInput,
  audit?: AuditContext,
): Promise<StudentRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("User")
    .insert({
      id: crypto.randomUUID(),
      name: student.name,
      holy_name: student.holy_name,
      email: student.email.trim().toLowerCase(),
      username: student.username.trim(),
      password: student.password,
      role: "student",
      qrCode: student.qrCode,
      isActive: true,
      isDeleted: false,
      isLocked: false,
      classId: student.classId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .select(studentSelect)
    .single();

  if (error) {
    console.error("createStudent error:", error);
    throw error;
  }

  const result = mapStudentRow(data as unknown as StudentRow);
  if (audit) {
    await writeAuditLog({
      ...audit,
      action: "CREATE",
      entity: "User",
      entityId: result.id,
      classId: normalizeClassIdForAudit(result.classId),
      newValue: result,
    });
  } else {
    warnMissingAudit("createStudent");
  }
  return result;
}

export async function updateStudent(
  student: UpdateStudentInput,
  audit?: AuditContext,
): Promise<StudentRecord> {
  const oldValue = audit ? await getStudentById(student.id) : null;
  const supabase = createClient();
  const payload: Record<string, string | boolean> = {
    name: student.name,
    holy_name: student.holy_name,
    email: student.email.trim().toLowerCase(),
    username: student.username.trim(),
    qrCode: student.qrCode,
    classId: student.classId,
    isActive: student.isActive ? true : false,
    isLocked: student.isLocked ? true : false,
    updatedAt: new Date().toISOString(),
  };

  if (student.password) {
    payload.password = student.password;
  }

  const { data, error } = await supabase
    .from("User")
    .update(payload)
    .eq("id", student.id)
    .select(studentSelect)
    .single();

  if (error) {
    console.error("updateStudent error:", error);
    throw error;
  }

  const result = mapStudentRow(data as unknown as StudentRow);
  if (audit) {
    await writeAuditLog({
      ...audit,
      action: "UPDATE",
      entity: "User",
      entityId: result.id,
      classId: normalizeClassIdForAudit(result.classId),
      oldValue: oldValue ?? undefined,
      newValue: result,
    });
  } else {
    warnMissingAudit("updateStudent");
  }
  return result;
}

export async function saveStudent(
  input: SaveStudentInput,
  audit?: AuditContext,
): Promise<StudentRecord> {
  if (input.id) {
    const existing = await getStudentById(input.id);
    if (existing) {
      return updateStudent(
        {
          id: input.id,
          name: input.name,
          holy_name: input.holy_name,
          email: input.email,
          username: input.username,
          password: input.password,
          qrCode: input.qrCode,
          classId: input.classId,
          isActive: input.isActive,
          isLocked: input.isLocked,
        },
        audit,
      );
    }
  }

  const password =
    input.password ??
    Array.from({ length: 8 }, () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(
        Math.floor(Math.random() * 62),
      ),
    ).join("");

  return createStudent(
    {
      name: input.name,
      holy_name: input.holy_name,
      email: input.email,
      username: input.username,
      password,
      qrCode: input.qrCode,
      classId: input.classId,
      isActive: input.isActive,
      isLocked: input.isLocked,
    } as CreateStudentInput,
    audit,
  );
}

/** @deprecated Use saveStudent for single-student upsert */
export async function saveStudents(input: {
  classId: string;
  students: Pick<
    StudentRow,
    | "id"
    | "name"
    | "holy_name"
    | "email"
    | "qrCode"
    | "username"
    | "isActive"
    | "isLocked"
  >[];
}): Promise<StudentRecord[]> {
  return Promise.all(
    input.students.map((student) =>
      saveStudent({
        id: student.id,
        name: student.name,
        holy_name: student.holy_name,
        email: student.email,
        username: student.username,
        password: "",
        qrCode: student.qrCode,
        classId: input.classId,
        isActive: student.isActive,
        isLocked: student.isLocked,
      }),
    ),
  );
}

/** @deprecated Use createStudent */
export const CreateStudent = createStudent;

export async function importStudents(
  students: CreateStudentInput[],
  audit?: AuditContext,
): Promise<StudentRecord[]> {
  const results: StudentRecord[] = [];

  for (const student of students) {
    results.push(await createStudent(student, audit));
  }

  return results;
}

/**
 * Delete a student by ID
 * @param id - The ID of the student to delete
 * @returns The deleted student
 */
export async function deleteStudentById(
  id: string,
  audit?: AuditContext,
): Promise<StudentRecord> {
  const oldValue = audit ? await getStudentById(id) : null;
  const supabase = createClient();
  const payload: Record<string, string | boolean> = {
    isDeleted: true.toString(),
    isActive: false,
    isLocked: false,
    updatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("User")
    .update(payload)
    .eq("id", id)
    .select(studentSelect)
    .single();

  if (error) {
    console.error("deleteStudentById error:", error);
    throw error;
  }

  const result = mapStudentRow(data as unknown as StudentRow);
  if (audit) {
    await writeAuditLog({
      ...audit,
      action: "DELETE",
      entity: "User",
      entityId: result.id,
      classId: normalizeClassIdForAudit(result.classId),
      oldValue: oldValue ?? undefined,
      newValue: result,
    });
  } else {
    warnMissingAudit("deleteStudentById");
  }
  return result;
}

async function patchStudentFlags(
  id: string,
  flags: Partial<Pick<StudentRow, "isActive" | "isLocked" | "isDeleted">>,
  audit?: AuditContext,
  auditAction?: "LOCK" | "ACTIVATE",
): Promise<StudentRecord> {
  const oldValue = audit ? await getStudentById(id) : null;
  const supabase = createClient();
  const payload: Record<string, string | boolean> = {
    ...flags,
    updatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("User")
    .update(payload)
    .eq("id", id)
    .select(studentSelect)
    .single();

  if (error) {
    console.error("patchStudentFlags error:", error);
    throw error;
  }

  const result = mapStudentRow(data as unknown as StudentRow);
  if (audit && auditAction) {
    await writeAuditLog({
      ...audit,
      action: auditAction,
      entity: "User",
      entityId: result.id,
      classId: normalizeClassIdForAudit(result.classId),
      oldValue: oldValue ?? undefined,
      newValue: result,
    });
  } else if (!audit) {
    warnMissingAudit("patchStudentFlags");
  }
  return result;
}

export async function deactivateStudentById(
  id: string,
  audit?: AuditContext,
): Promise<StudentRecord> {
  const existing = await getStudentById(id);
  if (!existing) throw new Error("Student not found");
  return patchStudentFlags(
    id,
    { isActive: !existing.isActive },
    audit,
    "ACTIVATE",
  );
}

export async function lockStudentById(
  id: string,
  audit?: AuditContext,
): Promise<StudentRecord> {
  const existing = await getStudentById(id);
  if (!existing) throw new Error("Student not found");
  return patchStudentFlags(id, { isLocked: !existing.isLocked }, audit, "LOCK");
}

async function fetchStudentAttendanceByStudentId(
  studentId: string,
): Promise<StudentRow["studentAttendance"]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("AttendanceRecord")
    .select(
      "id, date, status, timestamp, createdById, is_late, leave_request_id",
    )
    .eq("studentId", studentId)
    .eq("isActive", true)
    .eq("isDeleted", false)
    .eq("isLocked", false)
    .order("date", { ascending: false });

  if (error) {
    console.error("fetchStudentAttendanceByStudentId error:", error);
    return [];
  }

  return (data ?? []) as StudentRow["studentAttendance"];
}

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

type StudentLookupResult = {
  row: StudentRow | null;
  error: Error | null;
};

async function findStudentByLookup(
  lookup: string,
  select: string,
  options?: { classId?: string },
): Promise<StudentLookupResult> {
  const supabase = createClient();
  const trimmed = lookup.trim();
  if (!trimmed) return { row: null, error: null };

  const buildBaseQuery = () => {
    let query = supabase
      .from("User")
      .select(select)
      .eq("role", "student")
      .or(
        "isDeleted.eq.false,isDeleted.is.null,isActive.eq.true,isActive.is.null,isLocked.eq.false,isLocked.is.null",
      );

    if (options?.classId) {
      query = query.eq("classId", options.classId);
    }

    return query;
  };

  const { data: qrMatch, error: qrError } = await buildBaseQuery()
    .eq("qrCode", trimmed)
    .maybeSingle();

  if (qrError) {
    return { row: null, error: qrError as Error };
  }
  if (qrMatch) {
    return { row: qrMatch as unknown as StudentRow, error: null };
  }

  const { data: idMatch, error: idError } = await buildBaseQuery()
    .eq("id", trimmed)
    .maybeSingle();

  if (idError) {
    return { row: null, error: idError as Error };
  }
  if (idMatch) {
    return { row: idMatch as unknown as StudentRow, error: null };
  }

  const { data: exactNameMatch, error: exactNameError } = await buildBaseQuery()
    .ilike("name", trimmed)
    .maybeSingle();

  if (exactNameError) {
    return { row: null, error: exactNameError as Error };
  }
  if (exactNameMatch) {
    return { row: exactNameMatch as unknown as StudentRow, error: null };
  }

  const { data: partialMatches, error: partialNameError } =
    await buildBaseQuery()
      .ilike("name", `%${escapeIlikePattern(trimmed)}%`)
      .order("name", { ascending: true })
      .limit(1);

  if (partialNameError) {
    return { row: null, error: partialNameError as Error };
  }

  const row =
    (partialMatches?.[0] as unknown as StudentRow | undefined) ?? null;
  return { row, error: null };
}

export type GetStudentAttendanceByCodeOptions = {
  classId?: string;
};

export async function getStudentAttendanceByCode(
  lookup: string,
  options?: GetStudentAttendanceByCodeOptions,
): Promise<StudentRecord | null> {
  const trimmed = lookup.trim();
  if (!trimmed) return null;

  let { row, error: queryError } = await findStudentByLookup(
    trimmed,
    `${studentSelect}, ${studentAttendanceSelect}`,
    options,
  );

  if (queryError) {
    console.warn(
      "getStudentAttendanceByCode embed failed, loading attendance separately:",
      queryError.message,
    );

    const studentOnly = await findStudentByLookup(
      trimmed,
      studentSelect,
      options,
    );
    queryError = studentOnly.error;

    if (studentOnly.row) {
      row = {
        ...studentOnly.row,
        studentAttendance: await fetchStudentAttendanceByStudentId(
          studentOnly.row.id,
        ),
      };
    } else {
      row = null;
    }
  }

  if (queryError) {
    console.error("getStudentAttendanceByCode error:", queryError);
    throw queryError;
  }

  if (!row) return null;
  return enrichStudentRecordCreators(mapStudentRow(row));
}
