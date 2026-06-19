import React, { useState, useMemo, useEffect } from "react";
import { useAppContext } from "@/context/useAppContext";
import type { User } from "@/context/appContext";
import { Badge } from "@/components/ui/badge";
import {
  FileDown,
  UserIcon,
  Search,
  Loader2,
  CalendarDays,
  Users,
} from "lucide-react";
import { getStudents, type StudentRecord } from "@/lib/api/students";
import {
  getAttendanceRecordsByStudentIds,
  normalizeAttendanceDate,
  type AttendanceRecord,
} from "@/lib/api/attendancerecord";
import { getAcademicYears, type AcademicYear } from "@/lib/api/academicyear";
import { getSemesters, type Semester } from "@/lib/api/semester";
import { getClassById } from "@/lib/api/classes";
import {
  getActiveAttendancePeriodConfigsByType,
  type AttendancePeriodConfig,
} from "@/lib/api/attendanceperiodconfig";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Chip,
} from "@mui/material";
import { Paper, TableContainer } from "@mui/material";
import { Pagination } from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const ROWS_PER_PAGE_OPTIONS = [10, 15, 25, 50] as const;

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "attendance";
}

type MatrixExportRow = {
  globalIndex: number;
  name: string;
  qrCode?: string;
  id: string;
  attendanceMap: Record<string, string>;
  totalP: number;
  totalV: number;
  totalE: number;
};

function buildAttendanceMatrixSheet(
  matrixData: MatrixExportRow[],
  sessionDays: string[],
  formatHeaderDate: (dateStr: string) => string,
  splitSessions = true,
) {
  if (splitSessions) {
    const headerRow1: string[] = ["STT", "Name"];
    const headerRow2: string[] = ["", ""];

    sessionDays.forEach((day) => {
      headerRow1.push(formatHeaderDate(day), "");
      headerRow2.push("TL", "GL");
    });

    headerRow1.push("P", "V", "E");
    headerRow2.push("", "", "");

    const dataRows = matrixData.map((row) => {
      const dayMarks = sessionDays.flatMap((day) => {
        const mark = row.attendanceMap[day] ?? "";
        return [mark, mark];
      });

      return [
        row.globalIndex,
        `${row.name}\n${row.qrCode ?? row.id}`,
        ...dayMarks,
        row.totalP,
        row.totalV,
        row.totalE,
      ];
    });

    const sheetData = [headerRow1, headerRow2, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
    ];

    sessionDays.forEach((_, index) => {
      const col = 2 + index * 2;
      merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + 1 } });
    });

    const totalStartCol = 2 + sessionDays.length * 2;
    merges.push(
      { s: { r: 0, c: totalStartCol }, e: { r: 1, c: totalStartCol } },
      {
        s: { r: 0, c: totalStartCol + 1 },
        e: { r: 1, c: totalStartCol + 1 },
      },
      {
        s: { r: 0, c: totalStartCol + 2 },
        e: { r: 1, c: totalStartCol + 2 },
      },
    );

    worksheet["!merges"] = merges;
    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 30 },
      ...sessionDays.flatMap(() => [{ wch: 5 }, { wch: 5 }]),
      { wch: 6 },
      { wch: 6 },
      { wch: 6 },
    ];

    return worksheet;
  }

  const headerRow = [
    "STT",
    "Name",
    ...sessionDays.map(formatHeaderDate),
    "P",
    "V",
    "E",
  ];
  const dataRows = matrixData.map((row) => [
    row.globalIndex,
    `${row.name}\n${row.qrCode ?? row.id}`,
    ...sessionDays.map((day) => row.attendanceMap[day] ?? ""),
    row.totalP,
    row.totalV,
    row.totalE,
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 30 },
    ...sessionDays.map(() => ({ wch: 5 })),
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
  ];

  return worksheet;
}

function statusToMark(status: string): "P" | "V" | "E" {
  if (status === "absent") return "V";
  if (status === "excused_absence" || status === "excused") return "E";
  return "P";
}

function groupAttendanceByStudent(
  records: AttendanceRecord[],
): Record<string, AttendanceRecord[]> {
  return records.reduce<Record<string, AttendanceRecord[]>>((acc, record) => {
    if (!acc[record.studentId]) {
      acc[record.studentId] = [];
    }
    acc[record.studentId].push(record);
    return acc;
  }, {});
}

function toDateString(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  return value.split("T")[0];
}

function getSundaysBetween(startDate: string, endDate: string): string[] {
  const start = new Date(toDateString(startDate));
  const end = new Date(toDateString(endDate));

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
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

function getMonthsFromPeriodConfigs(
  configs: AttendancePeriodConfig[],
): string[] {
  const months = new Set<string>();

  configs.forEach((config) => {
    const start = new Date(toDateString(config.startDate));
    const end = new Date(toDateString(config.endDate));

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start > end
    ) {
      return;
    }

    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (current <= lastMonth) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, "0");
      months.add(`${y}-${m}`);
      current.setMonth(current.getMonth() + 1);
    }
  });

  return [...months].sort();
}

function getRegularDaysFromPeriodConfigs(
  configs: AttendancePeriodConfig[],
  month: string,
): string[] {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  if (!year || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return [];
  }

  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  const days: string[] = [];
  const current = new Date(monthStart);

  while (current <= monthEnd) {
    if (current.getDay() !== 0) {
      const dateStr = toDateString(current);
      const inConfig = configs.some((config) => {
        const start = toDateString(config.startDate);
        const end = toDateString(config.endDate);
        return dateStr >= start && dateStr <= end;
      });

      if (inConfig) {
        days.push(dateStr);
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function getDefaultMonthForDate(availableMonths: string[], date: Date): string {
  if (availableMonths.length === 0) return "";

  const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  if (availableMonths.includes(currentMonth)) {
    return currentMonth;
  }

  return availableMonths[availableMonths.length - 1] ?? "";
}

function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split("-");
  return `${monthNum}/${year}`;
}

function mergeDateRanges(
  ranges: Array<{ dateFrom: string; dateTo: string } | null>,
): { dateFrom: string; dateTo: string } | null {
  const validRanges = ranges.filter(
    (range): range is { dateFrom: string; dateTo: string } => range != null,
  );

  if (validRanges.length === 0) return null;

  return validRanges.reduce(
    (acc, range) => ({
      dateFrom: range.dateFrom < acc.dateFrom ? range.dateFrom : acc.dateFrom,
      dateTo: range.dateTo > acc.dateTo ? range.dateTo : acc.dateTo,
    }),
    validRanges[0],
  );
}

function buildMatrixData(
  filteredStudents: StudentRecord[],
  attendanceByStudent: Record<string, AttendanceRecord[]>,
  daySet: Set<string>,
  splitSessions = true,
) {
  const sessionWeight = splitSessions ? 2 : 1;

  return filteredStudents.map((student, index) => {
    const attendanceMap: Record<string, string> = {};
    let totalP = 0;
    let totalV = 0;
    let totalE = 0;

    const records = attendanceByStudent[student.id] ?? [];

    records.forEach((record) => {
      const date = normalizeAttendanceDate(record.date);
      if (!daySet.has(date)) return;

      const mark = statusToMark(record.status);
      attendanceMap[date] = mark;

      if (mark === "P") totalP += sessionWeight;
      else if (mark === "V") totalV += sessionWeight;
      else if (mark === "E") totalE += sessionWeight;
    });

    return {
      ...student,
      globalIndex: index + 1,
      attendanceMap,
      totalP,
      totalV,
      totalE,
    };
  });
}

function buildReportSummary(
  matrixData: MatrixExportRow[],
  sessionDayCount: number,
) {
  const totals = matrixData.reduce(
    (acc, row) => {
      acc.present += row.totalP;
      acc.absent += row.totalV;
      acc.excused += row.totalE;
      return acc;
    },
    { present: 0, absent: 0, excused: 0 },
  );

  return {
    studentCount: matrixData.length,
    sessionCount: sessionDayCount,
    ...totals,
  };
}

function getCellStyles(mark: string) {
  switch (mark) {
    case "P":
      return { color: "#10b981", bgcolor: "rgba(16, 185, 129, 0.05)" };
    case "V":
      return { color: "#ef4444", bgcolor: "rgba(239, 68, 68, 0.05)" };
    case "E":
      return { color: "#f59e0b", bgcolor: "rgba(245, 158, 11, 0.05)" };
    default:
      return { color: "inherit", bgcolor: "inherit" };
  }
}

type AttendanceMatrixReportProps = {
  title: string;
  sessionDays: string[];
  sessionCountLabel: string;
  matrixData: MatrixExportRow[];
  reportSummary: ReturnType<typeof buildReportSummary>;
  loading: boolean;
  filtersLoading: boolean;
  fetchError: string;
  filtersError: string;
  students: StudentRecord[];
  user: User | null;
  periodLabel: string;
  selectedAcademicYear: AcademicYear | null;
  attendanceLoading: boolean;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  rowsPerPage: number;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  filteredStudentCount: number;
  formatHeaderDate: (dateStr: string) => string;
  selectClassName: string;
  splitSessions?: boolean;
  filterMode?: "semester" | "month";
  selectedAcademicYearId?: string;
  onAcademicYearChange?: (academicYearId: string) => void;
  academicYearsList?: AcademicYear[];
  selectedSemester?: Semester | null;
  onSemesterChange?: (semesterId: string) => void;
  availableSemesters?: Semester[];
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  availableMonths?: string[];
};

function AttendanceMatrixReport({
  title,
  sessionDays,
  sessionCountLabel,
  matrixData,
  reportSummary,
  loading,
  filtersLoading,
  fetchError,
  filtersError,
  students,
  user,
  periodLabel,
  selectedAcademicYear,
  attendanceLoading,
  searchTerm,
  onSearchTermChange,
  rowsPerPage,
  onRowsPerPageChange,
  filteredStudentCount,
  formatHeaderDate,
  selectClassName,
  splitSessions = true,
  filterMode = "semester",
  selectedAcademicYearId = "",
  onAcademicYearChange,
  academicYearsList = [],
  selectedSemester = null,
  onSemesterChange,
  availableSemesters = [],
  selectedMonth = "",
  onMonthChange,
  availableMonths = [],
}: AttendanceMatrixReportProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(matrixData.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginatedData = matrixData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  if (loading || filtersLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-zinc-500">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
        <p>Loading attendance data...</p>
      </div>
    );
  }

  if (fetchError || filtersError) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-red-200 px-4 py-20 text-center dark:border-red-800">
        <p className="text-red-600 dark:text-red-400">
          {fetchError || filtersError}
        </p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-zinc-200 py-20 text-center dark:border-zinc-800">
        <h2 className="mb-2 text-xl font-medium text-zinc-900 dark:text-zinc-100">
          No students
        </h2>
        <p className="mx-auto max-w-sm text-zinc-500 dark:text-zinc-400">
          {user?.classId
            ? "No students in your class."
            : "Account not assigned to a class."}
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{title}</CardTitle>
              <Chip
                label={reportSummary.studentCount}
                size="small"
                color="primary"
                sx={{ color: "white", fontWeight: 700 }}
              />
            </div>
            <CardDescription className="mt-1">
              {periodLabel}
              {filterMode === "semester" && selectedAcademicYear
                ? ` · ${selectedAcademicYear.name}`
                : ""}{" "}
              · {reportSummary.sessionCount} {sessionCountLabel}
              {attendanceLoading && (
                <span className="ml-2 inline-flex items-center gap-1 text-indigo-500">
                  <Loader2 size={12} className="animate-spin" />
                  Loading attendance data...
                </span>
              )}
            </CardDescription>
          </div>

          <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/30">
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Total P
              </p>
              <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                {reportSummary.present}
              </p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/30">
              <p className="text-xs text-red-700 dark:text-red-300">Total V</p>
              <p className="text-lg font-bold text-red-800 dark:text-red-200">
                {reportSummary.absent}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Total E
              </p>
              <p className="text-lg font-bold text-amber-800 dark:text-amber-200">
                {reportSummary.excused}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="search"
              placeholder="Search by name or student ID..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filterMode === "semester" ? (
              <>
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-zinc-400" />
                  <select
                    value={selectedAcademicYearId}
                    onChange={(e) => onAcademicYearChange?.(e.target.value)}
                    className={selectClassName}
                    aria-label="Academic year"
                    disabled={academicYearsList.length === 0}
                  >
                    {academicYearsList.length === 0 ? (
                      <option value="">No academic year</option>
                    ) : (
                      academicYearsList.map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <select
                  value={selectedSemester?.id ?? ""}
                  onChange={(e) => onSemesterChange?.(e.target.value)}
                  className={selectClassName}
                  aria-label="Semester"
                  disabled={availableSemesters.length === 0}
                >
                  {availableSemesters.length === 0 ? (
                    <option value="">No semester</option>
                  ) : (
                    availableSemesters.map((semesterOption) => (
                      <option key={semesterOption.id} value={semesterOption.id}>
                        {semesterOption.name}
                      </option>
                    ))
                  )}
                </select>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-zinc-400" />
                <select
                  value={selectedMonth}
                  onChange={(e) => onMonthChange?.(e.target.value)}
                  className={selectClassName}
                  aria-label="Month"
                  disabled={availableMonths.length === 0}
                >
                  {availableMonths.length === 0 ? (
                    <option value="">No month configured</option>
                  ) : (
                    availableMonths.map((month) => (
                      <option key={month} value={month}>
                        {formatMonthLabel(month)}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            <select
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
              className={selectClassName}
              aria-label="Rows per page"
            >
              {ROWS_PER_PAGE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/50">
          <span className="font-medium text-zinc-600 dark:text-zinc-300">
            Notes:
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-bold text-emerald-600">P</span> Present
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-bold text-red-600">V</span> Absent
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-bold text-amber-600">E</span> Excused
          </span>
          <span className="text-zinc-400">|</span>
          {splitSessions ? (
            <>
              <span>TL = Sunday Service</span>
              <span>GL = Gospel</span>
            </>
          ) : (
            <span>One mark per class day</span>
          )}
          <span className="inline-flex items-center gap-1 text-zinc-500">
            <Users size={12} />
            {filteredStudentCount} students
          </span>
        </div>

        {filteredStudentCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-800">
            <p className="text-zinc-500 dark:text-zinc-400">
              No students found matching the search criteria.
            </p>
          </div>
        ) : filterMode === "semester" && !selectedSemester ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-800">
            <p className="text-zinc-500 dark:text-zinc-400">
              No semester configured for the selected academic year.
            </p>
          </div>
        ) : filterMode === "month" && sessionDays.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-800">
            <p className="text-zinc-500 dark:text-zinc-400">
              No regular class days configured for the selected month.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full">
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 3,
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                border: "1px solid rgba(0,0,0,0.05)",
                maxHeight: "62vh",
                overflow: "auto",
                opacity: attendanceLoading ? 0.6 : 1,
                transition: "opacity 0.2s ease",
              }}
            >
              <Table
                stickyHeader
                size="small"
                sx={{ minWidth: "max-content", borderCollapse: "collapse" }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell
                      rowSpan={splitSessions ? 2 : 1}
                      sx={{
                        bgcolor: "#f8fafc",
                        fontWeight: 700,
                        border: "1px solid #e2e8f0",
                        position: "sticky",
                        left: 0,
                        zIndex: 3,
                        top: 0,
                        minWidth: 48,
                      }}
                    >
                      STT
                    </TableCell>
                    <TableCell
                      rowSpan={splitSessions ? 2 : 1}
                      sx={{
                        bgcolor: "#f8fafc",
                        fontWeight: 700,
                        border: "1px solid #e2e8f0",
                        minWidth: 180,
                        position: "sticky",
                        left: 48,
                        zIndex: 3,
                        top: 0,
                      }}
                    >
                      Name
                    </TableCell>

                    {sessionDays.map((day) => (
                      <TableCell
                        key={day}
                        align="center"
                        colSpan={splitSessions ? 2 : 1}
                        sx={{
                          bgcolor: "#f8fafc",
                          fontWeight: 700,
                          border: "1px solid #e2e8f0",
                          p: 0.5,
                          fontSize: "0.8rem",
                          whiteSpace: "nowrap",
                          top: 0,
                          zIndex: 2,
                        }}
                      >
                        {formatHeaderDate(day)}
                      </TableCell>
                    ))}

                    <TableCell
                      rowSpan={splitSessions ? 2 : 1}
                      sx={{
                        bgcolor: "#ecfdf5",
                        color: "#047857",
                        fontWeight: 800,
                        border: "1px solid #e2e8f0",
                        top: 0,
                        zIndex: 2,
                      }}
                      align="center"
                    >
                      P
                    </TableCell>
                    <TableCell
                      rowSpan={splitSessions ? 2 : 1}
                      sx={{
                        bgcolor: "#fef2f2",
                        color: "#be123c",
                        fontWeight: 800,
                        border: "1px solid #e2e8f0",
                        top: 0,
                        zIndex: 2,
                      }}
                      align="center"
                    >
                      V
                    </TableCell>
                    <TableCell
                      rowSpan={splitSessions ? 2 : 1}
                      sx={{
                        bgcolor: "#fffbeb",
                        color: "#b45309",
                        fontWeight: 800,
                        border: "1px solid #e2e8f0",
                        top: 0,
                        zIndex: 2,
                      }}
                      align="center"
                    >
                      E
                    </TableCell>
                  </TableRow>

                  {splitSessions && (
                    <TableRow>
                      {sessionDays.map((day) => (
                        <React.Fragment key={`${day}-sub`}>
                          <TableCell
                            align="center"
                            sx={{
                              bgcolor: "#f8fafc",
                              fontWeight: 700,
                              border: "1px solid #e2e8f0",
                              p: 0.5,
                              minWidth: 36,
                              fontSize: "0.75rem",
                              top: 36,
                              zIndex: 2,
                            }}
                          >
                            TL
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              bgcolor: "#f8fafc",
                              fontWeight: 700,
                              border: "1px solid #e2e8f0",
                              p: 0.5,
                              minWidth: 36,
                              fontSize: "0.75rem",
                              top: 36,
                              zIndex: 2,
                            }}
                          >
                            GL
                          </TableCell>
                        </React.Fragment>
                      ))}
                    </TableRow>
                  )}
                </TableHead>

                <TableBody>
                  {paginatedData.map((student) => (
                    <TableRow
                      key={student.qrCode ?? student.id}
                      hover
                      sx={{
                        "&:hover": { bgcolor: "rgba(99, 102, 241, 0.03)" },
                      }}
                    >
                      <TableCell
                        align="center"
                        sx={{
                          border: "1px solid #e2e8f0",
                          bgcolor: "background.paper",
                          position: "sticky",
                          left: 0,
                          zIndex: 1,
                        }}
                      >
                        {student.globalIndex}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid #e2e8f0",
                          bgcolor: "background.paper",
                          fontWeight: 500,
                          position: "sticky",
                          left: 48,
                          zIndex: 1,
                        }}
                      >
                        {student.name}
                        <Typography
                          variant="caption"
                          display="block"
                          color="text.secondary"
                          sx={{ fontSize: "0.65rem" }}
                        >
                          {student.qrCode ?? student.id}
                        </Typography>
                      </TableCell>

                      {sessionDays.map((day) => {
                        const mark = student.attendanceMap[day] ?? "";
                        const markStyle = getCellStyles(mark);

                        if (splitSessions) {
                          return (
                            <React.Fragment key={day}>
                              <TableCell
                                align="center"
                                sx={{
                                  border: "1px solid #e2e8f0",
                                  p: 0,
                                  fontWeight: 700,
                                  fontSize: "0.85rem",
                                  color: markStyle.color,
                                  bgcolor: markStyle.bgcolor,
                                }}
                              >
                                {mark}
                              </TableCell>
                              <TableCell
                                align="center"
                                sx={{
                                  border: "1px solid #e2e8f0",
                                  p: 0,
                                  fontWeight: 700,
                                  fontSize: "0.85rem",
                                  color: markStyle.color,
                                  bgcolor: markStyle.bgcolor,
                                }}
                              >
                                {mark}
                              </TableCell>
                            </React.Fragment>
                          );
                        }

                        return (
                          <TableCell
                            key={day}
                            align="center"
                            sx={{
                              border: "1px solid #e2e8f0",
                              p: 0,
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              color: markStyle.color,
                              bgcolor: markStyle.bgcolor,
                            }}
                          >
                            {mark}
                          </TableCell>
                        );
                      })}

                      <TableCell
                        align="center"
                        sx={{
                          border: "1px solid #e2e8f0",
                          fontWeight: 700,
                          color: "#047857",
                          bgcolor: "#ecfdf5",
                        }}
                      >
                        {student.totalP}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          border: "1px solid #e2e8f0",
                          fontWeight: 700,
                          color: "#be123c",
                          bgcolor: "#fef2f2",
                        }}
                      >
                        {student.totalV}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          border: "1px solid #e2e8f0",
                          fontWeight: 700,
                          color: "#b45309",
                          bgcolor: "#fffbeb",
                        }}
                      >
                        {student.totalE}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Display{" "}
                {matrixData.length === 0
                  ? 0
                  : (currentPage - 1) * rowsPerPage + 1}
                –{Math.min(currentPage * rowsPerPage, matrixData.length)} /{" "}
                {matrixData.length} students
              </p>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getSemestersForAcademicYear(
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

function getAcademicYearForDate(
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

function getDefaultSemesterForDate(
  semesters: Semester[],
  referenceDate = new Date(),
): Semester | null {
  if (semesters.length === 0) return null;

  const today = toDateString(referenceDate);
  const currentSemester = semesters.find((semester) => {
    const start = toDateString(semester.startDate);
    const end = toDateString(semester.endDate);
    return today >= start && today <= end;
  });

  return currentSemester ?? semesters[0] ?? null;
}

async function fetchStudentsForUser(user: User) {
  if (!user.classId) {
    return {
      students: [] as StudentRecord[],
      error:
        user.role === "teacher"
          ? "Teacher not assigned to a class (classId). Please update in Settings."
          : "Account not assigned to a class (classId).",
    };
  }

  try {
    const students = await getStudents({ classId: user.classId });
    return { students, error: "" };
  } catch (err) {
    console.error(err);
    return {
      students: [] as StudentRecord[],
      error: "Unable to load student list.",
    };
  }
}

export function AttendanceReport() {
  const { user } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [attendanceByStudent, setAttendanceByStudent] = useState<
    Record<string, AttendanceRecord[]>
  >({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [reportTab, setReportTab] = useState<"sunday" | "regular">("sunday");
  const [academicYearsList, setAcademicYearsList] = useState<AcademicYear[]>(
    [],
  );
  const [semestersList, setSemestersList] = useState<Semester[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [filtersError, setFiltersError] = useState("");
  const [isSpecialClass, setIsSpecialClass] = useState(false);
  const [regularPeriodConfigs, setRegularPeriodConfigs] = useState<
    AttendancePeriodConfig[]
  >([]);
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!user?.classId) {
        if (!cancelled) {
          setIsSpecialClass(false);
        }
        return;
      }

      try {
        const classInfo = await getClassById(user.classId);
        if (!cancelled) {
          setIsSpecialClass(classInfo?.isSpecialClass === true);
        }
      } catch (err) {
        console.error("Failed to load class info:", err);
        if (!cancelled) {
          setIsSpecialClass(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.classId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setFiltersLoading(true);
      setFiltersError("");

      try {
        const requests: [
          Promise<AcademicYear[]>,
          Promise<Semester[]>,
          Promise<AttendancePeriodConfig[]>,
        ] = [
          getAcademicYears(),
          getSemesters(),
          getActiveAttendancePeriodConfigsByType("regular"),
        ];
        const [years, semesters, regularConfigs] = await Promise.all(requests);
        if (cancelled) return;

        const sortedYears = [...years].sort(
          (a, b) =>
            new Date(toDateString(b.startDate)).getTime() -
            new Date(toDateString(a.startDate)).getTime(),
        );
        const activeSemesters = semesters
          .filter((semester) => semester.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const availableMonths = getMonthsFromPeriodConfigs(regularConfigs);

        setAcademicYearsList(sortedYears);
        setSemestersList(activeSemesters);
        setRegularPeriodConfigs(regularConfigs);
        setSelectedMonth(getDefaultMonthForDate(availableMonths, new Date()));

        const today = new Date();
        const defaultYear = getAcademicYearForDate(sortedYears, today);
        if (!defaultYear) {
          setSelectedAcademicYearId("");
          setSelectedSemesterId("");
          return;
        }

        setSelectedAcademicYearId(defaultYear.id);
        const defaultSemesters = getSemestersForAcademicYear(
          activeSemesters,
          defaultYear,
        );
        setSelectedSemesterId(
          getDefaultSemesterForDate(defaultSemesters, today)?.id ?? "",
        );
      } catch (err) {
        console.error("Failed to load attendance report filters:", err);
        if (!cancelled) {
          setFiltersError(
            "Unable to load academic year, semester, or attendance period config.",
          );
        }
      } finally {
        if (!cancelled) {
          setFiltersLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setFetchError("");

      const result = await fetchStudentsForUser(user);
      if (cancelled) return;

      setStudents(result.students);
      setFetchError(result.error);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const selectedAcademicYear = useMemo(
    () =>
      academicYearsList.find((year) => year.id === selectedAcademicYearId) ??
      null,
    [academicYearsList, selectedAcademicYearId],
  );

  const availableSemesters = useMemo(() => {
    if (!selectedAcademicYear) return [];
    return getSemestersForAcademicYear(semestersList, selectedAcademicYear);
  }, [semestersList, selectedAcademicYear]);

  const selectedSemester = useMemo(() => {
    return (
      availableSemesters.find(
        (semester) => semester.id === selectedSemesterId,
      ) ??
      availableSemesters[0] ??
      null
    );
  }, [availableSemesters, selectedSemesterId]);

  const sundays = useMemo(() => {
    if (!selectedSemester) return [];
    return getSundaysBetween(
      selectedSemester.startDate,
      selectedSemester.endDate,
    );
  }, [selectedSemester]);

  const sundaySet = useMemo(() => new Set(sundays), [sundays]);

  const availableMonths = useMemo(
    () => getMonthsFromPeriodConfigs(regularPeriodConfigs),
    [regularPeriodConfigs],
  );

  const regularDays = useMemo(() => {
    if (!selectedMonth) return [];
    return getRegularDaysFromPeriodConfigs(regularPeriodConfigs, selectedMonth);
  }, [regularPeriodConfigs, selectedMonth]);

  const regularDaySet = useMemo(() => new Set(regularDays), [regularDays]);

  const sundayDateRange = useMemo(() => {
    if (!selectedSemester) return null;
    return {
      dateFrom: toDateString(selectedSemester.startDate),
      dateTo: toDateString(selectedSemester.endDate),
    };
  }, [selectedSemester]);

  const regularDateRange = useMemo(() => {
    if (!isSpecialClass || regularDays.length === 0) return null;
    return {
      dateFrom: regularDays[0],
      dateTo: regularDays[regularDays.length - 1],
    };
  }, [isSpecialClass, regularDays]);

  const attendanceFetchRange = useMemo(
    () => mergeDateRanges([sundayDateRange, regularDateRange]),
    [sundayDateRange, regularDateRange],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (students.length === 0 || !attendanceFetchRange) {
        if (!cancelled) {
          setAttendanceByStudent({});
          setAttendanceLoading(false);
        }
        return;
      }

      setAttendanceLoading(true);
      try {
        const records = await getAttendanceRecordsByStudentIds({
          studentIds: students.map((student) => student.id),
          dateFrom: attendanceFetchRange.dateFrom,
          dateTo: attendanceFetchRange.dateTo,
          semesterId: selectedSemesterId || undefined,
        });
        if (cancelled) return;
        setAttendanceByStudent(groupAttendanceByStudent(records));
      } catch (err) {
        console.error("Failed to load attendance records:", err);
        if (!cancelled) {
          setAttendanceByStudent({});
        }
      } finally {
        if (!cancelled) {
          setAttendanceLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [students, attendanceFetchRange, selectedSemesterId]);

  const formatHeaderDate = (dateStr: string) => {
    const [, m, d] = dateStr.split("-");
    return `${d}/${m}`;
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;

    const q = searchTerm.toLowerCase();
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(q) ||
        student.id.toLowerCase().includes(q),
    );
  }, [students, searchTerm]);

  const displayClassName =
    students[0]?.class?.name ??
    (user?.classId ? `Class ${user.classId.slice(0, 8)}...` : "—");

  const sundayPeriodLabel = selectedSemester
    ? `${selectedSemester.name} (${formatHeaderDate(toDateString(selectedSemester.startDate))} – ${formatHeaderDate(toDateString(selectedSemester.endDate))})`
    : "No semester selected";

  const regularPeriodLabel = selectedMonth
    ? `Month ${formatMonthLabel(selectedMonth)}`
    : "No month selected";

  const handleAcademicYearChange = (academicYearId: string) => {
    setSelectedAcademicYearId(academicYearId);
    const year = academicYearsList.find((item) => item.id === academicYearId);
    if (year) {
      const semesters = getSemestersForAcademicYear(semestersList, year);
      setSelectedSemesterId(
        getDefaultSemesterForDate(semesters, new Date())?.id ?? "",
      );
    } else {
      setSelectedSemesterId("");
    }
  };

  const activeReportTab: "sunday" | "regular" =
    isSpecialClass && reportTab === "regular" ? "regular" : "sunday";

  const sundayMatrixData = useMemo(
    () =>
      buildMatrixData(filteredStudents, attendanceByStudent, sundaySet, true),
    [filteredStudents, sundaySet, attendanceByStudent],
  );

  const regularMatrixData = useMemo(
    () =>
      buildMatrixData(
        filteredStudents,
        attendanceByStudent,
        regularDaySet,
        false,
      ),
    [filteredStudents, regularDaySet, attendanceByStudent],
  );

  const sundayReportSummary = useMemo(
    () => buildReportSummary(sundayMatrixData, sundays.length),
    [sundayMatrixData, sundays.length],
  );

  const regularReportSummary = useMemo(
    () => buildReportSummary(regularMatrixData, regularDays.length),
    [regularMatrixData, regularDays.length],
  );

  const activeMatrixData =
    activeReportTab === "sunday" ? sundayMatrixData : regularMatrixData;
  const activeSessionDays =
    activeReportTab === "sunday" ? sundays : regularDays;

  const selectClassName =
    "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  const sharedSundayReportPanelProps = {
    loading,
    filtersLoading,
    fetchError,
    filtersError,
    students,
    user,
    periodLabel: sundayPeriodLabel,
    selectedAcademicYear,
    attendanceLoading,
    searchTerm,
    onSearchTermChange: setSearchTerm,
    selectedAcademicYearId,
    onAcademicYearChange: handleAcademicYearChange,
    academicYearsList,
    selectedSemester,
    onSemesterChange: setSelectedSemesterId,
    availableSemesters,
    rowsPerPage,
    onRowsPerPageChange: setRowsPerPage,
    filteredStudentCount: filteredStudents.length,
    formatHeaderDate,
    selectClassName,
    filterMode: "semester" as const,
  };

  const sharedRegularReportPanelProps = {
    loading,
    filtersLoading,
    fetchError,
    filtersError,
    students,
    user,
    periodLabel: regularPeriodLabel,
    selectedAcademicYear: null,
    attendanceLoading,
    searchTerm,
    onSearchTermChange: setSearchTerm,
    rowsPerPage,
    onRowsPerPageChange: setRowsPerPage,
    filteredStudentCount: filteredStudents.length,
    formatHeaderDate,
    selectClassName,
    filterMode: "month" as const,
    selectedMonth,
    onMonthChange: setSelectedMonth,
    availableMonths,
  };

  const handleExport = () => {
    if (activeMatrixData.length === 0) {
      toast.error("Không có dữ liệu để xuất");
      return;
    }

    if (activeReportTab === "sunday" && !selectedSemester) {
      toast.error("Không có dữ liệu để xuất");
      return;
    }

    if (activeReportTab === "regular" && regularDays.length === 0) {
      toast.error("Không có dữ liệu để xuất");
      return;
    }

    const worksheet = buildAttendanceMatrixSheet(
      activeMatrixData,
      activeSessionDays,
      formatHeaderDate,
      activeReportTab === "sunday",
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Diem danh");

    const exportPrefix =
      activeReportTab === "sunday" ? "Diem_danh_CN" : "Diem_danh_thuong";
    const periodSuffix =
      activeReportTab === "sunday"
        ? `${selectedAcademicYear?.name ?? "nam_hoc"}_${selectedSemester?.code || selectedSemester?.name || "hoc_ky"}`
        : formatMonthLabel(selectedMonth).replace("/", "-");
    const fileName = sanitizeFileName(
      `${exportPrefix}_${periodSuffix}_${displayClassName}.xlsx`,
    );

    XLSX.writeFile(workbook, fileName);
    toast.success("Exported attendance report successfully");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Attendance Report
            </h1>
            {user && (
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 px-2.5 py-1"
              >
                <UserIcon size={12} className="text-indigo-500" />
                <span className="text-xs font-medium capitalize">
                  {user.role}
                </span>
              </Badge>
            )}
            {!loading && !fetchError && students.length > 0 && (
              <Badge variant="outline" className="px-2.5 py-1">
                {displayClassName}
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          disabled={loading || activeMatrixData.length === 0}
          onClick={handleExport}
        >
          <FileDown size={16} className="mr-2" />
          Export Report
        </Button>
      </div>

      <Tabs
        value={activeReportTab}
        onValueChange={(value) => {
          if (value === "regular" && !isSpecialClass) return;
          setReportTab(value as "sunday" | "regular");
        }}
        className="w-full"
      >
        <TabsList
          className={`grid w-full max-w-md ${isSpecialClass ? "grid-cols-2" : "grid-cols-1"}`}
        >
          <TabsTrigger value="sunday" className="flex items-center gap-2">
            Sunday Attendance
          </TabsTrigger>
          {isSpecialClass && (
            <TabsTrigger value="regular" className="flex items-center gap-2">
              Regular Attendance
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="sunday" className="mt-6">
          <AttendanceMatrixReport
            {...sharedSundayReportPanelProps}
            title="Sunday Attendance Table"
            sessionDays={sundays}
            sessionCountLabel="Sunday sessions"
            matrixData={sundayMatrixData}
            reportSummary={sundayReportSummary}
            splitSessions
          />
        </TabsContent>

        {isSpecialClass && (
          <TabsContent value="regular" className="mt-6">
            <AttendanceMatrixReport
              {...sharedRegularReportPanelProps}
              title="Regular Attendance Table"
              sessionDays={regularDays}
              sessionCountLabel="regular class days (Mon-Sat)"
              matrixData={regularMatrixData}
              reportSummary={regularReportSummary}
              splitSessions={false}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
