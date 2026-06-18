import { createClient } from "../supabase/client";

export type ClassOption = {
  id: string;
  name: string;
  grade: { id: string; name: string } | null;
  isSpecialClass: boolean;
};

type ClassRow = {
  id: string;
  name: string;
  is_special_class: boolean | null;
  grade: { id: string; name: string } | { id: string; name: string }[] | null;
};

const classSelect = "id, name, is_special_class, grade:Grade(id, name)";

export function mapClassRow(row: ClassRow): ClassOption {
  const grade = Array.isArray(row.grade) ? (row.grade[0] ?? null) : row.grade;
  return {
    id: row.id,
    name: row.name,
    grade,
    isSpecialClass: row.is_special_class === true,
  };
}

/** Get all classes from the database */
export async function getClasses(): Promise<ClassOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Class")
    .select(classSelect)
    .order("name");

  if (error) {
    throw error;
  }

  return ((data ?? []) as ClassRow[]).map(mapClassRow);
}

export async function getClassNameById(id: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Class")
    .select(classSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;
  return mapClassRow(data as unknown as ClassRow).name;
}

export async function getClassById(id: string): Promise<ClassOption | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Class")
    .select(classSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;
  return mapClassRow(data as unknown as ClassRow);
}
