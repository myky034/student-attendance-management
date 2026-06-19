import { useEffect, useState } from "react";
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
  Eye,
  GraduationCap,
  CalendarDays,
  Phone,
  FileText,
  UserCheck,
  MessageSquareX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import {
  saveLeaveRequest,
  getLeaveRequestsByStudentId,
  type LeaveRequest,
} from "@/lib/api/leaverequest";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function getLeaveStatusVariant(status?: string) {
  const normalized = status?.toLowerCase();
  if (normalized === "pending") return "warning";
  if (normalized === "approved") return "success";
  return "danger";
}

function formatLeaveStatus(status?: string) {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function DetailRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-indigo-400 dark:ring-zinc-700">
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {value?.trim() ? value : "—"}
        </p>
      </div>
    </div>
  );
}

export function ParentPortal() {
  const [isScanning, setIsScanning] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Record<string, string>>({
    parentName: "",
    parentPhoneNumber: "",
    leaveDate: "",
    leaveReason: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<{
    parentName: string | null;
    parentPhoneNumber: string | null;
    leaveDate: string | null;
    leaveReason: string | null;
  }>({
    parentName: "",
    parentPhoneNumber: "",
    leaveDate: "",
    leaveReason: "",
  });
  const [openLeaveDetail, setOpenLeaveDetail] = useState(false);
  const [selectedLeaveRequest, setSelectedLeaveRequest] =
    useState<LeaveRequest | null>(null);

  const loadLeaveRequests = async (studentCode: string) => {
    setLoading(true);
    try {
      const result = await getLeaveRequestsByStudentId(studentCode);
      setLeaveRequests(result);
    } catch {
      toast.error("Unable to load leave requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      if (student?.user_code) {
        await loadLeaveRequests(student.user_code);
      }
    })();
  }, [student?.user_code]);

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
    setLeaveRequests([]);
    setError({
      parentName: "",
      parentPhoneNumber: "",
      leaveDate: "",
      leaveReason: "",
    });
    setFormData({
      parentName: "",
      parentPhoneNumber: "",
      leaveDate: "",
      leaveReason: "",
    });
    setStudentQuery("");
  };

  const validateLeaveRequest = () => {
    const errors: Record<string, string> = {};
    if (!formData.parentName) {
      errors.parentName = "Parent name is required";
    }
    if (!formData.parentPhoneNumber) {
      errors.parentPhoneNumber = "Parent phone number is required";
    } else if (!formData.parentPhoneNumber.match(/^\d{10}$/)) {
      errors.parentPhoneNumber = "Parent phone number must be 10 digits";
    }
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
      console.log(newError);
      return;
    }
    setLoading(true);
    try {
      if (!student) {
        throw new Error("Student not found");
      }
      if (!student.user_code) {
        throw new Error("Student code is missing");
      }
      if (!student.class?.id) {
        throw new Error("Student class is missing");
      }

      const result = await saveLeaveRequest({
        student_id: student.user_code,
        class_id: student.class.id,
        request_date: formData.leaveDate ?? "",
        reason: formData.leaveReason ?? "",
        submitted_by_name: formData.parentName ?? "",
        submitted_by_phone: formData.parentPhoneNumber ?? "",
      });
      setLeaveRequests((current) => [result, ...current]);
      setFormData({
        parentName: "",
        parentPhoneNumber: "",
        leaveDate: "",
        leaveReason: "",
      });
      toast.success("Leave request submitted successfully");
    } catch (err) {
      console.error("handleRequestLeave error:", err);
      toast.error(
        err instanceof Error ? err.message : "Unable to request leave.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearErrors = () => {
    setError({
      parentName: "",
      parentPhoneNumber: "",
      leaveDate: "",
      leaveReason: "",
    });
    setFormData({
      parentName: "",
      parentPhoneNumber: "",
      leaveDate: "",
      leaveReason: "",
    });
  };

  const handleOpenLeaveRequestDetails = (leaveRequest: LeaveRequest) => {
    setSelectedLeaveRequest(leaveRequest);
    setOpenLeaveDetail(true);
  };

  const handleCloseLeaveRequestDetails = () => {
    setSelectedLeaveRequest(null);
    setOpenLeaveDetail(false);
  };

  const handleLeaveDetailDialogChange = (nextOpen: boolean) => {
    setOpenLeaveDetail(nextOpen);
    if (!nextOpen) {
      setSelectedLeaveRequest(null);
    }
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
                                      : attendance.status === "excused_absence"
                                        ? "warning"
                                        : "danger"
                                  }
                                >
                                  {attendance.status === "present"
                                    ? "Present"
                                    : attendance.status === "excused_absence"
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
                <Card>
                  <CardHeader className="items-center px-12 pt-8 text-left border-b-0">
                    <CardTitle className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                      Request Leave
                    </CardTitle>
                    <CardDescription className="max-w-sm text-base text-zinc-500 dark:text-zinc-400">
                      Request leave for your child.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 py-0 pt-0 [&:last-child]:pb-0">
                    <div className="p-12 pt-0">
                      <form onSubmit={handleRequestLeave}>
                        <div className="space-y-2">
                          <Label htmlFor="parent-name">Parent Name</Label>
                          <Input
                            id="parent-name"
                            type="text"
                            placeholder="Enter parent name"
                            className="h-12 rounded-xl border-zinc-200 bg-zinc-50 pl-3 text-base focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800/50"
                            value={formData.parentName}
                            onChange={(event) =>
                              setFormData({
                                ...formData,
                                parentName: event.target.value,
                              })
                            }
                          />
                        </div>
                        {error?.parentName && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {error.parentName}
                          </p>
                        )}
                        <div className="space-y-2 mt-6">
                          <Label htmlFor="parent-phone-number">
                            Parent Phone Number
                          </Label>
                          <Input
                            id="parent-phone-number"
                            type="tel"
                            placeholder="Enter parent phone number"
                            className="h-12 rounded-xl border-zinc-200 bg-zinc-50 pl-3 text-base focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800/50"
                            value={formData.parentPhoneNumber}
                            onChange={(event) =>
                              setFormData({
                                ...formData,
                                parentPhoneNumber: event.target.value,
                              })
                            }
                          />
                          {error?.parentPhoneNumber && (
                            <p className="text-sm text-red-600 dark:text-red-400">
                              {error.parentPhoneNumber}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2 mt-6">
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
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="leave-requests-status" className="mt-6">
                <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                  {leaveRequests.length === 0 ? (
                    <>
                      <History
                        size={48}
                        className="mx-auto mb-4 text-zinc-300 dark:text-zinc-700"
                      />
                      <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        Leave Requests Status
                      </h3>
                      <p className="text-zinc-500 dark:text-zinc-400">
                        Leave requests status features will be available soon.
                      </p>
                    </>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Request Date</TableHead>
                          <TableHead>Created By</TableHead>
                          <TableHead>Created At</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Approved/Rejected By</TableHead>
                          <TableHead>Approved/Rejected At</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaveRequests.map((leaveRequest) => (
                          <TableRow key={leaveRequest.id}>
                            <TableCell className="text-left">
                              {new Date(
                                leaveRequest.request_date,
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-left">
                              {leaveRequest.submitted_by_name ?? "N/A"}
                            </TableCell>
                            <TableCell className="text-left">
                              {leaveRequest.created_at
                                ? new Date(
                                    leaveRequest.created_at,
                                  ).toLocaleString()
                                : "N/A"}
                            </TableCell>
                            <TableCell className="text-left">
                              <Badge
                                variant={getLeaveStatusVariant(
                                  leaveRequest.status,
                                )}
                              >
                                {formatLeaveStatus(leaveRequest.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-left">
                              {leaveRequest.approved_by_name
                                ? leaveRequest.approved_by_name
                                : leaveRequest.rejected_by_name
                                  ? leaveRequest.rejected_by_name
                                  : "N/A"}
                            </TableCell>
                            <TableCell className="text-left">
                              {leaveRequest.approved_at
                                ? new Date(
                                    leaveRequest.approved_at,
                                  ).toLocaleString()
                                : leaveRequest.rejected_at
                                  ? new Date(
                                      leaveRequest.rejected_at,
                                    ).toLocaleString()
                                  : "N/A"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="icon"
                                aria-label="View leave request details"
                                onClick={() =>
                                  handleOpenLeaveRequestDetails(leaveRequest)
                                }
                              >
                                <Eye size={16} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      )}

      <Dialog
        open={openLeaveDetail}
        onOpenChange={handleLeaveDetailDialogChange}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="space-y-0 border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-4 pr-8">
              <div className="space-y-1 text-left">
                <DialogTitle className="text-xl">
                  Leave Request Details
                </DialogTitle>
                <DialogDescription>
                  Review the submitted leave information below.
                </DialogDescription>
              </div>
              {selectedLeaveRequest && (
                <Badge
                  variant={getLeaveStatusVariant(selectedLeaveRequest.status)}
                >
                  {formatLeaveStatus(selectedLeaveRequest.status)}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {selectedLeaveRequest && (
            <div className="space-y-5 px-6 py-5">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="mb-4 flex items-center gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                    <User size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {selectedLeaveRequest.student.name}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {selectedLeaveRequest.student.code}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailRow
                    icon={GraduationCap}
                    label="Class"
                    value={
                      selectedLeaveRequest.student.class?.name ??
                      selectedLeaveRequest.className
                    }
                  />
                  <DetailRow
                    icon={CalendarDays}
                    label="Requested Date"
                    value={formatDate(selectedLeaveRequest.request_date)}
                  />
                  <DetailRow
                    icon={User}
                    label="Submitted By"
                    value={selectedLeaveRequest.submitted_by_name}
                  />
                  <DetailRow
                    icon={Phone}
                    label="Contact Phone"
                    value={selectedLeaveRequest.submitted_by_phone}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  <FileText
                    size={16}
                    className="text-indigo-600 dark:text-indigo-400"
                  />
                  Reason for Leave
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  {selectedLeaveRequest.reason?.trim()
                    ? selectedLeaveRequest.reason
                    : "No reason provided."}
                </div>
              </div>

              {selectedLeaveRequest.status.toLowerCase() === "approved" && (
                <div className="rounded-2xl border border-green-200 bg-green-50/80 p-4 dark:border-green-900/50 dark:bg-green-950/20">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailRow
                      icon={UserCheck}
                      label="Approved By"
                      value={selectedLeaveRequest.approved_by_name}
                    />
                    <DetailRow
                      icon={Clock}
                      label="Approved At"
                      value={formatDateTime(selectedLeaveRequest.approved_at)}
                    />
                  </div>
                </div>
              )}

              {selectedLeaveRequest.status.toLowerCase() === "rejected" && (
                <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                  <div className="grid gap-4">
                    <DetailRow
                      icon={User}
                      label="Rejected By"
                      value={selectedLeaveRequest.rejected_by_name}
                    />
                    <DetailRow
                      icon={MessageSquareX}
                      label="Rejection Reason"
                      value={selectedLeaveRequest.rejected_reason}
                    />
                    <DetailRow
                      icon={Clock}
                      label="Rejected At"
                      value={formatDateTime(selectedLeaveRequest.rejected_at)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <Button
              variant="outline"
              className="rounded-xl border-zinc-200 dark:border-zinc-700"
              onClick={handleCloseLeaveRequestDetails}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
