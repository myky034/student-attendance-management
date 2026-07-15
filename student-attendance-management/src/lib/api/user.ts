import { createClient } from "@/lib/supabase/client";
import { writeAuditLog, writeAuditLogSafe } from "@/lib/audit/writeAuditLog";
import {
  normalizeClassIdForAudit,
  warnMissingAudit,
} from "@/lib/audit/warnMissingAudit";
import type { AuditContext } from "@/lib/audit/types";

export type UserRole = "admin" | "student" | "teacher" | "supervisor";

type GradeRow = {
  id: string;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
};

type ClassRelation = {
  id: string;
  name: string;
  grade: GradeRow | GradeRow[] | null;
};

export type CreateUserInput = {
  name: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  qrCode: string;
  classId: string;
  isActive: boolean;
};

type UpdateUserInput = {
  id: string;
  name?: string;
  email?: string;
  username?: string;
  password?: string;
  qrCode?: string;
  classId?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  isLocked?: boolean;
  updatedAt?: string;
};

export type UserRecord = Omit<DbUser, "class"> & {
  createdAt: string;
  updatedAt: string;
  class: {
    id: string;
    name: string;
    grade: GradeRow | null;
  } | null;
};

export type DbUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  classId: string;
  qrCode: string;
  isActive: boolean;
  isDeleted: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  class?: ClassRelation | ClassRelation[] | null;
};

const userSelect = `id, name, email, password, username, role, qrCode, isActive, isDeleted, isLocked, classId, createdAt, updatedAt,
  class:Class(id, name, grade:Grade(id, name, description, color, isActive))`;

function normalizeClass(
  classValue: ClassRelation | ClassRelation[] | null | undefined,
): UserRecord["class"] {
  const row = Array.isArray(classValue) ? classValue[0] : classValue;
  if (!row) return null;

  const grade = Array.isArray(row.grade) ? (row.grade[0] ?? null) : row.grade;

  return {
    id: row.id,
    name: row.name,
    grade,
  };
}

function mapDbUserRow(user: DbUser): UserRecord {
  return {
    ...user,
    class: normalizeClass(user.class),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export type SaveUserInput = {
  id?: string;
  name: string;
  email: string;
  username: string;
  password?: string;
  role: UserRole;
  qrCode: string;
  classId: string;
  isActive: boolean;
};

/* Get all users from the database */
export async function getUsers(
  searchQuery: string = "",
): Promise<UserRecord[]> {
  const supabase = createClient();
  let query = supabase
    .from("User")
    .select(userSelect)
    .or("isDeleted.eq.false,isDeleted.is.null")
    .order("name", { ascending: true })
    .order("createdAt", { ascending: true });

  if (searchQuery) {
    query = query
      .ilike("name", `%${searchQuery}%`)
      .ilike("email", `%${searchQuery}%`)
      .ilike("username", `%${searchQuery}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getUsers error:", error);
    throw error;
  }

  return ((data ?? []) as unknown as DbUser[]).map(mapDbUserRow);
}

export async function getUserById(id: string): Promise<UserRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("User")
    .select(userSelect)
    .eq("id", id)
    .single();

  if (error) {
    console.error("getUserById error:", error);
    throw error;
  }
  return mapDbUserRow(data as unknown as DbUser);
}

/* Insert a new user into the database */
export async function createUser(
  user: CreateUserInput,
  audit?: AuditContext,
): Promise<UserRecord> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("User")
    .insert({
      id: crypto.randomUUID(),
      name: user.name,
      email: user.email,
      username: user.username,
      password: user.password,
      role: user.role,
      classId: user.classId,
      qrCode: user.qrCode,
      isActive: user.isActive,
      isDeleted: false,
      isLocked: false,
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("createUser error:", error);
    throw error;
  }

  const result = mapDbUserRow(data as unknown as DbUser);
  if (audit) {
    await writeAuditLog({
      ...audit,
      action: "CREATE",
      entity: "User",
      entityId: result.id,
      classId: normalizeClassIdForAudit(result.classId),
      newValue: result,
    });
  } else {
    warnMissingAudit("createUser");
  }
  return result;
}

function buildUserUpdatePayload(
  user: UpdateUserInput,
): Record<string, string | boolean | null> {
  const payload: Record<string, string | boolean | null> = {
    updatedAt: new Date().toISOString(),
  };

  if (user.name !== undefined) payload.name = user.name;
  if (user.email !== undefined) payload.email = user.email;
  if (user.username !== undefined) payload.username = user.username;
  if (user.qrCode !== undefined) payload.qrCode = user.qrCode;
  if (user.password) payload.password = user.password;
  if (user.classId !== undefined) {
    payload.classId = user.classId.trim() === "" ? null : user.classId;
  }
  if (user.isActive !== undefined) payload.isActive = user.isActive;
  if (user.isDeleted !== undefined) payload.isDeleted = user.isDeleted;
  if (user.isLocked !== undefined) payload.isLocked = user.isLocked;

  return payload;
}

export async function updateUser(
  user: UpdateUserInput,
  audit?: AuditContext,
): Promise<UserRecord> {
  const oldValue = audit ? await getUserById(user.id) : null;
  const supabase = createClient();
  const payload = buildUserUpdatePayload(user);
  const { data, error } = await supabase
    .from("User")
    .update(payload)
    .eq("id", user.id)
    .select(userSelect)
    .single();
  if (error) {
    console.error("updateUser error:", error);
    throw error;
  }
  const result = mapDbUserRow(data as unknown as DbUser);
  if (audit) {
    await writeAuditLog({
      ...audit,
      action: "UPDATE",
      entity: "User",
      entityId: result.id,
      classId: normalizeClassIdForAudit(result.classId),
      oldValue: oldValue ?? undefined,
      newValue: result,
    });
  } else {
    warnMissingAudit("updateUser");
  }
  return result;
}

export async function saveUser(
  input: SaveUserInput,
  audit?: AuditContext,
): Promise<UserRecord> {
  if (input.id) {
    const existing = await getUserById(input.id);
    if (existing) {
      return updateUser(
        {
          id: input.id,
          name: input.name,
          email: input.email,
          username: input.username,
          password: input.password,
          qrCode: input.qrCode,
          classId: input.classId,
        },
        audit,
      );
    }
  }

  return createUser(
    {
      name: input.name,
      email: input.email,
      username: input.username,
      password: input.password,
      role: input.role,
      qrCode: input.qrCode,
      classId: input.classId,
      isActive: input.isActive,
    },
    audit,
  );
}

export async function deleteUserById(
  id: string,
  audit?: AuditContext,
): Promise<UserRecord> {
  const oldValue = audit ? await getUserById(id) : null;
  const supabase = createClient();
  const payload: Record<string, string | boolean> = {
    isDeleted: true,
    isActive: false,
    isLocked: false,
    updatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("User")
    .update(payload)
    .eq("id", id)
    .select(userSelect)
    .single();

  if (error) {
    console.error("deleteUserById error:", error);
    throw error;
  }

  const result = mapDbUserRow(data as unknown as DbUser);
  if (audit) {
    await writeAuditLog({
      ...audit,
      action: "DELETE",
      entity: "User",
      entityId: result.id,
      classId: normalizeClassIdForAudit(result.classId),
      oldValue: oldValue ?? undefined,
      newValue: result,
    });
  } else {
    warnMissingAudit("deleteUserById");
  }
  return result;
}

async function patchUserFlags(
  id: string,
  flags: Partial<Pick<DbUser, "isActive" | "isLocked" | "isDeleted">>,
  audit?: AuditContext,
  auditAction?: "LOCK" | "ACTIVATE",
): Promise<UserRecord> {
  const oldValue = audit ? await getUserById(id) : null;
  const supabase = createClient();
  const payload: Record<string, string | boolean> = {
    ...flags,
    updatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("User")
    .update(payload)
    .eq("id", id)
    .select(userSelect)
    .single();

  if (error) {
    console.error("patchUserFlags error:", error);
    throw error;
  }

  const result = mapDbUserRow(data as unknown as DbUser);
  if (audit && auditAction) {
    await writeAuditLog({
      ...audit,
      action: auditAction,
      entity: "User",
      entityId: result.id,
      classId: normalizeClassIdForAudit(result.classId),
      oldValue: oldValue ?? undefined,
      newValue: result,
    });
  } else if (!audit) {
    warnMissingAudit("patchUserFlags");
  } else if (!auditAction) {
    warnMissingAudit("patchUserFlags(missing action)");
  }
  return result;
}

export async function deactivateUserById(
  id: string,
  audit?: AuditContext,
): Promise<UserRecord> {
  const existing = await getUserById(id);
  return patchUserFlags(id, { isActive: !existing.isActive }, audit, "ACTIVATE");
}

export async function lockUserById(
  id: string,
  audit?: AuditContext,
): Promise<UserRecord> {
  const existing = await getUserById(id);
  return patchUserFlags(id, { isLocked: !existing.isLocked }, audit, "LOCK");
}

export async function authenticateUser(email: string, password: string) {
  const supabase = createClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("User")
    .select(
      "id, name, email, username, password, role, qrCode, classId, isActive, isDeleted, isLocked, createdAt, updatedAt",
    )
    .eq("email", normalizedEmail)
    .eq("password", password)
    .single();

  if (error) {
    console.error("authenticateUser error:", error);
    return null;
  }

  return data as DbUser;
}
