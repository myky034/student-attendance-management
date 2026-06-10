import { createClient } from "@/lib/supabase/client";

export type UserRole = "admin" | "student" | "teacher";

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
  class?: {
    id: string;
    name: string;
    grade: { id: string; name: string } | { id: string; name: string }[] | null;
  } | null;
};

/* Get all users from the database */
export async function getUsers(): Promise<DbUser[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("User")
    .select(`*, class:Class(id, name, grade:Grade(id, name))`)
    .or("isDeleted.eq.false,isDeleted.is.null")
    .order("createdAt", { ascending: false });

  if (error) {
    console.error("getUsers error:", error);
    throw error;
  }

  return (data ?? []) as DbUser[];
}

/* Insert a new user into the database */
export async function createUser(user: CreateUserInput): Promise<DbUser> {
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

  return data as DbUser;
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
