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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";
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

function normalizeAttendanceDate(date: string): string {
  return date.split("T")[0];
}

function getTodayAttendanceRecord(
  student: StudentRecord,
  today: string,
): StudentRecord["studentAttendance"][number] | undefined {
  return student.studentAttendance.find(
    (record) => normalizeAttendanceDate(record.date) === today,
  );
}

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
  onLocked,
  onActivated,
  variant = "table",
}: {
  student: StudentRecord;
  attendanceRate: number;
  onDeleted: () => void;
  onLocked: () => void;
  onActivated: () => void;
  variant?: "table" | "card";
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
      onActivated();
      toast.success(
        student.isActive
          ? "Student deactivated successfully"
          : "Student activated successfully",
      );
    } catch (error) {
      console.error("Failed to toggle student active status:", error);
      toast.error("Failed to update student status");
    } finally {
      setAnchorEl(null);
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
      onLocked();
      toast.success(
        student.isLocked
          ? "Student unlocked successfully"
          : "Student locked successfully",
      );
    } catch (error) {
      console.error("Failed to toggle student lock status:", error);
      toast.error("Failed to update student lock status");
    } finally {
      setAnchorEl(null);
      setIsLocking(false);
      setLoading(false);
    }
  };

  const todayDate = getVietnamDateString();
  const todayAttendance = getTodayAttendanceRecord(student, todayDate);

  const sortedHistory = [...paginatedHistory].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const statusBadge = student.isLocked ? (
    <Badge variant="destructive">Locked</Badge>
  ) : (
    <Badge variant={student.isActive ? "success" : "danger"}>
      {student.isActive ? "Active" : "Inactive"}
    </Badge>
  );

  const todayBadge = todayAttendance ? (
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
  );

  const attendanceBar = (
    <div className="flex items-center gap-2 min-w-0">
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
  );

  const actionButtons = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="flex-1 sm:flex-none" asChild>
        <Link to={`/users/detail/${student.id}`}>
          <Eye size={16} className="mr-1.5" />
          View
        </Link>
      </Button>
      <Button variant="outline" size="sm" onClick={handleEdit} className="flex-1 sm:flex-none">
        <Edit size={16} className="mr-1.5" />
        Edit
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex-1 text-red-600 sm:flex-none">
            <Trash2 size={16} className="mr-1.5" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{student.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
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
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            {student.isActive ? (
              <PowerOff size={16} className="mr-1.5" />
            ) : (
              <Power size={16} className="mr-1.5" />
            )}
            {student.isActive ? "Deactivate" : "Activate"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {student.isActive ? "Deactivate Student?" : "Activate Student?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to{" "}
              {student.isActive ? "deactivate the student" : "activate the student"}{" "}
              "{student.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleActivate(student.id)}
              className={cn(
                "bg-red-600 hover:bg-red-700",
                !student.isActive && "bg-green-600 hover:bg-green-700",
              )}
              disabled={isDeactivating}
            >
              {student.isActive ? "Deactivate Student" : "Activate Student"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            {student.isLocked ? (
              <LockOpen size={16} className="mr-1.5" />
            ) : (
              <Lock size={16} className="mr-1.5" />
            )}
            {student.isLocked ? "Unlock" : "Lock"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {student.isLocked ? "Unlock Student?" : "Lock Student?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to{" "}
              {student.isLocked ? "unlock the student" : "lock the student"} "
              {student.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleLock(student.id)}
              className={cn(
                "bg-green-600 hover:bg-green-700",
                !student.isLocked && "bg-red-600 hover:bg-red-700",
              )}
              disabled={isLocking}
            >
              {student.isLocked ? "Unlock Student" : "Lock Student"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  const historyContent =
    student.studentAttendance.length > 0 ? (
      <>
        {variant === "card" ? (
          <div className="mt-3 flex flex-col gap-2">
            {sortedHistory.map((record) => (
              <div
                key={`${record.date}-${record.status}`}
                className="rounded-md border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {new Date(record.date).toLocaleDateString()}
                  </span>
                  <div className="flex flex-wrap gap-1">
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
                    {record.isLate && (
                      <Badge variant="warning">Late</Badge>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Time: {formatVietnamTime(record.timestamp)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedHistory.map((record) => (
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
                    {record.isLate && (
                      <Badge variant="warning" className="ml-2">
                        Late
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatVietnamTime(record.timestamp)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pagination
          currentPage={historyPage}
          totalPages={totalHistoryPages}
          onPageChange={setHistoryPage}
        />
      </>
    ) : (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No attendance records yet
      </p>
    );

  if (loading) {
    if (variant === "card") {
      return (
        <div className="rounded-lg border border-zinc-200 bg-card p-4 shadow-sm dark:border-zinc-800">
          <p className="text-center text-sm text-zinc-500">Loading...</p>
        </div>
      );
    }
    return (
      <TableRow>
        <TableCell colSpan={7} className="h-24 text-center text-zinc-500">
          Loading...
        </TableCell>
      </TableRow>
    );
  }

  if (variant === "card") {
    return (
      <div className="rounded-lg border border-zinc-200 bg-card p-4 shadow-sm dark:border-zinc-800">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-200 to-sky-200 text-sm font-semibold text-indigo-800 dark:from-indigo-900 dark:to-sky-900 dark:text-indigo-100">
            {student.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-base text-zinc-900 dark:text-zinc-50">
              {student.holy_name ? `${student.holy_name} ` : ""}
              {student.name}
            </p>
            <p className="text-xs text-muted-foreground">ID: {student.id}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
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
        </div>

        <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Email:
            </span>{" "}
            <span className="break-all">{student.email}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Status:
            </span>
            {statusBadge}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Today:
            </span>
            {todayBadge}
          </div>
          <div>
            <p className="mb-1 font-medium text-zinc-700 dark:text-zinc-300">
              Attendance:
            </p>
            {attendanceBar}
          </div>
        </div>

        <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-700">
          {actionButtons}
        </div>

        {open && (
          <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-700">
            <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Attendance History
            </p>
            {historyContent}
          </div>
        )}
      </div>
    );
  }

  return (
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
          <div className="flex items-center gap-2 min-w-0 max-w-[180px]">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-200 to-sky-200 text-sm font-semibold text-indigo-800 dark:from-indigo-900 dark:to-sky-900 dark:text-indigo-100">
              {student.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                {student.holy_name ? student.holy_name : ""} {student.name}
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                ID: {student.id}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell className="max-w-[140px] truncate" title={student.email}>
          {student.email}
        </TableCell>
        <TableCell>{statusBadge}</TableCell>
        <TableCell>{todayBadge}</TableCell>
        <TableCell>{attendanceBar}</TableCell>
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
              <MoreHorizontal size={16} />
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
                      {student.isLocked ? "Unlock Student?" : "Lock Student?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to{" "}
                      {student.isLocked
                        ? "unlock the student"
                        : "lock the student"}{" "}
                      "{student.name}"?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleClose}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleLock(student.id)}
                      className={cn(
                        "bg-green-600 hover:bg-green-700",
                        !student.isLocked && "bg-red-600 hover:bg-red-700",
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
              {historyContent}
            </div>
          </TableCell>
        </TableRow>
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [attendanceFilter, setAttendanceFilter] = useState("all");
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

  const handleStudentLocked = useCallback(() => {
    if (!user) return;
    void (async () => {
      const result = await fetchStudentsForUser(user);
      setStudents(result.students);
      setFetchError(result.error);
    })();
  }, [user]);

  const handleStudentActivated = useCallback(() => {
    if (!user) return;
    void (async () => {
      const result = await fetchStudentsForUser(user);
      setStudents(result.students);
      setFetchError(result.error);
    })();
  }, [user]);

  const filteredStudents = useMemo(() => {
    let result = students;
    const todayDate = getVietnamDateString();

    if (statusFilter === "active") {
      result = result.filter((student) => student.isActive);
    } else if (statusFilter === "inactive") {
      result = result.filter((student) => !student.isActive);
    } else if (statusFilter === "locked") {
      result = result.filter((student) => student.isLocked);
    }

    if (attendanceFilter === "present") {
      result = result.filter(
        (student) =>
          getTodayAttendanceRecord(student, todayDate)?.status === "present",
      );
    } else if (attendanceFilter === "absent") {
      result = result.filter(
        (student) =>
          getTodayAttendanceRecord(student, todayDate)?.status === "absent",
      );
    } else if (attendanceFilter === "excused_absence") {
      result = result.filter(
        (student) =>
          getTodayAttendanceRecord(student, todayDate)?.status ===
          "excused_absence",
      );
    }

    if (!searchTerm.trim()) return result;

    const q = searchTerm.toLowerCase();
    return result.filter(
      (student) =>
        student.id.toLowerCase().includes(q) ||
        student.qrCode.toLowerCase().includes(q) ||
        student.holy_name?.toLowerCase().includes(q) ||
        student.name.toLowerCase().includes(q) ||
        student.email.toLowerCase().includes(q),
    );
  }, [students, searchTerm, statusFilter, attendanceFilter]);

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
    <div className="space-y-8 flex flex-col overflow-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>
                    {user?.classId
                      ? ` ${className ?? user.classId}`
                      : "Students"}
                  </CardTitle>
                  <Chip
                    label={filteredStudents.length}
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
              <div className="flex w-full flex-wrap justify-end gap-2 sm:gap-3 sm:w-auto">
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
            <div className="flex flex-col gap-3 w-full md:flex-row md:flex-wrap md:items-end md:gap-4">
              <div className="relative w-full min-w-0 md:max-w-sm md:flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="search"
                  placeholder="Search by id, name, holy name or email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setStudentPage(1);
                  }}
                  className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="w-full min-w-0 md:max-w-sm md:flex-1">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setStudentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="locked">Locked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full min-w-0 md:max-w-sm md:flex-1">
                <Select
                  value={attendanceFilter}
                  onValueChange={(value) => {
                    setAttendanceFilter(value);
                    setStudentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="excused_absence">
                      Excused Absence
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setAttendanceFilter("all");
                    setStudentPage(1);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
            {filteredStudents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 py-12 text-center text-zinc-500 dark:border-zinc-800">
                {students.length === 0
                  ? "No students found in the system yet."
                  : "No students match the current filters."}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 md:hidden">
                  {paginatedStudents.map((student) => (
                    <StudentList
                      key={student.id}
                      variant="card"
                      student={student}
                      attendanceRate={
                        attendanceRateByStudentId[student.id] ?? 0
                      }
                      onDeleted={handleStudentDeleted}
                      onLocked={handleStudentLocked}
                      onActivated={handleStudentActivated}
                    />
                  ))}
                </div>
                <Table className="hidden md:table">
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
                    {paginatedStudents.map((student) => (
                      <StudentList
                        key={student.id}
                        variant="table"
                        student={student}
                        attendanceRate={
                          attendanceRateByStudentId[student.id] ?? 0
                        }
                        onDeleted={handleStudentDeleted}
                        onLocked={handleStudentLocked}
                        onActivated={handleStudentActivated}
                      />
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
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
