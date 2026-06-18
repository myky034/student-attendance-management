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

export type CreateAttendancePeriodConfigInput = {
  name: string;
  startDate: string;
  endDate: string;
  semesterId: string;
  type: string;
  isActive: boolean;
};

export type UpdateAttendancePeriodConfigInput = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  semesterId: string;
  type: string;
  isActive: boolean;
};

export type SaveAttendancePeriodConfigInput = {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  semesterId: string;
  type: string;
  isActive: boolean;
};

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

export async function getActiveAttendancePeriodConfigsByType(
  type: "sunday" | "regular",
): Promise<AttendancePeriodConfig[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("AttendancePeriodConfig")
    .select(attendancePeriodConfigSelect)
    .eq("type", type)
    .eq("is_active", true)
    .order("start_date", { ascending: true });
  if (error) {
    console.error("getActiveAttendancePeriodConfigsByType error:", error);
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
    .eq("id", Number(id))
    .single();
  if (error) {
    console.error("getAttendancePeriodConfigById error:", error);
    throw error;
  }
  return data
    ? mapAttendancePeriodConfigRow(data as unknown as AttendancePeriodConfigRow)
    : null;
}

export async function createAttendancePeriodConfig(
  attendancePeriodConfig: CreateAttendancePeriodConfigInput,
): Promise<AttendancePeriodConfig | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("AttendancePeriodConfig")
    .insert({
      name: attendancePeriodConfig.name,
      start_date: attendancePeriodConfig.startDate,
      end_date: attendancePeriodConfig.endDate,
      semester_id: attendancePeriodConfig.semesterId
        ? Number(attendancePeriodConfig.semesterId)
        : null,
      type: attendancePeriodConfig.type,
      is_active: attendancePeriodConfig.isActive,
      updated_at: new Date().toISOString(),
    })
    .select(attendancePeriodConfigSelect)
    .single();
  if (error) {
    console.error("createAttendancePeriodConfig error:", error);
    throw error;
  }
  return data
    ? mapAttendancePeriodConfigRow(data as unknown as AttendancePeriodConfigRow)
    : null;
}

export async function updateAttendancePeriodConfig(
  attendancePeriodConfig: UpdateAttendancePeriodConfigInput,
): Promise<AttendancePeriodConfig | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("AttendancePeriodConfig")
    .update({
      name: attendancePeriodConfig.name,
      start_date: attendancePeriodConfig.startDate,
      end_date: attendancePeriodConfig.endDate,
      semester_id: attendancePeriodConfig.semesterId
        ? Number(attendancePeriodConfig.semesterId)
        : null,
      type: attendancePeriodConfig.type,
      is_active: attendancePeriodConfig.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", Number(attendancePeriodConfig.id))
    .select(attendancePeriodConfigSelect)
    .single();
  if (error) {
    console.error("updateAttendancePeriodConfig error:", error);
    throw error;
  }
  return data
    ? mapAttendancePeriodConfigRow(data as unknown as AttendancePeriodConfigRow)
    : null;
}

export async function saveAttendancePeriodConfig(
  attendancePeriodConfig: SaveAttendancePeriodConfigInput,
): Promise<AttendancePeriodConfig | null> {
  if (attendancePeriodConfig.id) {
    return updateAttendancePeriodConfig({
      id: attendancePeriodConfig.id,
      name: attendancePeriodConfig.name,
      startDate: attendancePeriodConfig.startDate,
      endDate: attendancePeriodConfig.endDate,
      semesterId: attendancePeriodConfig.semesterId,
      type: attendancePeriodConfig.type,
      isActive: attendancePeriodConfig.isActive,
    });
  }
  return createAttendancePeriodConfig({
    name: attendancePeriodConfig.name,
    startDate: attendancePeriodConfig.startDate,
    endDate: attendancePeriodConfig.endDate,
    semesterId: attendancePeriodConfig.semesterId,
    type: attendancePeriodConfig.type,
    isActive: attendancePeriodConfig.isActive,
  });
}

export async function deleteAttendancePeriodConfig(
  id: string,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("AttendancePeriodConfig")
    .delete()
    .eq("id", Number(id));
  if (error) {
    console.error("deleteAttendancePeriodConfig error:", error);
    return false;
  }
  return true;
}

export async function toggleAttendancePeriodConfigStatus(
  attendancePeriodConfig: AttendancePeriodConfig,
): Promise<AttendancePeriodConfig | null> {
  return updateAttendancePeriodConfig({
    ...attendancePeriodConfig,
    isActive: !attendancePeriodConfig.isActive,
  });
}
