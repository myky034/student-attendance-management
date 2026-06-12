import { createClient } from "@/lib/supabase/client";

type CreateStudentInput = {
  name: string;
  email: string;
  username: string;
  password: string;
  qrCode: string;
  classId: string;
};

type UpdateStudentInput = {
  id: string;
  name: string;
  email: string;
  username: string;
  password?: string;
  qrCode: string;
  classId: string;
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

type StudentRow = {
  id: string;
  name: string;
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
  }[];
};

export type StudentRecord = Omit<StudentRow, "class"> & {
  createdAt: string;
  updatedAt: string;
  class: {
    id: string;
    name: string;
    grade: GradeRow | null;
  } | null;
  attendance: AttendanceRecordRow[];
};

export type SaveStudentInput = {
  id?: string;
  name: string;
  email: string;
  username: string;
  password?: string;
  qrCode: string;
  classId: string;
};

const studentSelect = `id, name, email, username, role, qrCode, isActive, isDeleted, isLocked, classId, createdAt, updatedAt,
  class:Class(id, name, grade:Grade(id, name, description, color, isActive))`;

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

function mapStudentRow(student: StudentRow): StudentRecord {
  return {
    ...student,
    class: normalizeClass(student.class),
    studentAttendance: student.studentAttendance ?? [],
    attendance: student.studentAttendance ?? [],
  };
}

export async function getStudentById(
  id: string,
): Promise<StudentRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("User")
    .select(studentSelect)
    .eq("id", id)
    .eq("role", "student")
    .or("isDeleted.eq.false,isDeleted.is.null")
    .maybeSingle();

  if (error) {
    console.error("getStudentById error:", error);
    throw error;
  }

  if (!data) return null;
  return mapStudentRow(data as unknown as StudentRow);
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
    `${studentSelect}, studentAttendance:AttendanceRecord!studentId(id, date, status, timestamp, createdById)`,
  );

  if (error) {
    console.warn(
      "getStudents attendance embed failed, retrying without:",
      error.message,
    );
    const fallback = await buildQuery(studentSelect);
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
): Promise<StudentRecord> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("User")
    .insert({
      id: crypto.randomUUID(),
      name: student.name,
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

  return mapStudentRow(data as unknown as StudentRow);
}

export async function updateStudent(
  student: UpdateStudentInput,
): Promise<StudentRecord> {
  const supabase = createClient();
  const payload: Record<string, string> = {
    name: student.name,
    email: student.email.trim().toLowerCase(),
    username: student.username.trim(),
    qrCode: student.qrCode,
    classId: student.classId,
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

  return mapStudentRow(data as unknown as StudentRow);
}

export async function saveStudent(
  input: SaveStudentInput,
): Promise<StudentRecord> {
  if (input.id) {
    const existing = await getStudentById(input.id);
    if (existing) {
      return updateStudent({
        id: input.id,
        name: input.name,
        email: input.email,
        username: input.username,
        password: input.password,
        qrCode: input.qrCode,
        classId: input.classId,
      });
    }
  }

  const password =
    input.password ??
    Array.from({ length: 8 }, () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(
        Math.floor(Math.random() * 62),
      ),
    ).join("");

  return createStudent({
    name: input.name,
    email: input.email,
    username: input.username,
    password,
    qrCode: input.qrCode,
    classId: input.classId,
  });
}

/** @deprecated Use saveStudent for single-student upsert */
export async function saveStudents(input: {
  classId: string;
  students: Pick<StudentRow, "id" | "name" | "email" | "qrCode" | "username">[];
}): Promise<StudentRecord[]> {
  return Promise.all(
    input.students.map((student) =>
      saveStudent({
        id: student.id,
        name: student.name,
        email: student.email,
        username: student.username,
        password: "",
        qrCode: student.qrCode,
        classId: input.classId,
      }),
    ),
  );
}

/** @deprecated Use createStudent */
export const CreateStudent = createStudent;

export async function importStudents(
  students: CreateStudentInput[],
): Promise<StudentRecord[]> {
  const results: StudentRecord[] = [];

  for (const student of students) {
    results.push(await createStudent(student));
  }

  return results;
}

/**
 * Delete a student by ID
 * @param id - The ID of the student to delete
 * @returns The deleted student
 */
export async function deleteStudentById(id: string): Promise<StudentRecord> {
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

  return mapStudentRow(data as unknown as StudentRow);
}
