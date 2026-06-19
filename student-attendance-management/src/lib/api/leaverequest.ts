import { createClient } from "@/lib/supabase/client";

type ClassRelation = {
  id: string;
  name: string;
};

type UserRelation = {
  id: string;
  name: string;
  user_code: string | null;
  class?: ClassRelation | ClassRelation[] | null;
};

type LeaveRequestRow = {
  id: number | string;
  student_id: string;
  class_id: string;
  request_date: string;
  reason: string;
  status: string;
  submitted_by_name: string;
  submitted_by_phone: string | number | null;
  approved_by_id: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  rejected_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  rejected_by_id: string | null;
  Class?: ClassRelation | ClassRelation[] | null;
  User_LeaveRequest_student_idToUser?: UserRelation | UserRelation[] | null;
  User_LeaveRequest_approved_by_idToUser?: UserRelation | UserRelation[] | null;
  User_LeaveRequest_rejected_by_idToUser?: UserRelation | UserRelation[] | null;
};

export type LeaveRequestStudent = {
  id: string;
  name: string;
  code: string;
  class: ClassRelation | null;
};

export type LeaveRequest = {
  id: string;
  student_id: string;
  class_id: string;
  request_date: string;
  reason: string;
  status: string;
  submitted_by_name: string;
  submitted_by_phone: string;
  approved_by_id: string | null;
  approved_at: string | null;
  rejected_by_id: string | null;
  rejected_reason: string | null;
  rejected_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  student: LeaveRequestStudent;
  className: string;
  approved_by_name: string | null;
  rejected_by_name: string | null;
};

const leaveRequestBaseSelect = `
  id,
  student_id,
  class_id,
  request_date,
  reason,
  status,
  submitted_by_name,
  submitted_by_phone,
  approved_by_id,
  approved_at,
  rejected_by_id,
  rejected_reason,
  rejected_at,
  created_at,
  updated_at
`;

const leaveRequestSelectWithRelations = `
  ${leaveRequestBaseSelect},
  Class(id, name),
  User_LeaveRequest_student_idToUser:User(id, name, user_code, class:Class(id, name)),
  User_LeaveRequest_approved_by_idToUser:User(id, name),
  User_LeaveRequest_rejected_by_idToUser:User(id, name)
`;

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeClassRelation(
  value: ClassRelation | ClassRelation[] | null | undefined,
): ClassRelation | null {
  return normalizeRelation(value);
}

async function fetchUsersByCodes(
  codes: string[],
): Promise<Map<string, UserRelation>> {
  if (codes.length === 0) return new Map();

  const supabase = createClient();
  const { data, error } = await supabase
    .from("User")
    .select("id, name, user_code, class:Class(id, name)")
    .in("user_code", codes);

  if (error) {
    console.warn("fetchUsersByCodes failed:", error.message);
    return new Map();
  }

  const usersByCode = new Map<string, UserRelation>();
  for (const user of (data ?? []) as UserRelation[]) {
    if (user.user_code) {
      usersByCode.set(user.user_code, user);
    }
  }
  return usersByCode;
}

async function fetchUsersByIds(
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const supabase = createClient();
  const { data, error } = await supabase
    .from("User")
    .select("id, name")
    .in("id", userIds);

  if (error) {
    console.warn("fetchUsersByIds failed:", error.message);
    return new Map();
  }

  return new Map(
    ((data ?? []) as { id: string; name: string }[]).map((user) => [
      user.id,
      user.name,
    ]),
  );
}

async function fetchClassesByIds(
  classIds: string[],
): Promise<Map<string, ClassRelation>> {
  if (classIds.length === 0) return new Map();

  const supabase = createClient();
  const { data, error } = await supabase
    .from("Class")
    .select("id, name")
    .in("id", classIds);

  if (error) {
    console.warn("fetchClassesByIds failed:", error.message);
    return new Map();
  }

  return new Map(
    ((data ?? []) as ClassRelation[]).map((classRow) => [
      classRow.id,
      classRow,
    ]),
  );
}

function buildLeaveRequestStudent(
  row: LeaveRequestRow,
  userByCode: Map<string, UserRelation>,
  classById: Map<string, ClassRelation>,
): LeaveRequestStudent {
  const embeddedUser = normalizeRelation(
    row.User_LeaveRequest_student_idToUser,
  );
  const user = embeddedUser ?? userByCode.get(row.student_id);
  const classFromRequest = normalizeClassRelation(row.Class);
  const classFromUser = normalizeClassRelation(user?.class);
  const classFromId = classById.get(row.class_id) ?? null;

  return {
    id: user?.id ?? row.student_id,
    name: user?.name ?? "Unknown",
    code: user?.user_code ?? row.student_id,
    class: classFromRequest ?? classFromId ?? classFromUser,
  };
}

async function mapLeaveRequestRows(
  rows: LeaveRequestRow[],
): Promise<LeaveRequest[]> {
  if (rows.length === 0) return [];

  const studentCodes = [...new Set(rows.map((row) => row.student_id))];
  const classIds = [
    ...new Set(rows.map((row) => row.class_id).filter(Boolean)),
  ];
  const approverIds = [
    ...new Set(
      rows
        .map((row) => row.approved_by_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const rejectedIds = [
    ...new Set(
      rows
        .map((row) => row.rejected_by_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [userByCode, classById, approverNameById, rejectedNameById] =
    await Promise.all([
      fetchUsersByCodes(studentCodes),
      fetchClassesByIds(classIds),
      fetchUsersByIds(approverIds),
      fetchUsersByIds(rejectedIds),
    ]);

  return rows.map((row) => {
    const student = buildLeaveRequestStudent(row, userByCode, classById);

    return {
      id: String(row.id),
      student_id: row.student_id,
      class_id: row.class_id,
      request_date: row.request_date,
      reason: row.reason,
      status: row.status,
      submitted_by_name: row.submitted_by_name,
      submitted_by_phone:
        row.submitted_by_phone != null ? String(row.submitted_by_phone) : "",
      approved_by_id: row.approved_by_id,
      approved_at: row.approved_at,
      rejected_by_id: row.rejected_by_id,
      rejected_reason: row.rejected_reason ?? "",
      rejected_at: row.rejected_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      student,
      className: student.class?.name ?? classById.get(row.class_id)?.name ?? "",
      approved_by_name: row.approved_by_id
        ? (normalizeRelation(row.User_LeaveRequest_approved_by_idToUser)
            ?.name ??
          approverNameById.get(row.approved_by_id) ??
          null)
        : null,
      rejected_by_name: row.rejected_by_id
        ? (normalizeRelation(row.User_LeaveRequest_rejected_by_idToUser)
            ?.name ??
          rejectedNameById.get(row.rejected_by_id) ??
          null)
        : null,
    };
  });
}

type LeaveRequestQueryResult = {
  data: LeaveRequestRow[] | LeaveRequestRow | null;
  error: { message: string } | null;
};

function toLeaveRequestRows(
  data: LeaveRequestRow[] | LeaveRequestRow | null,
): LeaveRequestRow[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

async function queryLeaveRequests(
  runQuery: (select: string) => PromiseLike<LeaveRequestQueryResult>,
): Promise<LeaveRequest[]> {
  const primary = await runQuery(leaveRequestSelectWithRelations);
  let rows = toLeaveRequestRows(primary.data);
  let queryError = primary.error;

  if (queryError) {
    console.warn(
      "Leave request relation embed failed, retrying without embed:",
      queryError.message,
    );
    const fallback = await runQuery(leaveRequestBaseSelect);
    rows = toLeaveRequestRows(fallback.data);
    queryError = fallback.error;
  }

  if (queryError) {
    throw queryError;
  }

  return mapLeaveRequestRows(rows);
}

export type CreateLeaveRequestInput = {
  student_id: string;
  class_id: string;
  request_date: string;
  reason: string;
  submitted_by_name: string;
  submitted_by_phone: string;
};

export type UpdateLeaveRequestInput = {
  id: string;
  student_id: string;
  class_id: string;
  request_date: string;
  reason: string;
  submitted_by_name: string;
  submitted_by_phone: string;
};

export type SaveLeaveRequestInput = {
  id?: string;
  student_id: string;
  class_id: string;
  request_date: string;
  reason: string;
  submitted_by_name: string;
  submitted_by_phone: string;
};

export type ApproveLeaveRequestInput = {
  id: string;
  approved_by_id: string;
  approved_at: string | null;
  status: string;
};

export type RejectLeaveRequestInput = {
  id: string;
  rejected_reason: string;
  rejected_at: string | null;
  status: string;
};

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  const supabase = createClient();
  return queryLeaveRequests(async (select) => {
    const { data, error } = await supabase.from("LeaveRequest").select(select);
    return { data: data as unknown as LeaveRequestRow[] | null, error };
  });
}

export async function getLeaveRequestByStudentId(
  studentId: string,
): Promise<LeaveRequest | null> {
  const supabase = createClient();
  const rows = await queryLeaveRequests(async (select) => {
    const { data, error } = await supabase
      .from("LeaveRequest")
      .select(select)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1);
    return { data: data as unknown as LeaveRequestRow[] | null, error };
  });

  return rows[0] ?? null;
}

export async function getLeaveRequestsByStudentId(
  studentId: string,
): Promise<LeaveRequest[]> {
  const supabase = createClient();
  return queryLeaveRequests(async (select) => {
    const { data, error } = await supabase
      .from("LeaveRequest")
      .select(select)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    return { data: data as unknown as LeaveRequestRow[] | null, error };
  });
}

export async function getLeaveRequestsByClassId(
  classId: string,
): Promise<LeaveRequest[]> {
  const supabase = createClient();
  return queryLeaveRequests(async (select) => {
    const { data, error } = await supabase
      .from("LeaveRequest")
      .select(select)
      .eq("class_id", classId)
      .order("request_date", { ascending: false });
    return { data: data as unknown as LeaveRequestRow[] | null, error };
  });
}

export async function createLeaveRequest(
  leaveRequest: CreateLeaveRequestInput,
): Promise<LeaveRequest> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("LeaveRequest")
    .insert({
      student_id: leaveRequest.student_id,
      class_id: leaveRequest.class_id,
      request_date: leaveRequest.request_date,
      reason: leaveRequest.reason,
      status: "pending",
      submitted_by_name: leaveRequest.submitted_by_name,
      submitted_by_phone: leaveRequest.submitted_by_phone,
    })
    .select(leaveRequestBaseSelect)
    .single();

  if (error) {
    console.error("createLeaveRequest error:", error);
    throw new Error(`Failed to create leave request: ${error.message}`);
  }

  const [mapped] = await mapLeaveRequestRows([data as LeaveRequestRow]);
  return mapped;
}

export async function updateLeaveRequest(
  leaveRequest: UpdateLeaveRequestInput,
): Promise<LeaveRequest> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("LeaveRequest")
    .update({
      student_id: leaveRequest.student_id,
      class_id: leaveRequest.class_id,
      request_date: leaveRequest.request_date,
      reason: leaveRequest.reason,
      submitted_by_name: leaveRequest.submitted_by_name,
      submitted_by_phone: leaveRequest.submitted_by_phone,
    })
    .eq("id", leaveRequest.id)
    .select(leaveRequestBaseSelect)
    .single();

  if (error) {
    console.error("updateLeaveRequest error:", error);
    throw new Error(`Failed to update leave request: ${error.message}`);
  }

  const [mapped] = await mapLeaveRequestRows([data as LeaveRequestRow]);
  return mapped;
}

export async function saveLeaveRequest(
  leaveRequest: SaveLeaveRequestInput,
): Promise<LeaveRequest> {
  if (leaveRequest.id) {
    const existing = await getLeaveRequestByStudentId(leaveRequest.student_id);
    if (!existing) {
      throw new Error(`Leave request not found: ${leaveRequest.student_id}`);
    }
    return updateLeaveRequest({
      ...leaveRequest,
      id: existing.id,
    });
  }
  return createLeaveRequest(leaveRequest);
}

export async function deleteLeaveRequest(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("LeaveRequest").delete().eq("id", id);
  if (error) {
    throw new Error(`Failed to delete leave request: ${error.message}`);
  }
}

export async function approveLeaveRequest(
  leaveRequest: ApproveLeaveRequestInput,
): Promise<LeaveRequest> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("LeaveRequest")
    .update({
      approved_by_id: leaveRequest.approved_by_id,
      approved_at: leaveRequest.approved_at,
      status: leaveRequest.status,
    })
    .eq("id", leaveRequest.id)
    .select(leaveRequestBaseSelect)
    .single();

  if (error) {
    console.error("approveLeaveRequest error:", error);
    throw new Error(`Failed to approve leave request: ${error.message}`);
  }

  const [mapped] = await mapLeaveRequestRows([data as LeaveRequestRow]);
  return mapped;
}

export async function rejectLeaveRequest(
  leaveRequest: RejectLeaveRequestInput,
): Promise<LeaveRequest> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("LeaveRequest")
    .update({
      rejected_reason: leaveRequest.rejected_reason,
      rejected_at: leaveRequest.rejected_at,
      status: leaveRequest.status,
    })
    .eq("id", leaveRequest.id)
    .select(leaveRequestBaseSelect)
    .single();

  if (error) {
    console.error("rejectLeaveRequest error:", error);
    throw new Error(`Failed to reject leave request: ${error.message}`);
  }

  const [mapped] = await mapLeaveRequestRows([data as LeaveRequestRow]);
  return mapped;
}
