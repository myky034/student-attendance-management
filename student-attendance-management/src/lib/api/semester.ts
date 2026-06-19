import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

type SemesterRow = {
  id: number | string;
  name: string;
  code: string | null;
  start_date: string | null;
  end_date: string | null;
  sort_order: number | string | null;
  is_active: boolean | null;
  academic_year_id: number | string | null;
  created_at: string;
  update_at: string | null;
};

export type Semester = {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  sortOrder: number;
  isActive: boolean;
  academicYearId: string;
  createdAt: string;
  updatedAt: string;
};

function mapSemesterRow(row: SemesterRow): Semester {
  return {
    id: String(row.id),
    name: row.name,
    code: row.code ?? "",
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    sortOrder: Number(row.sort_order ?? 0),
    isActive: row.is_active ?? false,
    academicYearId:
      row.academic_year_id != null ? String(row.academic_year_id) : "",
    createdAt: row.created_at,
    updatedAt: row.update_at ?? row.created_at,
  };
}

export type CreateSemesterInput = {
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  sortOrder: number;
  isActive: boolean;
  academicYearId: string;
};

export type UpdateSemesterInput = {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  sortOrder: number;
  isActive: boolean;
  academicYearId: string;
};

export type SaveSemesterInput = {
  id?: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  sortOrder: number;
  isActive: boolean;
  academicYearId: string;
};

const semesterSelect =
  "id, name, code, start_date, end_date, sort_order, is_active, academic_year_id, created_at, update_at";

/** Supabase table: `Semester` */
export async function getSemesters(): Promise<Semester[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Semester")
    .select(semesterSelect)
    .order("academic_year_id", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("getSemesters error:", error);
    throw error;
  }

  return ((data ?? []) as SemesterRow[]).map(mapSemesterRow);
}

function toDateOnly(value: string): string {
  return value.split("T")[0];
}

export function findSemesterForDate(
  semesters: Semester[],
  date: string,
): Semester | null {
  const target = toDateOnly(date);
  const matches = semesters
    .filter((semester) => {
      if (!semester.isActive) return false;
      if (!semester.startDate || !semester.endDate) return false;
      const start = toDateOnly(semester.startDate);
      const end = toDateOnly(semester.endDate);
      return target >= start && target <= end;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return matches[0] ?? null;
}

export async function getSemesterById(id: string): Promise<Semester | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Semester")
    .select(semesterSelect)
    .eq("id", Number(id))
    .maybeSingle();
  if (error) {
    console.error("getSemesterById error:", error);
    throw error;
  }
  return data ? mapSemesterRow(data as SemesterRow) : null;
}

export async function getSemesterForDate(date: string): Promise<Semester | null> {
  const semesters = await getSemesters();
  return findSemesterForDate(semesters, date);
}

export async function getSemesterGreaterThanCurrent(
  currentDate: Date,
): Promise<Semester[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Semester")
    .select(semesterSelect)
    .gt("start_date", format(currentDate, "yyyy-MM-dd"))
    .order("start_date", { ascending: true });
  if (error) {
    console.error("getSemesterGreaterThanCurrent error:", error);
    throw error;
  }
  return ((data ?? []) as SemesterRow[]).map(mapSemesterRow);
}

export async function createSemester(
  semester: CreateSemesterInput,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("Semester").insert({
    name: semester.name,
    code: semester.code,
    start_date: semester.startDate,
    end_date: semester.endDate,
    sort_order: semester.sortOrder,
    is_active: semester.isActive,
    academic_year_id: semester.academicYearId
      ? Number(semester.academicYearId)
      : null,
    update_at: new Date().toISOString(),
  });
  if (error) {
    console.error("createSemester error:", error);
    throw error;
  }
}

export async function updateSemester(
  semester: UpdateSemesterInput,
): Promise<Semester> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Semester")
    .update({
      name: semester.name,
      code: semester.code,
      start_date: semester.startDate,
      end_date: semester.endDate,
      sort_order: semester.sortOrder,
      is_active: semester.isActive,
      academic_year_id: semester.academicYearId
        ? Number(semester.academicYearId)
        : null,
      update_at: new Date().toISOString(),
    })
    .eq("id", Number(semester.id))
    .select(semesterSelect)
    .single();
  if (error) {
    console.error("updateSemester error:", error);
    throw error;
  }
  if (!data) {
    throw new Error("Semester not found");
  }
  return mapSemesterRow(data);
}

export async function saveSemester(
  semester: SaveSemesterInput,
): Promise<Semester> {
  if (semester.id) {
    const existing = await getSemesterById(semester.id);
    if (!existing) {
      throw new Error("Semester not found");
    }
    return updateSemester({
      ...semester,
      isActive: existing.isActive,
    } as UpdateSemesterInput);
  }
  return createSemester(semester as CreateSemesterInput) as unknown as Semester;
}

export async function deleteSemester(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("Semester")
    .delete()
    .eq("id", Number(id));
  if (error) {
    console.error("deleteSemester error:", error);
    throw error;
  }
}

export async function toggleSemesterStatus(
  semester: UpdateSemesterInput,
): Promise<Semester> {
  return updateSemester({
    ...semester,
    isActive: !semester.isActive,
  } as UpdateSemesterInput);
}
