import { useState, useMemo, useEffect, useCallback } from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "../components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import {
  UserIcon,
  ChevronDown,
  Search,
  PlusCircle,
  Library,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Power,
  PowerOff,
  LockOpen,
  Lock,
  Download,
} from "lucide-react";
import { Chip, IconButton, Menu, MenuItem } from "@mui/material";
import { useAppContext } from "../context/useAppContext";
import type { User } from "../context/appContext";
import { cn } from "../lib/utils";
import { Link, useNavigate } from "react-router";
import { Pagination } from "../components/ui/pagination";
import {
  getStudents,
  type StudentRecord,
  deleteStudentById,
  getStudentById,
  deactivateStudentById,
  lockStudentById,
} from "@/lib/api/students";
import { getClassNameById } from "@/lib/api/classes";
import { getAcademicYears } from "@/lib/api/academicyear";
import { getSemesters } from "@/lib/api/semester";
import {
  getAttendanceRecordsByStudentIds,
  type AttendanceRecord,
} from "@/lib/api/attendancerecord";
import {
  calculateYearlyPresentRate,
  getAcademicYearForDate,
  getYearSchoolSessions,
  toDateString,
} from "@/lib/attendanceYear";
import { formatVietnamTime, getVietnamDateString } from "@/lib/datetime";
import { toast } from "sonner";
import { ImportUserModal } from "@/components/ImportUserModal";

const ITEM_PER_PAGE = 15;

type StudentsFetchResult = {
  students: StudentRecord[];
  error: string;
};

async function fetchStudentsForUser(user: User): Promise<StudentsFetchResult> {
  if (user.role === "teacher" && !user.classId) {
    return {
      students: [],
      error:
        "Teacher chưa được gán lớp (classId). Vui lòng cập nhật trong Settings.",
    };
  }

  const classId =
    user.role === "teacher" && user.classId ? user.classId : undefined;

  try {
    const students = await getStudents({ classId });
    return { students, error: "" };
  } catch (err) {
    console.error(err);
    return {
      students: [],
      error:
        "Không tải được danh sách học sinh. Kiểm tra RLS policy trên Supabase hoặc Console.",
    };
  }
}

function StudentList({
  student,
  attendanceRate,
  onDeleted,
}: {
  student: StudentRecord;
  attendanceRate: number;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const opens = Boolean(anchorEl);
  const [historyPage, setHistoryPage] = useState(1);
  const historyPerPage = 5;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  //Pagination for history
  const totalHistoryPages = Math.ceil(
    student.studentAttendance.length / historyPerPage,
  );
  const paginatedHistory = student.studentAttendance.slice(
    (historyPage - 1) * historyPerPage,
    historyPage * historyPerPage,
  );

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setOpen(false);
  };
  const handleClose = () => {
    setAnchorEl(null);
    setOpen(false);
  };

  const handleEdit = () => {
    navigate(`/users/edit/${student.id}`);
    setOpen(false);
  };

  const handleDelete = () => {
    setLoading(true);
    handleClose();
    deleteStudentById(student.id)
      .then(() => {
        toast.success("Student deleted successfully");
        onDeleted();
      })
      .catch((error) => {
        console.error("Failed to delete student", error);
        toast.error("Failed to delete student: " + error.message);
      })
      .finally(() => {
        setLoading(false);
        setOpen(false);
      });
  };

  const handleActivate = async (id: string) => {
    const student = await getStudentById(id);
    if (!student) return;

    setLoading(true);
    setIsDeactivating(true);
    try {
      await deactivateStudentById(id);
      toast.success(
        student.isActive
          ? "Student deactivated successfully"
          : "Student activated successfully",
      );
    } catch (error) {
      console.error("Failed to toggle student active status:", error);
      toast.error("Failed to update student status");
    } finally {
      setIsDeactivating(false);
      setLoading(false);
    }
  };

  const handleLock = async (id: string) => {
    const student = await getStudentById(id);
    if (!student) return;

    setLoading(true);
    setIsLocking(true);
    try {
      await lockStudentById(id);
      toast.success(
        student.isLocked
          ? "Student locked successfully"
          : "Student unlocked successfully",
      );
    } catch (error) {
      console.error("Failed to toggle student lock status:", error);
      toast.error("Failed to update student lock status");
    } finally {
      setIsLocking(false);
      setLoading(false);
    }
  };

  const todayDate = getVietnamDateString();
  const todayAttendance = student.studentAttendance.find(
    (r) => r.date === todayDate,
  );

  return (
    <>
      {loading ? (
        <TableRow>
          <TableCell colSpan={7} className="h-24 text-center text-zinc-500">
            Loading...
          </TableCell>
        </TableRow>
      ) : (
        <>
          <TableRow className="hover:bg-muted/50">
            <TableCell className="w-10">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-label={`Toggle attendance history for ${student.name}`}
              >
                <ChevronDown
                  size={16}
                  className={cn(
                    "transition-transform duration-200",
                    open && "rotate-180",
                  )}
                />
              </Button>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-200 to-sky-200 text-sm font-semibold text-indigo-800 dark:from-indigo-900 dark:to-sky-900 dark:text-indigo-100">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {student.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    ID: {student.id}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell>{student.email}</TableCell>
            <TableCell>
              {student.isLocked ? (
                <Badge variant="warning">Locked</Badge>
              ) : (
                <Badge variant={student.isActive ? "success" : "danger"}>
                  {student.isActive ? "Active" : "Inactive"}
                </Badge>
              )}
            </TableCell>
            <TableCell>
              {todayAttendance ? (
                <Badge
                  variant={
                    todayAttendance.status === "present"
                      ? "success"
                      : todayAttendance.status === "excused_absence"
                        ? "warning"
                        : "danger"
                  }
                >
                  {todayAttendance.status === "present"
                    ? "Present"
                    : todayAttendance.status === "excused_absence"
                      ? "Excused Absence"
                      : "Absent"}
                </Badge>
              ) : (
                <Badge variant="outline">Not Marked</Badge>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2 min-w-[120px]">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${attendanceRate}%`,
                      background:
                        attendanceRate >= 75
                          ? "linear-gradient(90deg, #84fab0 0%, #8fd3f4 100%)"
                          : attendanceRate >= 50
                            ? "linear-gradient(90deg, #ffeaa7 0%, #fdcb6e 100%)"
                            : "linear-gradient(90deg, #ffa8b5 0%, #ffd3a5 100%)",
                    }}
                  />
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {attendanceRate.toFixed(1)}%
                </span>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Link
                  className="inline-flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  to={`/users/detail/${student.id}`}
                >
                  <Eye size={16} />
                </Link>
                <IconButton
                  aria-label="more"
                  id="long-button"
                  aria-controls={opens ? "long-menu" : undefined}
                  aria-expanded={opens}
                  aria-haspopup="true"
                  onClick={handleClick}
                >
                  <MoreHorizontal size={16} />{" "}
                </IconButton>
                <Menu
                  id="long-menu"
                  anchorEl={anchorEl}
                  open={opens}
                  onClose={handleClose}
                  slotProps={{
                    paper: {
                      style: {
                        maxHeight: 48 * 4.5,
                        width: "20ch",
                      },
                    },
                    list: {
                      "aria-labelledby": "long-button",
                    },
                  }}
                >
                  <MenuItem key="Edit" onClick={handleEdit}>
                    <Edit size={16} className="mr-2" />
                    Edit
                  </MenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <MenuItem key="Delete">
                        <Trash2 size={16} className="mr-2" />
                        Delete
                      </MenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Student?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{student.name}"? This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleClose}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <MenuItem key="Activate">
                        {student.isActive ? (
                          <PowerOff size={16} className="mr-2" />
                        ) : (
                          <Power size={16} className="mr-2" />
                        )}
                        {student.isActive ? "Deactivate" : "Activate"}
                      </MenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {student.isActive
                            ? "Deactivate Student?"
                            : "Activate Student?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to{" "}
                          {student.isActive
                            ? "deactivate the student"
                            : "activate the student"}{" "}
                          "{student.name}"?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleClose}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleActivate(student.id)}
                          className={cn(
                            "bg-red-600 hover:bg-red-700",
                            !student.isActive &&
                              "bg-green-600 hover:bg-green-700",
                          )}
                          disabled={isDeactivating}
                        >
                          {student.isActive
                            ? "Deactivate Student"
                            : "Activate Student"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <MenuItem key="Lock">
                        {student.isLocked ? (
                          <LockOpen size={16} className="mr-2" />
                        ) : (
                          <Lock size={16} className="mr-2" />
                        )}
                        {student.isLocked ? "Unlock" : "Lock"}
                      </MenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {student.isLocked
                            ? "Unlock Student?"
                            : "Lock Student?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to{" "}
                          {student.isLocked
                            ? "unlock the student"
                            : "lock the student"}{" "}
                          "{student.name}
                          "?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleClose}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleLock(student.id)}
                          className={cn(
                            "bg-red-600 hover:bg-red-700",
                            !student.isLocked &&
                              "bg-green-600 hover:bg-green-700",
                          )}
                          disabled={isLocking}
                        >
                          {student.isLocked ? "Unlock Student" : "Lock Student"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </Menu>
              </div>
            </TableCell>
          </TableRow>
          {open && (
            <TableRow className="bg-zinc-50/80 dark:bg-zinc-900/50">
              <TableCell colSpan={7} className="p-0">
                <div className="px-4 py-4">
                  <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Attendance History
                  </p>
                  {student.studentAttendance.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedHistory
                          .sort(
                            (a, b) =>
                              new Date(b.date).getTime() -
                              new Date(a.date).getTime(),
                          )
                          .map((record) => (
                            <TableRow key={`${record.date}-${record.status}`}>
                              <TableCell>
                                {new Date(record.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    record.status === "present"
                                      ? "success"
                                      : record.status === "excused_absence"
                                        ? "warning"
                                        : "danger"
                                  }
                                >
                                  {record.status === "present"
                                    ? "Present"
                                    : record.status === "excused_absence"
                                      ? "Excused Absence"
                                      : "Absent"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {formatVietnamTime(record.timestamp)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      No attendance records yet
                    </p>
                  )}
                  <Pagination
                    currentPage={historyPage}
                    totalPages={totalHistoryPages}
                    onPageChange={setHistoryPage}
                  />
                </div>
              </TableCell>
            </TableRow>
          )}
        </>
      )}
    </>
  );
}

export function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [studentPage, setStudentPage] = useState(1);
  const [importUserModalOpen, setImportUserModalOpen] = useState(false);
  const [className, setClassName] = useState<string | null>(null);
  const [yearAttendanceRecords, setYearAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [yearSchoolSundays, setYearSchoolSundays] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.classId) {
      return;
    }
    getClassNameById(user.classId).then(setClassName);
  }, [user?.classId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [years, semesters] = await Promise.all([
          getAcademicYears(),
          getSemesters(),
        ]);
        if (cancelled) return;

        const academicYear = getAcademicYearForDate(years);
        if (!academicYear) {
          setYearSchoolSundays([]);
          setYearAttendanceRecords([]);
          return;
        }

        const { sundays } = getYearSchoolSessions(semesters, academicYear);
        setYearSchoolSundays(sundays);

        if (students.length === 0 || sundays.length === 0) {
          setYearAttendanceRecords([]);
          return;
        }

        const records = await getAttendanceRecordsByStudentIds({
          studentIds: students.map((student) => student.id),
          dateFrom: toDateString(academicYear.startDate),
          dateTo: toDateString(academicYear.endDate),
        });
        if (!cancelled) {
          setYearAttendanceRecords(records);
        }
      } catch (err) {
        console.error("Failed to load yearly attendance context:", err);
        if (!cancelled) {
          setYearSchoolSundays([]);
          setYearAttendanceRecords([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [students]);

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

  const handleStudentDeleted = useCallback(() => {
    if (!user) return;

    void (async () => {
      const result = await fetchStudentsForUser(user);
      setStudents(result.students);
      setFetchError(result.error);
    })();
  }, [user]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;

    const q = searchTerm.toLowerCase();
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(q) ||
        student.email.toLowerCase().includes(q),
    );
  }, [students, searchTerm]);

  const attendanceRateByStudentId = useMemo(() => {
    const recordsByStudent = yearAttendanceRecords.reduce<
      Record<string, AttendanceRecord[]>
    >((acc, record) => {
      if (!acc[record.studentId]) {
        acc[record.studentId] = [];
      }
      acc[record.studentId].push(record);
      return acc;
    }, {});

    return students.reduce<Record<string, number>>((acc, student) => {
      acc[student.id] = calculateYearlyPresentRate(
        recordsByStudent[student.id] ?? [],
        yearSchoolSundays,
      );
      return acc;
    }, {});
  }, [students, yearAttendanceRecords, yearSchoolSundays]);

  const totalStudentPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / ITEM_PER_PAGE),
  );
  const paginatedStudents = filteredStudents.slice(
    (studentPage - 1) * ITEM_PER_PAGE,
    studentPage * ITEM_PER_PAGE,
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Dashboard
            </h1>
            {user && (
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 py-1 px-2.5"
              >
                <UserIcon size={12} className="text-indigo-500" />
                <span className="text-xs font-medium capitalize">
                  {user.role}
                </span>
              </Badge>
            )}
          </div>
          <p className="text-zinc-500 dark:text-zinc-400">
            Your central overview for managing attendance across the school.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-500">Loading...</div>
      ) : fetchError ? (
        <div className="text-center py-20 border-2 border-dashed border-red-200 dark:border-red-800 rounded-3xl px-4">
          <p className="text-red-600 dark:text-red-400">{fetchError}</p>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
          <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            No students found
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            {user?.role === "teacher"
              ? `No students found with role "student". Check the User table in Supabase.`
              : "There are no students in the system yet."}
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>
                    {user?.classId
                      ? ` ${className ?? user.classId}`
                      : "Students"}
                  </CardTitle>
                  <Chip
                    label={students.length}
                    size="small"
                    sx={{
                      color: "white",
                      fontWeight: 700,
                    }}
                    color="primary"
                  />
                </div>
                <CardDescription>
                  View attendance status and history for each student
                </CardDescription>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  onClick={() => navigate("/users/create")}
                  variant="outline"
                >
                  <Download size={20} />
                  <span>Download QR Code</span>
                </Button>
                <Button
                  onClick={() => setImportUserModalOpen(true)}
                  variant="outline"
                >
                  <Library size={20} />
                  <span>Import Students</span>
                </Button>
                <Button onClick={() => navigate("/users/create")}>
                  <PlusCircle size={20} className="mr-2" />
                  <span>New Student</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-sm">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Today</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead className="w-10 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-zinc-500"
                    >
                      No students found in the system yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStudents.map((student) => (
                    <StudentList
                      key={student.id}
                      student={student}
                      attendanceRate={
                        attendanceRateByStudentId[student.id] ?? 0
                      }
                      onDeleted={handleStudentDeleted}
                    />
                  ))
                )}
              </TableBody>
            </Table>
            <Pagination
              currentPage={studentPage}
              totalPages={totalStudentPages}
              onPageChange={setStudentPage}
            />
          </CardContent>
        </Card>
      )}
      <ImportUserModal
        isOpen={importUserModalOpen}
        onClose={() => setImportUserModalOpen(false)}
        onSuccess={handleStudentDeleted}
      />
    </div>
  );
}
