import { useCallback, useEffect, useMemo, useState } from "react";

import { Link } from "react-router";

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

  PlusCircle,

  Search,

  Crown,

  Eye,

  ChevronDown,

  Library,

} from "lucide-react";

import { Button } from "../../components/ui/button";

import { Chip } from "@mui/material";

import { Pagination } from "../../components/ui/pagination";

import { cn } from "@/lib/utils";

import { getStudents, type StudentRecord } from "@/lib/api/students";

import { getGrades, type GradeOption } from "@/lib/api/grades";

import { getClasses, type ClassOption } from "@/lib/api/classes";

import { getVietnamDateString } from "@/lib/datetime";

import { ImportUserModal } from "@/components/ImportUserModal";



const ITEM_PER_PAGE = 15;

const DEFAULT_CLASS = "All";

/** Tabs một hàng, trải đều theo số item — không wrap, không grid-cols cố định */
const EVEN_TABS_LIST =
  "grid h-auto w-full min-w-0 grid-flow-col auto-cols-fr gap-1 p-1";
const EVEN_TABS_TRIGGER =
  "min-h-11 min-w-0 px-2 py-2 text-xs sm:min-h-9 sm:px-3 sm:text-sm truncate";



function getAttendanceRate(student: StudentRecord) {

  const records = student.studentAttendance ?? [];

  const presentDays = records.filter((r) => r.status === "present").length;

  return records.length > 0 ? (presentDays / records.length) * 100 : 0;

}



function StudentListRow({

  student,

  variant = "table",

}: {

  student: StudentRecord;

  variant?: "table" | "card";

}) {

  const [open, setOpen] = useState(false);

  const [historyPage, setHistoryPage] = useState(1);

  const historyPerPage = 5;



  const todayDate = getVietnamDateString();

  const todayAttendance = student.studentAttendance.find(

    (r) => r.date.split("T")[0] === todayDate,

  );

  const attendanceRate = getAttendanceRate(student);

  const sortedHistory = [...student.studentAttendance].sort(

    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),

  );

  const totalHistoryPages = Math.max(

    1,

    Math.ceil(sortedHistory.length / historyPerPage),

  );

  const paginatedHistory = sortedHistory.slice(

    (historyPage - 1) * historyPerPage,

    historyPage * historyPerPage,

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



  const historyBlock =

    sortedHistory.length > 0 ? (

      <>

        {variant === "card" ? (

          <div className="mt-3 flex flex-col gap-2">

            {paginatedHistory.map((record) => (

              <div

                key={`${record.id}-${record.date}`}

                className="rounded-md border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/50"

              >

                <div className="flex items-center justify-between gap-2">

                  <span className="text-sm font-medium">

                    {new Date(record.date).toLocaleDateString()}

                  </span>

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

                </div>

              </div>

            ))}

          </div>

        ) : (

          <Table>

            <TableHeader>

              <TableRow>

                <TableHead>Date</TableHead>

                <TableHead>Status</TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {paginatedHistory.map((record) => (

                <TableRow key={`${record.id}-${record.date}`}>

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



  if (variant === "card") {

    return (

      <div className="rounded-lg border border-zinc-200 bg-card p-4 shadow-sm dark:border-zinc-800">

        <div className="flex items-start justify-between gap-2">

          <div className="min-w-0">

            <p className="font-semibold text-base">

              {student.holy_name ? `${student.holy_name} ` : ""}

              {student.name}

            </p>

            <p className="text-xs text-muted-foreground">

              {student.class?.name ?? "No class"}

            </p>

          </div>

          <Button

            type="button"

            variant="ghost"

            size="icon"

            className="size-8 shrink-0"

            onClick={() => setOpen(!open)}

            aria-expanded={open}

          >

            <ChevronDown

              size={16}

              className={cn("transition-transform duration-200", open && "rotate-180")}

            />

          </Button>

        </div>

        <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">

          <p>

            <span className="font-medium text-zinc-700 dark:text-zinc-300">

              Email:

            </span>{" "}

            <span className="break-all">{student.email}</span>

          </p>

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

        <div className="mt-3">

          <Button variant="outline" size="sm" className="min-h-11 w-full" asChild>

            <Link to={`/users/detail/${student.id}`}>

              <Eye size={16} className="mr-1.5" />

              View

            </Link>

          </Button>

        </div>

        {open && (

          <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-700">

            <p className="mb-3 text-sm font-semibold">Attendance History</p>

            {historyBlock}

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

        <TableCell className="font-medium max-w-[140px] truncate" title={student.name}>

          {student.holy_name ? `${student.holy_name} ` : ""}

          {student.name}

        </TableCell>

        <TableCell className="max-w-[140px] truncate" title={student.email}>

          {student.email}

        </TableCell>

        <TableCell>{student.class?.name ?? "-"}</TableCell>

        <TableCell>{todayBadge}</TableCell>

        <TableCell>{attendanceBar}</TableCell>

        <TableCell>

          <Button variant="ghost" size="sm" asChild>

            <Link to={`/users/detail/${student.id}`}>

              <Eye size={16} />

            </Link>

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

              {historyBlock}

            </div>

          </TableCell>

        </TableRow>

      )}

    </>

  );

}



export function Students() {

  const [searchTerm, setSearchTerm] = useState("");

  const [students, setStudents] = useState<StudentRecord[]>([]);

  const [grades, setGrades] = useState<GradeOption[]>([]);

  const [classes, setClasses] = useState<ClassOption[]>([]);

  const [loading, setLoading] = useState(true);

  const [fetchError, setFetchError] = useState("");

  const [userPage, setUserPage] = useState(1);

  const [selectedGrade, setSelectedGrade] = useState("");

  const [selectedClass, setSelectedClass] = useState(DEFAULT_CLASS);

  const [importUserModalOpen, setImportUserModalOpen] = useState(false);



  const loadStudents = useCallback(async () => {

    setLoading(true);

    setFetchError("");

    try {

      const [studentList, gradeList, classList] = await Promise.all([

        getStudents(),

        getGrades(),

        getClasses(),

      ]);

      setStudents(studentList);

      setGrades(gradeList);

      setClasses(classList);

      setSelectedGrade((prev) => prev || gradeList[0]?.name || "");

    } catch (err) {

      console.error(err);

      setFetchError(

        "Không tải được danh sách học sinh. Kiểm tra RLS policy trên Supabase hoặc Console.",

      );

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    void loadStudents();

  }, [loadStudents]);



  const classesForGrade = useMemo(

    () =>

      classes.filter((cls) => cls.grade?.name === selectedGrade),

    [classes, selectedGrade],

  );



  const tabFilteredStudents = useMemo(() => {

    let filtered = students.filter(

      (student) => student.class?.grade?.name === selectedGrade,

    );



    if (selectedClass !== DEFAULT_CLASS) {

      filtered = filtered.filter(

        (student) => student.class?.name === selectedClass,

      );

    }



    return filtered;

  }, [students, selectedGrade, selectedClass]);



  const filteredStudents = useMemo(() => {

    if (!searchTerm.trim()) {

      return tabFilteredStudents;

    }



    const term = searchTerm.toLowerCase();

    return tabFilteredStudents.filter(

      (student) =>

        student.name.toLowerCase().includes(term) ||

        student.email.toLowerCase().includes(term) ||

        student.class?.name.toLowerCase().includes(term) ||

        student.holy_name?.toLowerCase().includes(term),

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



  const totalUserPages = Math.max(

    1,

    Math.ceil(filteredStudents.length / ITEM_PER_PAGE),

  );

  const paginatedStudents = filteredStudents.slice(

    (userPage - 1) * ITEM_PER_PAGE,

    userPage * ITEM_PER_PAGE,

  );



  return (

    <div className="space-y-6 sm:space-y-8">

      <motion.header

        initial={{ opacity: 0, y: -20 }}

        animate={{ opacity: 1, y: 0 }}

        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"

      >

        <div>

          <div className="mb-2 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">

              <Crown size={20} className="text-white" />

            </div>

            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">

              Students

            </h1>

          </div>

          <p className="text-zinc-500 dark:text-zinc-400">

            Manage students on the platform

          </p>

        </div>

        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto sm:gap-3">

          <Button

            onClick={() => setImportUserModalOpen(true)}

            variant="outline"

            className="min-h-11 flex-1 sm:flex-none"

          >

            <Library size={20} />

            <span>Import Students</span>

          </Button>

          <Button asChild className="min-h-11 flex-1 sm:flex-none">

            <Link

              to="/admin/students/create"

              prefetch="intent"

              state={{ prefetchedGrades: grades, prefetchedClasses: classes }}

            >

              <PlusCircle size={20} className="mr-2" />

              <span>New Student</span>

            </Link>

          </Button>

        </div>

      </motion.header>



      {loading ? (

        <div className="py-20 text-center text-zinc-500">Loading...</div>

      ) : fetchError ? (

        <div className="rounded-3xl border-2 border-dashed border-red-200 px-4 py-20 text-center dark:border-red-800">

          <p className="text-red-600 dark:text-red-400">{fetchError}</p>

        </div>

      ) : (

        <>

          <div className="flex w-full min-w-0 flex-col gap-3 sm:gap-4">

            {grades.length > 0 && (

              <Tabs

                value={selectedGrade}

                onValueChange={handleGradeChange}

                className="w-full min-w-0"

              >

                <TabsList className={EVEN_TABS_LIST}>

                  {grades.map((grade) => (

                    <TabsTrigger

                      key={grade.id}

                      value={grade.name}

                      className={EVEN_TABS_TRIGGER}

                    >

                      {grade.name}

                    </TabsTrigger>

                  ))}

                </TabsList>

              </Tabs>

            )}



            <Tabs

              value={selectedClass}

              onValueChange={handleClassChange}

              className="w-full min-w-0"

            >

              <TabsList className={EVEN_TABS_LIST}>

                <TabsTrigger

                  value={DEFAULT_CLASS}

                  className={EVEN_TABS_TRIGGER}

                >

                  All Classes

                </TabsTrigger>

                {classesForGrade.map((cls) => (

                  <TabsTrigger

                    key={cls.id}

                    value={cls.name}

                    className={EVEN_TABS_TRIGGER}

                  >

                    {cls.name}

                  </TabsTrigger>

                ))}

              </TabsList>

            </Tabs>

          </div>



          <div className="w-full">

            {filteredStudents.length === 0 ? (

              <div className="rounded-3xl border-2 border-dashed border-zinc-200 py-20 text-center dark:border-zinc-800">

                <h2 className="mb-2 text-xl font-medium text-zinc-900 dark:text-zinc-100">

                  No students found

                </h2>

                <p className="mx-auto max-w-sm text-zinc-500 dark:text-zinc-400">

                  There are no students matching the current filters.

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

                  <div className="relative w-full min-w-0 max-w-sm">

                    <Search

                      size={16}

                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"

                    />

                    <input

                      type="search"

                      placeholder="Search by name, email, or class..."

                      value={searchTerm}

                      onChange={(e) => {

                        setSearchTerm(e.target.value);

                        setUserPage(1);

                      }}

                      className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"

                    />

                  </div>

                  <div className="flex flex-col gap-3 md:hidden">

                    {paginatedStudents.map((student) => (

                      <StudentListRow

                        key={student.id}

                        student={student}

                        variant="card"

                      />

                    ))}

                  </div>

                  <Table className="hidden md:table">

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

                      {paginatedStudents.map((student) => (

                        <StudentListRow

                          key={student.id}

                          student={student}

                          variant="table"

                        />

                      ))}

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

        </>

      )}



      <ImportUserModal

        isOpen={importUserModalOpen}

        onClose={() => setImportUserModalOpen(false)}

        onSuccess={() => void loadStudents()}

        mode="admin"

      />

    </div>

  );

}


