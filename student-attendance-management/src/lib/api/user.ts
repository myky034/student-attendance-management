import { createClient } from "@/lib/supabase/client";

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
export async function getUsers(searchQuery: string): Promise<UserRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("User")
    .select(userSelect)
    .eq("role", "teacher")
    .or("isDeleted.eq.false,isDeleted.is.null")
    .ilike("name", `%${searchQuery}%`)
    .ilike("email", `%${searchQuery}%`)
    .ilike("username", `%${searchQuery}%`)
    .order("name", { ascending: true })
    .order("createdAt", { ascending: true });

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
export async function createUser(user: CreateUserInput): Promise<UserRecord> {
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

  return mapDbUserRow(data as unknown as DbUser);
}

export async function updateUser(user: UpdateUserInput): Promise<UserRecord> {
  const supabase = createClient();
  const payload: Record<string, string> = {
    name: user.name ?? undefined,
    email: user.email ?? undefined,
    username: user.username ?? undefined,
    qrCode: user.qrCode ?? undefined,
    classId: user.classId ?? undefined,
    updatedAt: new Date().toISOString(),
  };
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
  return mapDbUserRow(data as unknown as DbUser);
}

export async function saveUser(input: SaveUserInput): Promise<UserRecord> {
  if (input.id) {
    const existing = await getUserById(input.id);
    if (existing) {
      return updateUser({
        id: input.id,
        name: input.name,
        email: input.email,
        username: input.username,
        password: input.password,
        qrCode: input.qrCode,
        classId: input.classId,
      });
    }
  }

  return createUser({
    name: input.name,
    email: input.email,
    username: input.username,
    password: input.password,
    role: input.role,
    qrCode: input.qrCode,
    classId: input.classId,
    isActive: input.isActive,
  });
}

export async function deleteUserById(id: string): Promise<UserRecord> {
  const supabase = createClient();
  const payload: Record<string, string | boolean> = {
    isDeleted: true.toString(),
    isActive: true,
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

  return mapDbUserRow(data as unknown as DbUser);
}

async function patchUserFlags(
  id: string,
  flags: Partial<Pick<DbUser, "isActive" | "isLocked" | "isDeleted">>,
): Promise<UserRecord> {
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

  return mapDbUserRow(data as unknown as DbUser);
}

export async function deactivateUserById(id: string): Promise<UserRecord> {
  const existing = await getUserById(id);
  return patchUserFlags(id, { isActive: !existing.isActive });
}

export async function lockUserById(id: string): Promise<UserRecord> {
  const existing = await getUserById(id);
  return patchUserFlags(id, { isLocked: !existing.isLocked });
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
