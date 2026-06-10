import { createClient } from "@/lib/supabase/client";

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

type StudentRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  qrCode: string;
  isActive: boolean;
  isDeleted: boolean;
  isLocked: boolean;
  classId: string;
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
  class: {
    id: string;
    name: string;
    grade: GradeRow | null;
  } | null;
};

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

export async function getStudents(
  options?: GetStudentsOptions,
): Promise<StudentRecord[]> {
  const supabase = createClient();

  const baseSelect = `id, name, email, role, qrCode, isActive, isDeleted, isLocked, classId,
    class:Class(id, name, grade:Grade(id, name, description, color, isActive))`;

  const buildQuery = (select: string) => {
    let query = supabase
      .from("User")
      .select(select)
      .eq("role", "student")
      .or("isDeleted.eq.false,isDeleted.is.null");

    if (options?.classId) {
      query = query.eq("classId", options.classId);
    }

    return query.order("name");
  };

  let { data, error } = await buildQuery(
    `${baseSelect}, studentAttendance:AttendanceRecord!studentId(id, date, status, timestamp, createdById)`,
  );

  // Fallback nếu embed attendance gây lỗi (2 FK tới User)
  if (error) {
    console.warn(
      "getStudents attendance embed failed, retrying without:",
      error.message,
    );
    const fallback = await buildQuery(baseSelect);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("getStudents error:", error);
    throw error;
  }

  return ((data ?? []) as unknown as StudentRow[]).map((student) => ({
    ...student,
    class: normalizeClass(student.class),
    studentAttendance: student.studentAttendance ?? [],
  }));
}
