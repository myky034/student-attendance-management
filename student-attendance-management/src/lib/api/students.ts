import { createClient } from "@/lib/supabase/client";

export async function getStudents() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("students")
    .select("*, attendance(*)");

  if (error) {
    throw error;
  }

  return data ?? [];
}
