import { createClient } from "@/lib/supabase/client";

type AttendancePeriodConfigRow = {
  id: number | string;
  name: string | null;
  start_date: string | null;
  end_date: string | null;
  semester_id: number | string | null;
  type: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string | null;
};

export type AttendancePeriodConfig = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  semesterId: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapAttendancePeriodConfigRow(
  row: AttendancePeriodConfigRow,
): AttendancePeriodConfig {
  return {
    id: String(row.id),
    name: row.name ?? "",
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    semesterId: row.semester_id != null ? String(row.semester_id) : "",
    type: row.type ?? "",
    isActive: row.is_active ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

const attendancePeriodConfigSelect = `
    id,
    name,
    start_date,
    end_date,
    semester_id,
    type,
    is_active,
    created_at,
    updated_at
`;

export async function getAttendancePeriodConfigs(): Promise<
  AttendancePeriodConfig[]
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("AttendancePeriodConfig")
    .select(attendancePeriodConfigSelect)
    .order("semester_id", { ascending: true })
    .order("type", { ascending: true });
  if (error) {
    console.error("getAttendancePeriodConfigs error:", error);
    throw error;
  }
  return ((data ?? []) as AttendancePeriodConfigRow[]).map(
    mapAttendancePeriodConfigRow,
  );
}

export async function getAttendancePeriodConfigById(
  id: string,
): Promise<AttendancePeriodConfig | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("AttendancePeriodConfig")
    .select(attendancePeriodConfigSelect)
    .eq("id", id)
    .single();
  if (error) {
    console.error("getAttendancePeriodConfigById error:", error);
    throw error;
  }
  return data
    ? mapAttendancePeriodConfigRow(data as unknown as AttendancePeriodConfigRow)
    : null;
}
