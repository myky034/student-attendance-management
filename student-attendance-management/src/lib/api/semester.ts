import { createClient } from "@/lib/supabase/client";

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

const semesterSelect =
  "id, name, code, start_date, end_date, sort_order, is_active, academic_year_id, created_at, update_at";

/** Supabase table: `Semester` */
export async function getSemesters(): Promise<Semester[]> {
  const supabase = createClient();
  const { data: Semester, error } = await supabase
    .from("Semester")
    .select(semesterSelect)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("getSemesters error:", error);
    throw error;
  }

  return ((Semester ?? []) as SemesterRow[]).map(mapSemesterRow);
}

export async function createSemester(
  semester: Omit<Semester, "createdAt" | "updatedAt">,
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

export async function updateSemester(semester: Semester): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
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
    .eq("id", Number(semester.id));
  if (error) {
    console.error("updateSemester error:", error);
    throw error;
  }
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
