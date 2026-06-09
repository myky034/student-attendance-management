import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "../../components/ui/table";
import {
  Users,
  UserCheck,
  UserX,
  Library,
  PlusCircle,
  Search,
  UserMinus2,
  Crown,
  Eye,
  ChevronDown,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Chip } from "@mui/material";
import {
  initialStudents,
  initialGrades,
  initialClasses,
} from "../../data/mockData";
import type { Student } from "../../types";
import { Pagination } from "../../components/ui/pagination";
import { cn } from "@/lib/utils";

const ITEM_PER_PAGE = 15;
const DEFAULT_GRADE = "Grade 10";
const DEFAULT_CLASS = "All";

function getAttendanceRate(student: Student) {
  const records = student.attendanceRecords ?? [];
  const presentDays = records.filter((r) => r.status === "present").length;
  return records.length > 0 ? (presentDays / records.length) * 100 : 0;
}

function StudentListRow({ student }: { student: Student }) {
  const [open, setOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const historyPerPage = 5;

  const todayDate = new Date().toISOString().split("T")[0];
  const todayAttendance = student.attendanceRecords.find(
    (r) => r.date === todayDate,
  );
  const attendanceRate = getAttendanceRate(student);
  const totalHistoryPages = Math.max(
    1,
    Math.ceil(student.attendanceRecords.length / historyPerPage),
  );
  const paginatedHistory = [...student.attendanceRecords]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice((historyPage - 1) * historyPerPage, historyPage * historyPerPage);

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
        <TableCell className="font-medium">{student.name}</TableCell>
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
        <TableCell>
          <Button variant="ghost" size="sm">
            <Eye size={16} />
          </Button>
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
                      <TableHead>Created By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHistory.map((record) => (
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
                        <TableCell>{record.createdBy.name}</TableCell>
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

export function Students() {
  const [searchTerm, setSearchTerm] = useState("");
  const [students] = useState(initialStudents);
  const [grades] = useState(initialGrades);
  const [userPage, setUserPage] = useState(1);
  const navigate = useNavigate();
  const [selectedGrade, setSelectedGrade] = useState(DEFAULT_GRADE);
  const [selectedClass, setSelectedClass] = useState(DEFAULT_CLASS);

  const tabFilteredStudents = useMemo(() => {
    let filtered = students.filter(
      (student) =>
        student.isDeleted === false &&
        student.class.grade.name === selectedGrade,
    );

    if (selectedClass !== "All") {
      filtered = filtered.filter(
        (student) => student.class.name === selectedClass,
      );
    }

    return filtered;
  }, [students, selectedGrade, selectedClass]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const totalStudents = tabFilteredStudents.length;
    const presentToday = tabFilteredStudents.filter((s) =>
      (s.attendanceRecords ?? []).some(
        (r) => r.date === today && r.status === "present",
      ),
    ).length;
    const absentToday = totalStudents - presentToday;
    const excusedAbsenceToday = tabFilteredStudents.filter((s) =>
      (s.attendanceRecords ?? []).some(
        (r) => r.date === today && r.status === "excused absence",
      ),
    ).length;

    return {
      totalStudents,
      presentToday,
      absentToday,
      excusedAbsenceToday,
    };
  }, [tabFilteredStudents]);

  const statCards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      gradient: "linear-gradient(135deg, #a8c0ff 0%, #c2e9fb 100%)",
      color: "#6b8cce",
      icon: Users,
    },
    {
      title: "Present Today",
      value: stats.presentToday,
      gradient: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
      color: "#4ecdc4",
      icon: UserCheck,
    },
    {
      title: "Absent Today",
      value: stats.absentToday,
      gradient: "linear-gradient(135deg, #ffa8b5 0%, #ffd3a5 100%)",
      color: "#ff6b9d",
      icon: UserX,
    },
    {
      title: "Excused Absence Today",
      value: stats.excusedAbsenceToday,
      gradient: "linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)",
      color: "#ff6b9d",
      icon: UserMinus2,
    },
  ];

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) {
      return tabFilteredStudents;
    }

    const term = searchTerm.toLowerCase();
    return tabFilteredStudents.filter(
      (student) =>
        student.name.toLowerCase().includes(term) ||
        student.email.toLowerCase().includes(term) ||
        student.class.name.toLowerCase().includes(term),
    );
  }, [tabFilteredStudents, searchTerm]);

  const handleGradeChange = (value: string) => {
    setSelectedGrade(value);
    setSelectedClass(DEFAULT_CLASS);
    setUserPage(1);
  };

  const handleClassChange = (value: string) => {
    setSelectedClass(value);
    setUserPage(1);
  };

  const classesForGrade = initialClasses.filter(
    (cls) => cls.grade.name === selectedGrade,
  );

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
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <Crown size={20} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Students
            </h1>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400">
            Manage students on the platform
          </p>
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
      </motion.header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}
                    style={{ background: stat.gradient }}
                  >
                    <stat.icon size={24} className="text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs
        value={selectedGrade}
        onValueChange={handleGradeChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          {grades.map((grade) => (
            <TabsTrigger key={grade.id} value={grade.name}>
              {grade.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Tabs
        value={selectedClass}
        onValueChange={handleClassChange}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-2xl grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value={DEFAULT_CLASS}>All Classes</TabsTrigger>
          {classesForGrade.map((cls) => (
            <TabsTrigger key={cls.id} value={cls.name}>
              {cls.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="w-full">
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
                  {filteredStudents.length === 0 && selectedGrade === "All" ? (
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
                      <StudentListRow key={student.id} student={student} />
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
    </div>
  );
}
