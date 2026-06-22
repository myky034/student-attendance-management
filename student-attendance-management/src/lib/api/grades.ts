import { createClient } from "../supabase/client";

export type GradeOption = {
  id: string;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
};

type GradeRow = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isActive: boolean | null;
};

const gradeSelect = "id, name, description, color, isActive";

export function mapGradeRow(row: GradeRow): GradeOption {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    color: row.color ?? "",
    isActive: row.isActive ?? true,
  };
}

export async function getGrades(): Promise<GradeOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Grade")
    .select(gradeSelect)
    .eq("isActive", true)
    .order("name");

  if (error) {
    console.error("getGrades error:", error);
    throw error;
  }

  return ((data ?? []) as GradeRow[]).map(mapGradeRow);
}
