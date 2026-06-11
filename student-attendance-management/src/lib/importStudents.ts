const EMAIL_DOMAIN = "school.edu";

export type RawImportRow = {
  name: string;
  email: string;
  username: string;
  role: string;
};

export type ImportPreviewRow = RawImportRow & {
  isEmailGenerated: boolean;
  isUsernameGenerated: boolean;
};

const HEADER_MAP: Record<string, keyof RawImportRow> = {
  name: "name",
  "full name": "name",
  "họ tên": "name",
  email: "email",
  username: "username",
  "user name": "username",
  role: "role",
};

function normalizeHeaderKey(key: string): string {
  return key.replace(/^\ufeff/, "").trim().toLowerCase();
}

export function parseRawImportRows(
  raw: Record<string, unknown>[],
): RawImportRow[] {
  return raw.map((row) => {
    const normalized: RawImportRow = {
      name: "",
      email: "",
      username: "",
      role: "student",
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
      email: row.email.trim().toLowerCase(),
      username: row.username.trim(),
      role: (row.role.trim().toLowerCase() || "student") as string,
    });
  });

  return { validRows, invalidRowNumbers };
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
): ImportPreviewRow[] {
  const usedEmails = new Set(existingEmails.map((email) => email.toLowerCase()));
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

    return {
      name: row.name,
      email,
      username,
      role: row.role || "student",
      isEmailGenerated: !hasEmail,
      isUsernameGenerated: !hasUsername,
    };
  });
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
