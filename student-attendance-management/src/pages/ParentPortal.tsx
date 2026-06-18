import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ScanLine,
  Search,
  ShieldCheck,
  User,
  Users,
  X,
  History,
  Calendar1,
  ArrowLeft,
  Clock,
  Loader2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/lable";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type StudentRecord,
  getStudentAttendanceByCode,
} from "@/lib/api/students";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createAttendanceRecord } from "@/lib/api/attendancerecord";
import { toast } from "sonner";

export function ParentPortal() {
  const [isScanning, setIsScanning] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Record<string, string>>({
    leaveDate: "",
    leaveReason: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<{
    leaveDate: string | null;
    leaveReason: string | null;
  }>({
    leaveDate: "",
    leaveReason: "",
  });

  const handleSubmit = async () => {
    setError({
      leaveDate: "",
      leaveReason: "",
    });
    setLoading(true);
    try {
      const result = await getStudentAttendanceByCode(studentQuery.trim());
      if (result) {
        setStudent(result);
        setIsSubmitted(true);
        //console.log(result.studentAttendance);
      } else {
        toast.error("Student not found");
      }
    } catch {
      toast.error("Unable to load student information.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setIsSubmitted(false);
    setStudent(null);
    setError(null);
    setFormData({
      leaveDate: null,
      leaveReason: null,
    });
    setStudentQuery("");
  };

  const validateLeaveRequest = () => {
    const errors: Record<string, string> = {};
    if (!formData.leaveDate) {
      errors.leaveDate = "Leave date is required";
    }
    if (!formData.leaveReason) {
      errors.leaveReason = "Leave reason is required";
    }
    return errors;
  };

  const handleRequestLeave = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const newError = validateLeaveRequest();
    if (Object.values(newError).some((error) => error !== "")) {
      setError(newError);
      return;
    }
    setLoading(true);
    try {
      if (!student) {
        throw new Error("Student not found");
      }
      const result = await createAttendanceRecord({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        studentId: student.id,
        date: new Date().toISOString(),
        status: "excused_absence",
        createdById: student.id,
      });
      if (result) {
        setIsSubmitted(true);
      } else {
        toast.error("Unable to request leave.");
      }
    } catch {
      toast.error("Unable to request leave.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearErrors = () => {
    setError({
      leaveDate: "",
      leaveReason: "",
    });
    setFormData({
      leaveDate: null,
      leaveReason: null,
    });
  };

  return (
    <>
      <div
        className={cn(
          "flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center py-6 sm:py-10",
          isSubmitted && "hidden",
        )}
      >
        {!isSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <Card className="overflow-hidden rounded-3xl border-zinc-200 shadow-xl dark:border-zinc-800">
              <CardHeader className="items-center px-6 pt-8 pb-4 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <ShieldCheck size={32} />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Parent Portal
                </CardTitle>
                <CardDescription className="max-w-sm text-base text-zinc-500 dark:text-zinc-400">
                  Look up your child&apos;s attendance using their student ID or
                  QR code.
                </CardDescription>
              </CardHeader>

              <CardContent className="px-6 pb-8">
                <AnimatePresence mode="wait">
                  {isScanning ? (
                    <motion.div
                      key="scanner"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-black dark:border-zinc-700">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsScanning(false)}
                          className="absolute top-2 right-2 z-10 h-9 w-9 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
                          aria-label="Close scanner"
                        >
                          <X size={18} />
                        </Button>
                        <div
                          id="parent-qr-reader"
                          className="min-h-[280px] w-full"
                        />
                      </div>
                      <p className="mt-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
                        Point the camera at the student QR code to continue.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="lookup"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-5"
                      onSubmit={(event) => event.preventDefault()}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="studentQuery">
                          Student ID or QR Code
                        </Label>
                        <div className="relative">
                          <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                          />
                          <Input
                            id="studentQuery"
                            className="h-12 rounded-xl border-zinc-200 bg-zinc-50 pl-9 text-base focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800/50"
                            placeholder="Enter student ID or QR code"
                            type="text"
                            value={studentQuery}
                            onChange={(event) =>
                              setStudentQuery(event.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                          type="submit"
                          size="lg"
                          className="h-12 flex-1 rounded-xl bg-indigo-600 text-base font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700"
                          disabled={!studentQuery.trim() || loading}
                          onClick={handleSubmit}
                        >
                          {loading ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Search size={18} />
                          )}
                          Find Student
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          onClick={() => setIsScanning(true)}
                          className="h-12 flex-1 rounded-xl border-zinc-200 text-base dark:border-zinc-700"
                        >
                          <ScanLine size={18} />
                          Scan QR
                        </Button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!isSubmitted && (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            <span className="inline-flex items-center gap-2">
              <Users size={14} className="text-indigo-500" />
              Secure access for parents and guardians only.
            </span>
          </div>
        )}
      </div>

      {isSubmitted && student && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <Button variant="outline" size="icon" onClick={handleBack}>
                  <ArrowLeft size={16} />
                </Button>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {student.name}
                  {student.class?.name ? ` - ${student.class.name}` : ""}
                </h1>
                <Badge
                  variant="outline"
                  className="flex items-center gap-1.5 px-2.5 py-1"
                >
                  <User size={12} className="text-indigo-500" />
                  <span className="text-xs font-medium capitalize">
                    Student
                  </span>
                </Badge>
              </div>
            </div>
            <Tabs className="w-full" defaultValue="attendance-history">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger
                  value="attendance-history"
                  className="flex items-center justify-center gap-2"
                  onClick={() => handleClearErrors()}
                >
                  <History size={16} />
                  Attendance History
                </TabsTrigger>
                <TabsTrigger
                  value="request-leave"
                  className="flex items-center justify-center gap-2"
                  onClick={() => handleClearErrors}
                >
                  <Calendar1 size={16} />
                  Request Leave
                </TabsTrigger>
                <TabsTrigger
                  value="leave-requests-status"
                  className="flex items-center justify-center gap-2"
                  onClick={() => handleClearErrors()}
                >
                  <Clock size={16} />
                  Leave Requests Status
                </TabsTrigger>
              </TabsList>

              <TabsContent value="attendance-history" className="mt-6">
                <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                  {student.studentAttendance.length === 0 ? (
                    <>
                      <History
                        size={48}
                        className="mx-auto mb-4 text-zinc-300 dark:text-zinc-700"
                      />
                      <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        Attendance History
                      </h3>
                      <p className="text-zinc-500 dark:text-zinc-400">
                        Attendance history features will be available soon.
                      </p>
                    </>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Created By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {student.studentAttendance
                          .sort(
                            (a, b) =>
                              new Date(b.date).getTime() -
                              new Date(a.date).getTime(),
                          )
                          .map((attendance) => (
                            <TableRow key={attendance.id}>
                              <TableCell className="text-left">
                                {new Date(attendance.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-left">
                                <Badge
                                  variant={
                                    attendance.status === "present"
                                      ? "success"
                                      : attendance.status === "excused absence"
                                        ? "warning"
                                        : "danger"
                                  }
                                >
                                  {attendance.status === "present"
                                    ? "Present"
                                    : attendance.status === "excused absence"
                                      ? "Excused Absence"
                                      : "Absent"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-left">
                                {new Date(
                                  attendance.timestamp,
                                ).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-left">
                                {attendance.createdByName}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="request-leave" className="mt-6">
                <div className="rounded-3xl border border-zinc-200 bg-white p-12 dark:border-zinc-800 dark:bg-zinc-900">
                  <form onSubmit={handleRequestLeave}>
                    <div className="space-y-2">
                      <Label htmlFor="leave-date">Leave Date</Label>
                      <Input
                        id="leave-date"
                        type="date"
                        className="h-12 rounded-xl border-zinc-200 bg-zinc-50 pl-3 text-base focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800/50"
                        value={formData.leaveDate}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            leaveDate: event.target.value,
                          })
                        }
                      />
                    </div>
                    {error?.leaveDate && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {error.leaveDate}
                      </p>
                    )}
                    <div className="space-y-2 mt-6">
                      <Label htmlFor="leave-reason">Leave Reason</Label>
                      <Textarea
                        id="leave-reason"
                        className="rounded-xl border-zinc-200 bg-zinc-50 pl-3 text-base focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800/50"
                        rows={5}
                        placeholder="Enter leave reason"
                        value={formData.leaveReason}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            leaveReason: event.target.value,
                          })
                        }
                      />
                      {error?.leaveReason && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {error.leaveReason}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-center mt-6">
                      <Button
                        type="submit"
                        className="h-12 rounded-xl bg-indigo-600 text-base font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700"
                      >
                        <Send size={18} />
                        Submit Request
                      </Button>
                    </div>
                  </form>
                </div>
              </TabsContent>

              <TabsContent value="leave-requests-status" className="mt-6">
                <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                  <Clock
                    size={48}
                    className="mx-auto mb-4 text-zinc-300 dark:text-zinc-700"
                  />
                  <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Leave Requests Status
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    Leave request status features will be available soon.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      )}
    </>
  );
}
