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
  attendanceMap: Record<string, { TL: string; GL: string }>;
  totalP: number;
  totalV: number;
  totalE: number;
};

function buildAttendanceMatrixSheet(
  matrixData: MatrixExportRow[],
  sundays: string[],
  formatHeaderDate: (dateStr: string) => string,
) {
  const headerRow1: string[] = ["STT", "Name"];
  const headerRow2: string[] = ["", ""];

  sundays.forEach((day) => {
    headerRow1.push(formatHeaderDate(day), "");
    headerRow2.push("TL", "GL");
  });

  headerRow1.push("P", "V", "E");
  headerRow2.push("", "", "");

  const dataRows = matrixData.map((row) => {
    const dayMarks = sundays.flatMap((day) => [
      row.attendanceMap[day]?.TL ?? "",
      row.attendanceMap[day]?.GL ?? "",
    ]);

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

  sundays.forEach((_, index) => {
    const col = 2 + index * 2;
    merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + 1 } });
  });

  const totalStartCol = 2 + sundays.length * 2;
  merges.push(
    { s: { r: 0, c: totalStartCol }, e: { r: 1, c: totalStartCol } },
    { s: { r: 0, c: totalStartCol + 1 }, e: { r: 1, c: totalStartCol + 1 } },
    { s: { r: 0, c: totalStartCol + 2 }, e: { r: 1, c: totalStartCol + 2 } },
  );

  worksheet["!merges"] = merges;
  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 30 },
    ...sundays.flatMap(() => [{ wch: 5 }, { wch: 5 }]),
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
  const [page, setPage] = useState(1);

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
      setPage(1);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Default to current academic year
  const [academicYear, setAcademicYear] = useState(() => {
    const d = new Date();
    const year = d.getMonth() < 7 ? d.getFullYear() - 1 : d.getFullYear();
    return year;
  });

  const [semester, setSemester] = useState<1 | 2>(1);

  // Generate an array of academic years for the dropdown
  const academicYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
      years.push(i);
    }
    return years;
  }, []);

  // Calculate all Sundays within the selected semester
  const sundays = useMemo(() => {
    const startYear = semester === 1 ? academicYear : academicYear + 1;
    const startMonth = semester === 1 ? 7 : 0; // 7 = Aug, 0 = Jan (0-indexed)
    const endYear = semester === 1 ? academicYear : academicYear + 1;
    const endMonth = semester === 1 ? 11 : 5; // 11 = Dec, 5 = Jun

    const start = new Date(startYear, startMonth, 1);
    const end = new Date(endYear, endMonth + 1, 0); // Last day of endMonth

    const days: string[] = [];
    const current = new Date(start);

    // Move to the first Sunday
    while (current.getDay() !== 0) {
      current.setDate(current.getDate() + 1);
    }

    // Add all Sundays up to the end date
    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, "0");
      const d = String(current.getDate()).padStart(2, "0");
      days.push(`${y}-${m}-${d}`);

      current.setDate(current.getDate() + 7);
    }
    return days;
  }, [academicYear, semester]);

  const sundaySet = useMemo(() => new Set(sundays), [sundays]);

  const semesterDateRange = useMemo(() => {
    if (sundays.length === 0) return null;
    return {
      dateFrom: sundays[0],
      dateTo: sundays[sundays.length - 1],
    };
  }, [sundays]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (students.length === 0 || !semesterDateRange) {
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
          dateFrom: semesterDateRange.dateFrom,
          dateTo: semesterDateRange.dateTo,
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
  }, [students, semesterDateRange]);

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

  const semesterLabel =
    semester === 1
      ? `Semester 1 (${academicYear} – T8/T12)`
      : `Semester 2 (${academicYear + 1} – T1/T6)`;

  const matrixData = useMemo(() => {
    return filteredStudents.map((student, index) => {
      const attendanceMap: Record<string, { TL: string; GL: string }> = {};
      let totalP = 0;
      let totalV = 0;
      let totalE = 0;

      const records = attendanceByStudent[student.id] ?? [];

      records.forEach((record) => {
        const date = normalizeAttendanceDate(record.date);
        if (!sundaySet.has(date)) return;

        const mark = statusToMark(record.status);
        attendanceMap[date] = { TL: mark, GL: mark };

        if (mark === "P") totalP += 2;
        else if (mark === "V") totalV += 2;
        else if (mark === "E") totalE += 2;
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
  }, [filteredStudents, sundaySet, attendanceByStudent]);

  const reportSummary = useMemo(() => {
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
      sessionCount: sundays.length,
      ...totals,
    };
  }, [matrixData, sundays.length]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(matrixData.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginatedData = matrixData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  // Helper to render colored cells
  const getCellStyles = (mark: string) => {
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
  };

  const selectClassName =
    "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  const handleExport = () => {
    if (matrixData.length === 0) {
      toast.error("Không có dữ liệu để xuất");
      return;
    }

    const worksheet = buildAttendanceMatrixSheet(
      matrixData,
      sundays,
      formatHeaderDate,
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Diem danh");

    const fileName = sanitizeFileName(
      `Diem_danh_CN_${academicYear}_HK${semester}_${displayClassName}.xlsx`,
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
          <p className="max-w-2xl text-zinc-500 dark:text-zinc-400">
            Track Sunday attendance (TL/GL) by semester. Only display students
            in your class.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={loading || matrixData.length === 0}
          onClick={handleExport}
        >
          <FileDown size={16} className="mr-2" />
          Export Report
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-zinc-500">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
          <p>Loading attendance data...</p>
        </div>
      ) : fetchError ? (
        <div className="rounded-3xl border-2 border-dashed border-red-200 px-4 py-20 text-center dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{fetchError}</p>
        </div>
      ) : students.length === 0 ? (
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
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>Attendance Table</CardTitle>
                  <Chip
                    label={reportSummary.studentCount}
                    size="small"
                    color="primary"
                    sx={{ color: "white", fontWeight: 700 }}
                  />
                </div>
                <CardDescription className="mt-1">
                  {semesterLabel} · Academic year {academicYear}-
                  {academicYear + 1} · {reportSummary.sessionCount} Sunday
                  sessions
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
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Total V
                  </p>
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
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-zinc-400" />
                  <select
                    value={academicYear}
                    onChange={(e) => {
                      setAcademicYear(Number(e.target.value));
                      setPage(1);
                    }}
                    className={selectClassName}
                    aria-label="Academic year"
                  >
                    {academicYears.map((year) => (
                      <option key={year} value={year}>
                        {year}-{year + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <select
                  value={semester}
                  onChange={(e) => {
                    setSemester(Number(e.target.value) as 1 | 2);
                    setPage(1);
                  }}
                  className={selectClassName}
                  aria-label="Semester"
                >
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                </select>

                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setPage(1);
                  }}
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
              <span>TL = Sunday Service</span>
              <span>GL = Gospel</span>
              <span className="inline-flex items-center gap-1 text-zinc-500">
                <Users size={12} />
                {filteredStudents.length} students
              </span>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-800">
                <p className="text-zinc-500 dark:text-zinc-400">
                  No students found matching the search criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-w-full max-h-[62vh]">
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
                          rowSpan={2}
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
                          rowSpan={2}
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

                        {sundays.map((day) => (
                          <TableCell
                            key={day}
                            align="center"
                            colSpan={2}
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
                          rowSpan={2}
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
                          rowSpan={2}
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
                          rowSpan={2}
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

                      <TableRow>
                        {sundays.map((day) => (
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

                          {sundays.map((day) => {
                            const marks = student.attendanceMap[day] || {
                              TL: "",
                              GL: "",
                            };
                            const styleTL = getCellStyles(marks.TL);
                            const styleGL = getCellStyles(marks.GL);

                            return (
                              <React.Fragment key={day}>
                                <TableCell
                                  align="center"
                                  sx={{
                                    border: "1px solid #e2e8f0",
                                    p: 0,
                                    fontWeight: 700,
                                    fontSize: "0.85rem",
                                    color: styleTL.color,
                                    bgcolor: styleTL.bgcolor,
                                  }}
                                >
                                  {marks.TL}
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    border: "1px solid #e2e8f0",
                                    p: 0,
                                    fontWeight: 700,
                                    fontSize: "0.85rem",
                                    color: styleGL.color,
                                    bgcolor: styleGL.bgcolor,
                                  }}
                                >
                                  {marks.GL}
                                </TableCell>
                              </React.Fragment>
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
      )}
    </div>
  );
}
