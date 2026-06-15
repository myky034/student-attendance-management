import { createClient } from "@/lib/supabase/client";

type AcademicYearRow = {
  id: number | string;
  name: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
  created_at: string;
  update_at: string | null;
};

export type AcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapAcademicYearRow(row: AcademicYearRow): AcademicYear {
  return {
    id: String(row.id),
    name: row.name ?? "",
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    isActive: row.is_active ?? false,
    createdAt: row.created_at,
    updatedAt: row.update_at ?? row.created_at,
  };
}

const academicYearSelect =
  "id, name, start_date, end_date, is_active, created_at, update_at";

/** Supabase table: `AcademicYear` */
export async function getAcademicYears(): Promise<AcademicYear[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("AcademicYear")
    .select(academicYearSelect)
    .order("start_date", { ascending: false });

  if (error) {
    console.error("getAcademicYears error:", error);
    throw error;
  }

  return ((data ?? []) as AcademicYearRow[]).map(mapAcademicYearRow);
}
