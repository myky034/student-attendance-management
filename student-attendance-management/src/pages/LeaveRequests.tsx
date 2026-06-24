import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Box, Typography } from "@mui/material";
import {
  getLeaveRequestsByClassId,
  type LeaveRequest,
  rejectLeaveRequest,
  approveLeaveRequest,
} from "@/lib/api/leaverequest";
import {
  saveAttendanceRecord,
  resolveSemesterIdForDate,
  normalizeAttendanceDate,
} from "@/lib/api/attendancerecord";
import { getVietnamTimestampString } from "@/lib/datetime";
import { toast } from "sonner";
import { useAppContext } from "@/context/useAppContext";
import {
  Check,
  X,
  Loader2,
  Eye,
  User,
  GraduationCap,
  CalendarDays,
  Phone,
  FileText,
  UserCheck,
  Clock,
  MessageSquareX,
} from "lucide-react";
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const MotionBox = motion(Box);

function getLeaveStatusVariant(status?: string) {
  const normalized = status?.toLowerCase();
  if (normalized === "pending") return "warning";
  if (normalized === "approved") return "success";
  if (normalized === "cancelled") return "outline";
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

function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

export function LeaveRequests() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ rejected_reason: string }>({
    rejected_reason: "",
  });
  const { user } = useAppContext();
  const [open, setOpen] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [selectedLeaveRequest, setSelectedLeaveRequest] =
    useState<LeaveRequest | null>(null);

  const loadLeaveRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getLeaveRequestsByClassId(user.classId);
      setLeaveRequests(data);
    } catch (error) {
      toast.error(error as string);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    void (async () => {
      try {
        const data = await getLeaveRequestsByClassId(user.classId);
        if (!cancelled) {
          setLeaveRequests(data);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error as string);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleOpenLeaveRequestDetails = (leaveRequest: LeaveRequest) => {
    setSelectedLeaveRequest(leaveRequest);
    setOpen(true);
  };

  const handleCloseLeaveRequestDetails = () => {
    setSelectedLeaveRequest(null);
    setOpen(false);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSelectedLeaveRequest(null);
    }
  };

  const handleOpenRejectDialog = (leaveRequest: LeaveRequest) => {
    setSelectedLeaveRequest(leaveRequest);
    setOpenRejectDialog(true);
    setError({ rejected_reason: "" });
  };

  const handleCloseRejectDialog = () => {
    setSelectedLeaveRequest(null);
    setOpenRejectDialog(false);
  };

  const validateRejectForm = () => {
    if (selectedLeaveRequest?.rejected_reason?.trim() === "") {
      setError({ rejected_reason: "Reason is required" });
      return false;
    }
    setError({ rejected_reason: "" });
    return true;
  };

  const handleRejectLeaveRequest = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    const newErrors = { ...error };
    if (!selectedLeaveRequest) {
      newErrors.rejected_reason = "Leave request is required";
      return;
    }
    if (!validateRejectForm()) {
      return;
    }
    setLoading(true);
    try {
      await rejectLeaveRequest({
        id: selectedLeaveRequest.id,
        rejected_reason: selectedLeaveRequest.rejected_reason,
        rejected_at: new Date().toISOString(),
        status: "rejected",
      });
      toast.success("Leave request rejected successfully");
      await loadLeaveRequests();
      handleCloseRejectDialog();
    } catch (error) {
      toast.error(error as string);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeaveRequest = async (leaveRequest: LeaveRequest) => {
    if (!user?.id || !user.classId) {
      toast.error("Teacher session is invalid. Please sign in again.");
      return;
    }

    setLoading(true);
    try {
      const classId = leaveRequest.class_id || user.classId;
      const attendanceDate = normalizeAttendanceDate(leaveRequest.request_date);
      const semesterId = await resolveSemesterIdForDate(attendanceDate);

      if (!semesterId) {
        toast.error("No active semester found for the leave request date.");
        return;
      }

      await saveAttendanceRecord({
        studentId: leaveRequest.student_id,
        date: attendanceDate,
        status: "excused_absence",
        timestamp: getVietnamTimestampString(),
        createdById: user.id,
        leaveRequestId: leaveRequest.id,
        classId,
        semesterId,
      });

      await approveLeaveRequest({
        id: leaveRequest.id,
        approved_by_id: user.id,
        approved_at: new Date().toISOString(),
        status: "approved",
      });

      toast.success("Leave request approved successfully");
      await loadLeaveRequests();
    } catch (error) {
      console.error("handleApproveLeaveRequest error:", error);
      toast.error(formatApiError(error, "Failed to approve leave request."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MotionBox
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          mb: 4,
        }}
      >
        <Typography variant="h4" fontWeight={700}>
          Leave Requests
        </Typography>
      </Box>
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>
            View and manage leave requests for your students.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Student Code</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Requested Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveRequests.length > 0 ? (
                  leaveRequests.map((leaveRequest, index) => (
                    <TableRow key={leaveRequest.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{leaveRequest.student.name}</TableCell>
                      <TableCell>{leaveRequest.student.code}</TableCell>
                      <TableCell>{leaveRequest.student.class?.name}</TableCell>
                      <TableCell>{leaveRequest.submitted_by_name}</TableCell>
                      <TableCell>
                        {new Date(
                          leaveRequest.request_date,
                        ).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getLeaveStatusVariant(leaveRequest.status)}
                        >
                          {formatLeaveStatus(leaveRequest.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="mr-2"
                            onClick={() =>
                              handleOpenLeaveRequestDetails(leaveRequest)
                            }
                          >
                            <Eye size={16} />
                          </Button>
                          {leaveRequest.status.toLowerCase() === "pending" && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="success"
                                size="sm"
                                className="mr-2"
                                onClick={() =>
                                  handleApproveLeaveRequest(leaveRequest)
                                }
                              >
                                <Check size={16} />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() =>
                                  handleOpenRejectDialog(leaveRequest)
                                }
                              >
                                <X size={16} />
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Typography variant="body1" fontWeight={400} color="gray">
                        No leave requests found for your class
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/** Leave Request Details Dialog */}
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
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

      {/* Leave Request Reject Dialog */}
      <Dialog open={openRejectDialog} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader className="shrink-0 pb-2">
            <DialogTitle>Leave Request Reject</DialogTitle>
            <DialogDescription>Reject the leave request.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRejectLeaveRequest}>
            <Textarea
              placeholder="Reason for rejection"
              value={selectedLeaveRequest?.rejected_reason || ""}
              onChange={(e) =>
                setSelectedLeaveRequest({
                  ...selectedLeaveRequest,
                  rejected_reason: e.target.value,
                })
              }
            />
            {error.rejected_reason && (
              <Typography
                variant="body1"
                fontWeight={400}
                color="red"
                sx={{ fontSize: "12px" }}
              >
                {error.rejected_reason}
              </Typography>
            )}
            <DialogFooter>
              <div className="flex items-center gap-2 justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCloseRejectDialog}
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  type="submit"
                  disabled={loading}
                >
                  Reject
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MotionBox>
  );
}
