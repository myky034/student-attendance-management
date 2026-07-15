import { createClient } from "@/lib/supabase/client";
import { writeAuditLog } from "@/lib/audit/writeAuditLog";
import { warnMissingAudit } from "@/lib/audit/warnMissingAudit";
import type { AuditContext } from "@/lib/audit/types";

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

function toDateOnly(value: string): string {
  return value.split("T")[0];
}

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

export type CreateAcademicYearInput = {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type UpdateAcademicYearInput = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type SaveAcademicYearInput = {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const academicYearSelect =
  "id, name, start_date, end_date, is_active, created_at, update_at";

/** Supabase table: `AcademicYear` */
export async function getAcademicYears(): Promise<AcademicYear[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("AcademicYear")
    .select(academicYearSelect)
    .order("start_date", { ascending: true });

  if (error) {
    console.error("getAcademicYears error:", error);
    throw error;
  }

  return ((data ?? []) as AcademicYearRow[]).map(mapAcademicYearRow);
}

export async function getAcademicYearById(
  id: string,
): Promise<AcademicYear | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("AcademicYear")
    .select(academicYearSelect)
    .eq("id", Number(id))
    .maybeSingle();

  if (error) {
    console.error("getAcademicYearById error:", error);
    throw error;
  }

  if (!data) return null;
  return mapAcademicYearRow(data as AcademicYearRow);
}

export async function createAcademicYear(
  academicYear: CreateAcademicYearInput,
  audit?: AuditContext,
): Promise<AcademicYear> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("AcademicYear")
    .insert({
      name: academicYear.name.trim(),
      start_date: toDateOnly(academicYear.startDate),
      end_date: toDateOnly(academicYear.endDate),
      is_active: academicYear.isActive,
      update_at: new Date().toISOString(),
    })
    .select(academicYearSelect)
    .single();

  if (error) {
    console.error("createAcademicYear error:", error);
    throw error;
  }
  const result = mapAcademicYearRow(data as AcademicYearRow);
  if (audit) {
    await writeAuditLog({
      ...audit,
      action: "CREATE",
      entity: "AcademicYear",
      entityId: result.id,
      newValue: result,
    });
  } else {
    warnMissingAudit("createAcademicYear");
  }
  return result;
}

export async function updateAcademicYear(
  academicYear: UpdateAcademicYearInput,
  audit?: AuditContext,
): Promise<AcademicYear> {
  const oldValue = audit ? await getAcademicYearById(academicYear.id) : null;
  const supabase = createClient();
  const payload = {
    name: academicYear.name.trim(),
    start_date: toDateOnly(academicYear.startDate),
    end_date: toDateOnly(academicYear.endDate),
    is_active: academicYear.isActive,
    update_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("AcademicYear")
    .update(payload)
    .eq("id", Number(academicYear.id))
    .select(academicYearSelect)
    .single();

  if (error) {
    console.error("updateAcademicYear error:", error);
    throw error;
  }
  const result = mapAcademicYearRow(data as AcademicYearRow);
  if (audit) {
    await writeAuditLog({
      ...audit,
      action: "UPDATE",
      entity: "AcademicYear",
      entityId: result.id,
      oldValue: oldValue ?? undefined,
      newValue: result,
    });
  } else {
    warnMissingAudit("updateAcademicYear");
  }
  return result;
}

export async function saveAcademicYear(
  academicYear: SaveAcademicYearInput,
  audit?: AuditContext,
): Promise<AcademicYear> {
  if (academicYear.id) {
    const existing = await getAcademicYearById(academicYear.id);
    if (!existing) {
      throw new Error("Academic year not found");
    }
    return updateAcademicYear(
      academicYear as UpdateAcademicYearInput,
      audit,
    );
  }

  return createAcademicYear(academicYear, audit);
}

export async function deleteAcademicYear(
  id: string,
  audit?: AuditContext,
): Promise<void> {
  const oldValue = audit ? await getAcademicYearById(id) : null;
  const supabase = createClient();
  const { error } = await supabase
    .from("AcademicYear")
    .delete()
    .eq("id", Number(id));
  if (error) {
    console.error("deleteAcademicYear error:", error);
    throw error;
  }
  if (audit) {
    await writeAuditLog({
      ...audit,
      action: "DELETE",
      entity: "AcademicYear",
      entityId: id,
      oldValue: oldValue ?? undefined,
    });
  } else {
    warnMissingAudit("deleteAcademicYear");
  }
}

export async function toggleAcademicYearStatus(
  academicYear: UpdateAcademicYearInput,
  audit?: AuditContext,
): Promise<AcademicYear> {
  return updateAcademicYear(
    {
      ...academicYear,
      isActive: !academicYear.isActive,
    },
    audit,
  );
}
