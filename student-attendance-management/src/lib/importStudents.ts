import type { ClassOption } from "@/lib/api/classes";

const EMAIL_DOMAIN = "school.edu";

export type RawImportRow = {
  name: string;
  holy_name: string;
  email: string;
  username: string;
  role: string;
  class: string;
  grade: string;
};

export type ImportPreviewRow = RawImportRow & {
  isEmailGenerated: boolean;
  isUsernameGenerated: boolean;
  classId: string | null;
  classResolveError: string | null;
};

const HEADER_MAP: Record<string, keyof RawImportRow> = {
  name: "name",
  "full name": "name",
  "họ tên": "name",
  "holy name": "holy_name",
  holy_name: "holy_name",
  "tên thánh": "holy_name",
  email: "email",
  username: "username",
  "user name": "username",
  role: "role",
  class: "class",
  "class name": "class",
  lớp: "class",
  grade: "grade",
  "grade name": "grade",
  khối: "grade",
};

function normalizeHeaderKey(key: string): string {
  return key
    .replace(/^\ufeff/, "")
    .trim()
    .toLowerCase();
}

export function parseRawImportRows(
  raw: Record<string, unknown>[],
): RawImportRow[] {
  return raw.map((row) => {
    const normalized: RawImportRow = {
      name: "",
      holy_name: "",
      email: "",
      username: "",
      role: "student",
      class: "",
      grade: "",
    };

    for (const [key, value] of Object.entries(row)) {
      const field = HEADER_MAP[normalizeHeaderKey(key)];
      if (field && value != null && String(value).trim()) {
        normalized[field] = String(value).trim();
      }
    }

    return normalized;
  });
}

export function validateImportNames(rows: RawImportRow[]): {
  validRows: RawImportRow[];
  invalidRowNumbers: number[];
} {
  const validRows: RawImportRow[] = [];
  const invalidRowNumbers: number[] = [];

  rows.forEach((row, index) => {
    if (!row.name.trim()) {
      invalidRowNumbers.push(index + 2);
      return;
    }
    validRows.push({
      ...row,
      name: row.name.trim(),
      holy_name: row.holy_name.trim(),
      email: row.email.trim().toLowerCase(),
      username: row.username.trim(),
      role: (row.role.trim().toLowerCase() || "student") as string,
      class: row.class.trim(),
      grade: row.grade.trim(),
    });
  });

  return { validRows, invalidRowNumbers };
}

/** Kiểm tra cột class/grade bắt buộc khi import Admin/Supervisor */
export function validateImportClassGrade(rows: RawImportRow[]): {
  validRows: RawImportRow[];
  invalidRowNumbers: number[];
} {
  const validRows: RawImportRow[] = [];
  const invalidRowNumbers: number[] = [];

  rows.forEach((row, index) => {
    if (!row.class.trim() || !row.grade.trim()) {
      invalidRowNumbers.push(index + 2);
      return;
    }
    validRows.push(row);
  });

  return { validRows, invalidRowNumbers };
}

/** Map tên lớp + khối sang classId từ danh sách Class đã load */
export function resolveClassId(
  className: string,
  gradeName: string,
  classes: ClassOption[],
): { classId: string | null; error: string | null } {
  const normalizedClass = className.trim().toLowerCase();
  const normalizedGrade = gradeName.trim().toLowerCase();

  if (!normalizedClass || !normalizedGrade) {
    return { classId: null, error: "Class and Grade are required" };
  }

  const match = classes.find(
    (item) =>
      item.name.trim().toLowerCase() === normalizedClass &&
      item.grade?.name.trim().toLowerCase() === normalizedGrade,
  );

  if (!match) {
    return {
      classId: null,
      error: `Class "${className}" not found in Grade "${gradeName}"`,
    };
  }

  return { classId: match.id, error: null };
}

function removeAccents(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function slugPart(value: string): string {
  return removeAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Ví dụ: "Nguyễn Văn A" -> "anguyen" (tên + họ) */
export function nameToBaseUsername(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return slugPart(parts[0]);

  const ho = parts[0];
  const ten = parts[parts.length - 1];
  const base = slugPart(ten) + slugPart(ho);

  return base || slugPart(fullName);
}

function ensureUniqueUsername(value: string, used: Set<string>): string {
  let candidate = value.toLowerCase();
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }

  let counter = 1;
  while (used.has(`${value.toLowerCase()}${counter}`)) {
    counter += 1;
  }

  candidate = `${value.toLowerCase()}${counter}`;
  used.add(candidate);
  return candidate;
}

function ensureUniqueEmail(value: string, used: Set<string>): string {
  const candidate = value.includes("@")
    ? value.toLowerCase()
    : `${value.toLowerCase()}@${EMAIL_DOMAIN}`;

  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }

  const [localPart, domain = EMAIL_DOMAIN] = candidate.split("@");
  let counter = 1;
  let next = `${localPart}${counter}@${domain}`;

  while (used.has(next)) {
    counter += 1;
    next = `${localPart}${counter}@${domain}`;
  }

  used.add(next);
  return next;
}

export function buildImportPreviewRows(
  rows: RawImportRow[],
  existingEmails: string[] = [],
  existingUsernames: string[] = [],
  classes: ClassOption[] = [],
  resolveClass = false,
): ImportPreviewRow[] {
  const usedEmails = new Set(
    existingEmails.map((email) => email.toLowerCase()),
  );
  const usedUsernames = new Set(
    existingUsernames.map((username) => username.toLowerCase()),
  );

  return rows.map((row) => {
    const baseUsername = nameToBaseUsername(row.name);
    const hasUsername = Boolean(row.username.trim());
    const hasEmail = Boolean(row.email.trim());

    const username = ensureUniqueUsername(
      hasUsername ? row.username : baseUsername || "student",
      usedUsernames,
    );

    const email = ensureUniqueEmail(
      hasEmail ? row.email : `${username}@${EMAIL_DOMAIN}`,
      usedEmails,
    );

    let classId: string | null = null;
    let classResolveError: string | null = null;

    if (resolveClass) {
      const resolved = resolveClassId(row.class, row.grade, classes);
      classId = resolved.classId;
      classResolveError = resolved.error;
    }

    return {
      name: row.name,
      holy_name: row.holy_name,
      email,
      username,
      role: row.role || "student",
      class: row.class,
      grade: row.grade,
      isEmailGenerated: !hasEmail,
      isUsernameGenerated: !hasUsername,
      classId,
      classResolveError,
    };
  });
}

/** Template CSV mẫu cho Admin/Supervisor import */
export function buildImportTemplateCsv(): string {
  const headers = [
    "holy_name",
    "name",
    "email",
    "username",
    "class",
    "grade",
  ];
  const sampleRows = [
    ["Maria", "Nguyễn Văn A", "", "", "10A1", "Grade 10"],
    ["Joseph", "Trần Thị B", "tranthib@school.edu", "tranthib", "10A2", "Grade 10"],
  ];

  const escapeCell = (value: string) =>
    value.includes(",") || value.includes('"')
      ? `"${value.replace(/"/g, '""')}"`
      : value;

  const lines = [
    headers.join(","),
    ...sampleRows.map((row) => row.map(escapeCell).join(",")),
  ];

  return lines.join("\n");
}

export function downloadImportTemplate(): void {
  const csv = buildImportTemplateCsv();
  const blob = new Blob(["\ufeff" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "student_import_template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function generateQRCode(): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  return `GXTD-${timestamp}-${randomString}`.toUpperCase();
}

export function generatePassword(length = 8): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

export function isSupportedImportFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return (
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls")
  );
}
