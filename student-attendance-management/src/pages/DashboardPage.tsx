import { useState, useMemo } from "react";
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
} from "lucide-react";
import { Chip, IconButton, Menu, MenuItem } from "@mui/material";
import { useAppContext } from "../context/useAppContext";
import { initialStudents } from "../data/mockData";
import type { Student as StudentType } from "../types";
import { cn } from "../lib/utils";
import { Link, useNavigate } from "react-router";
import { Pagination } from "../components/ui/pagination";

const ITEM_PER_PAGE = 15;

function StudentList({ student }: { student: StudentType }) {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const opens = Boolean(anchorEl);
  const [historyPage, setHistoryPage] = useState(1);
  const historyPerPage = 5;
  const navigate = useNavigate();

  //Pagination for history
  const totalHistoryPages = Math.ceil(
    student.attendanceRecords.length / historyPerPage,
  );
  const paginatedHistory = student.attendanceRecords.slice(
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
    console.log("Delete");
  };

  const todayDate = new Date().toISOString().split("T")[0];
  const todayAttendance = student.attendanceRecords.find(
    (r) => r.date === todayDate,
  );

  const totalPresent = student.attendanceRecords.filter(
    (r) => r.status === "present",
  ).length;
  const totalRecords = student.attendanceRecords.length;
  const attendanceRate =
    totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0;

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
        <TableCell>{student.class.name}</TableCell>
        <TableCell>
          {todayAttendance ? (
            <Badge
              variant={
                todayAttendance.status === "present"
                  ? "success"
                  : todayAttendance.status === "excused absence"
                    ? "warning"
                    : "danger"
              }
            >
              {todayAttendance.status === "present"
                ? "Present"
                : todayAttendance.status === "excused absence"
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
              to={`/student/${student.id}`}
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
                  <MenuItem key="Delete" onClick={handleDelete}>
                    <Trash2 size={16} className="mr-2" />
                    Delete
                  </MenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete User?</AlertDialogTitle>
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
              {student.attendanceRecords.length > 0 ? (
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
                                  : record.status === "excused absence"
                                    ? "warning"
                                    : "danger"
                              }
                            >
                              {record.status === "present"
                                ? "Present"
                                : record.status === "excused absence"
                                  ? "Excused Absence"
                                  : "Absent"}
                            </Badge>
                          </TableCell>
                          <TableCell>{record.timestamp}</TableCell>
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
  );
}

export function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [students] = useState(initialStudents);
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [userPage, setUserPage] = useState(1);

  const filteredStudents = useMemo(() => {
    const filtered = students.filter((student) => student.isDeleted === false);

    return filtered.filter(
      (student) =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.class.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [students, searchTerm]);

  const totalUserPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / ITEM_PER_PAGE),
  );
  const paginatedStudents = filteredStudents.slice(
    (userPage - 1) * ITEM_PER_PAGE,
    userPage * ITEM_PER_PAGE,
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

      {filteredStudents.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
          <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            No students found
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            There are no students in the system yet.
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Students</CardTitle>
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
              <div className="flex justify-end gap-3">
                <Button onClick={() => navigate("")} variant="outline">
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
                placeholder="Search by name, email, or class..."
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
                  <TableHead>Class</TableHead>
                  <TableHead>Today</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead className="w-10 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
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
                    <StudentList key={student.id} student={student} />
                  ))
                )}
              </TableBody>
            </Table>
            <Pagination
              currentPage={userPage}
              totalPages={totalUserPages}
              onPageChange={setUserPage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
