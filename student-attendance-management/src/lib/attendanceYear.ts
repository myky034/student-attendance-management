import type { AcademicYear } from "@/lib/api/academicyear";
import type { Semester } from "@/lib/api/semester";

export function toDateString(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  return value.split("T")[0];
}

export function getSundaysBetween(startDate: string, endDate: string): string[] {
  const start = new Date(toDateString(startDate));
  const end = new Date(toDateString(endDate));

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }

  const days: string[] = [];
  const current = new Date(start);

  while (current.getDay() !== 0) {
    current.setDate(current.getDate() + 1);
  }

  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 7);
  }

  return days;
}

export function getSemestersForAcademicYear(
  semesters: Semester[],
  academicYear: AcademicYear,
): Semester[] {
  const yearStart = toDateString(academicYear.startDate);
  const yearEnd = toDateString(academicYear.endDate);

  return semesters
    .filter((semester) => {
      if (!semester.isActive) return false;
      if (semester.academicYearId) {
        return semester.academicYearId === academicYear.id;
      }
      const semStart = toDateString(semester.startDate);
      const semEnd = toDateString(semester.endDate);
      return semStart <= yearEnd && semEnd >= yearStart;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getAcademicYearForDate(
  years: AcademicYear[],
  referenceDate = new Date(),
): AcademicYear | null {
  if (years.length === 0) return null;

  const today = toDateString(referenceDate);
  const matchingYear = years.find((year) => {
    const start = toDateString(year.startDate);
    const end = toDateString(year.endDate);
    return today >= start && today <= end;
  });

  if (matchingYear) return matchingYear;

  return years.find((year) => year.isActive) ?? years[0] ?? null;
}

/** Mỗi Chủ nhật = 2 buổi (TL + GL), giống AttendanceReport */
export function getYearSchoolSessions(
  semesters: Semester[],
  academicYear: AcademicYear,
): { sundays: string[]; totalSessions: number } {
  const yearSemesters = getSemestersForAcademicYear(semesters, academicYear);
  const sundaySet = new Set<string>();

  for (const semester of yearSemesters) {
    for (const day of getSundaysBetween(semester.startDate, semester.endDate)) {
      sundaySet.add(day);
    }
  }

  const sundays = [...sundaySet].sort();
  return { sundays, totalSessions: sundays.length * 2 };
}

type AttendanceLike = { date: string; status: string };

export type YearlyAttendanceTotals = {
  present: number;
  absent: number;
  excused: number;
};

function normalizeAttendanceStatus(
  status: string,
): "present" | "absent" | "excused" | null {
  if (status === "present") return "present";
  if (status === "absent") return "absent";
  if (
    status === "excused_absence" ||
    status === "excused absence" ||
    status === "excused"
  ) {
    return "excused";
  }
  return null;
}

/** Đếm buổi P/V/E trong năm học (mỗi Chủ nhật có điểm danh = 2 buổi TL + GL) */
export function calculateYearlyAttendanceTotals(
  records: AttendanceLike[],
  sundays: string[],
): YearlyAttendanceTotals {
  const totals: YearlyAttendanceTotals = { present: 0, absent: 0, excused: 0 };
  if (sundays.length === 0) return totals;

  const sundaySet = new Set(sundays.map(toDateString));

  for (const record of records) {
    const date = toDateString(record.date);
    if (!sundaySet.has(date)) continue;

    const status = normalizeAttendanceStatus(record.status);
    if (status === "present") totals.present += 2;
    else if (status === "absent") totals.absent += 2;
    else if (status === "excused") totals.excused += 2;
  }

  return totals;
}

/** % buổi present / tổng buổi học cả năm (2 học kỳ) */
export function calculateYearlyPresentRate(
  records: AttendanceLike[],
  sundays: string[],
): number {
  if (sundays.length === 0) return 0;

  const { present } = calculateYearlyAttendanceTotals(records, sundays);
  const totalSessions = sundays.length * 2;
  return (present / totalSessions) * 100;
}
