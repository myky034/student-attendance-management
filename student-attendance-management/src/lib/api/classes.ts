import { createClient } from "../supabase/client";

export type ClassOption = {
  id: string;
  name: string;
  grade: { id: string; name: string } | null;
};

type ClassRow = {
  id: string;
  name: string;
  grade: { id: string; name: string } | { id: string; name: string }[] | null;
};

/** Get all classes from the database */
export async function getClasses(): Promise<ClassOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Class")
    .select("id, name, grade:Grade(id, name)")
    .order("name");

  if (error) {
    throw error;
  }

  return ((data ?? []) as ClassRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    grade: Array.isArray(row.grade) ? (row.grade[0] ?? null) : row.grade,
  }));
}
