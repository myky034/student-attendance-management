import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Box,
  Card,
  TableRow,
  Typography,
  CardContent,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableCell,
  Paper,
  Avatar,
  Alert,
} from "@mui/material";
import { toast } from "sonner";
import {
  getStudentsForAttendance,
  getStudentAttendanceByCode,
  type StudentRecord,
} from "@/lib/api/students";
import {
  saveAttendanceRecord,
  resolveSemesterIdForDate,
  updateAttendanceRecord,
} from "@/lib/api/attendancerecord";
import { cancelLeaveRequest } from "@/lib/api/leaverequest";
import {
  formatVietnamTime,
  getVietnamDateString,
  getVietnamTimestampString,
} from "@/lib/datetime";
import { useAppContext } from "../context/useAppContext";
import { useQrCameraScanner } from "@/hooks/useQrCameraScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/lable";

const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card);
const MotionTableRow = motion.create(TableRow);

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

function isPendingForScan(student: StudentRecord, today: string): boolean {
  const todayRecord = getTodayAttendanceRecord(student, today);
  if (!todayRecord) return true;
  if (todayRecord.status === "present") return false;
  if (todayRecord.isLate) return false;
  return (
    todayRecord.status === "absent" || todayRecord.status === "excused_absence"
  );
}

export function QRScanner() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDemoQR, setShowDemoQR] = useState(false);
  const [manualName, setManualName] = useState("");
  const [scannedStudents, setScannedStudents] = useState<
    { studentId: string; timestamp: string }[]
  >([]);
  const { user } = useAppContext();

  const loadStudents = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const classId =
        user.role === "teacher" && user.classId ? user.classId : undefined;
      if (user.role === "teacher" && !user.classId) {
        setStudents([]);
        setError("Teacher not assigned to a class. Please update in Settings.");
        return;
      }
      const data = await getStudentsForAttendance({ classId });
      setStudents(data);
    } catch (error) {
      console.error("Failed to fetch students:", error);
      setError("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    void (async () => {
      await loadStudents();
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loadStudents]);

  const today = getVietnamDateString();

  const studentsPendingToday = useMemo(
    () => students.filter((student) => isPendingForScan(student, today)),
    [students, today],
  );

  const unscannedStudents = useMemo(() => {
    const scannedIds = new Set(scannedStudents.map((entry) => entry.studentId));
    return studentsPendingToday.filter(
      (student) => !scannedIds.has(student.id),
    );
  }, [studentsPendingToday, scannedStudents]);

  const visibleScannedStudents = useMemo(() => {
    const pendingIds = new Set(
      studentsPendingToday.map((student) => student.id),
    );
    return scannedStudents.filter((entry) => pendingIds.has(entry.studentId));
  }, [scannedStudents, studentsPendingToday]);

  const alreadyMarkedCount = students.length - studentsPendingToday.length;

  const resolveStudentFromLookup = useCallback(
    (lookup: string): StudentRecord | undefined => {
      const trimmed = lookup.trim();
      if (!trimmed) return undefined;

      const byIdOrQr = students.find(
        (student) => student.id === trimmed || student.qrCode === trimmed,
      );
      if (byIdOrQr) return byIdOrQr;

      const lower = trimmed.toLowerCase();
      return students.find((student) => student.name.toLowerCase() === lower);
    },
    [students],
  );

  const addStudentToScannedList = useCallback(
    (student: StudentRecord, successPrefix = "Scanned") => {
      const todayRecord = getTodayAttendanceRecord(student, today);

      if (todayRecord?.status === "present") {
        toast.warning(`${student.name} đã được điểm danh hôm nay`);
        return;
      }

      if (todayRecord?.isLate) {
        toast.warning(`${student.name} đã được ghi nhận đi muộn hôm nay`);
        return;
      }

      const timestamp = getVietnamTimestampString();
      let scanResult: "added" | "duplicate" | null = null;

      setScannedStudents((prev) => {
        if (prev.some((entry) => entry.studentId === student.id)) {
          scanResult = "duplicate";
          return prev;
        }

        scanResult = "added";
        return [...prev, { studentId: student.id, timestamp }];
      });

      if (scanResult === "duplicate") {
        toast.warning(`${student.name} đã có trong danh sách quét`);
        return;
      }

      if (scanResult === "added") {
        toast.success(
          `${successPrefix} ${student.name} at ${formatVietnamTime(timestamp)}`,
        );
      }
    },
    [today],
  );

  const handleScan = useCallback(
    async (lookup: string) => {
      const trimmed = lookup.trim();
      if (!trimmed) return;

      try {
        let student = resolveStudentFromLookup(trimmed);

        if (!student) {
          const classId =
            user?.role === "teacher" && user.classId ? user.classId : undefined;
          student =
            (await getStudentAttendanceByCode(trimmed, { classId })) ??
            undefined;
        }

        if (!student) {
          toast.error("Student not found");
          return;
        }

        addStudentToScannedList(student);
      } catch {
        toast.error("Unable to verify student.");
      }
    },
    [addStudentToScannedList, resolveStudentFromLookup, user],
  );

  const { setVideoRef, errorScan, handleOpenScanner, handleCloseScanner } =
    useQrCameraScanner({
      autoStart: true,
      stopAfterScan: false,
      onScan: handleScan,
    });

  const handleManualEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = manualName.trim();
    if (!query) {
      toast.error("Please enter a student name");
      return;
    }

    const matches = unscannedStudents.filter((student) =>
      student.name.toLowerCase().includes(query.toLowerCase()),
    );
    if (matches.length === 0) {
      toast.error("Student not found");
      setManualName("");
      return;
    }

    addStudentToScannedList(matches[0], "Added");
    setManualName("");
  };

  const handleCompleteAttendance = async () => {
    setLoading(true);
    if (visibleScannedStudents.length === 0) {
      toast.error("No students scanned");
      setLoading(false);
      return;
    }

    if (studentsPendingToday.length === 0) {
      toast.error("All students already marked attendance today");
      setLoading(false);
      return;
    }

    if (!user?.classId) {
      toast.error("Teacher not assigned to a class.");
      setLoading(false);
      return;
    }

    const todayDate = getVietnamDateString();
    const absentTimestamp = getVietnamTimestampString();
    const semesterId = await resolveSemesterIdForDate(todayDate);

    if (!semesterId) {
      toast.error("No active semester found for today's date.");
      setLoading(false);
      return;
    }

    const scannedById = new Map(
      visibleScannedStudents.map((entry) => [entry.studentId, entry]),
    );

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let errorCount = 0;

    for (const student of studentsPendingToday) {
      const scanned = scannedById.get(student.id);
      const todayRecord = getTodayAttendanceRecord(student, todayDate);

      try {
        if (scanned) {
          if (!todayRecord) {
            await saveAttendanceRecord({
              studentId: student.id,
              date: todayDate,
              status: "present",
              timestamp: scanned.timestamp,
              createdById: user.id,
              classId: user.classId,
              semesterId,
            });
            presentCount++;
            continue;
          }

          if (todayRecord.status === "excused_absence") {
            if (!todayRecord.leaveRequestId) {
              throw new Error(
                `${student.name} có điểm danh nghỉ phép nhưng không tìm thấy đơn xin nghỉ liên quan.`,
              );
            }

            await cancelLeaveRequest(todayRecord.leaveRequestId);
          }

          if (
            todayRecord.status === "absent" ||
            todayRecord.status === "excused_absence"
          ) {
            await updateAttendanceRecord({
              id: todayRecord.id,
              status: "present",
              timestamp: scanned.timestamp,
              createdById: user.id,
              classId: user.classId,
              semesterId,
              isLate: true,
            });
            lateCount++;
          }

          continue;
        }

        if (todayRecord?.status === "excused_absence") {
          continue;
        }

        if (todayRecord?.status === "absent") {
          absentCount++;
          continue;
        }

        await saveAttendanceRecord({
          studentId: student.id,
          date: todayDate,
          status: "absent",
          timestamp: absentTimestamp,
          createdById: user.id,
          classId: user.classId,
          semesterId,
        });
        absentCount++;
      } catch (error) {
        console.error("Failed to save attendance record:", error);
        errorCount++;
        const message =
          error instanceof Error
            ? error.message
            : `Failed to save attendance for ${student.name}`;
        toast.error(message);
      }
    }

    setScannedStudents([]);

    const savedCount = presentCount + lateCount + absentCount;
    if (errorCount === 0) {
      toast.success(
        `Attendance completed: ${presentCount} present, ${lateCount} late, ${absentCount} absent`,
      );
      await loadStudents();
    } else if (savedCount > 0) {
      toast.warning(`Saved ${savedCount} record(s), ${errorCount} failed`);
      await loadStudents();
    } else {
      toast.error("Could not save any attendance records");
    }
    setLoading(false);
  };

  const handleRemoveStudent = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    setScannedStudents((prev) =>
      prev.filter((entry) => entry.studentId !== studentId),
    );
    toast.success(`Removed ${student?.name ?? studentId} from scanned list`);
  };

  const handleClearAll = () => {
    setScannedStudents([]);
    toast.success("All students removed");
  };

  const getStudentById = (studentId: string) => {
    return students.find((s) => s.id === studentId);
  };

  return (
    <MotionBox
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        sx={{ mb: 4 }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h4" fontWeight={700}>
            QR Code
          </Typography>
          <AnimatePresence>
            {visibleScannedStudents.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="default"
                    size="lg"
                    onClick={handleCompleteAttendance}
                    className="py-2.5 px-6 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 inline-flex items-center gap-2"
                  >
                    Complete Attendance ({visibleScannedStudents.length}{" "}
                    present, {unscannedStudents.length} absent)
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Scan student QR codes for quick attendance marking
        </Typography>
      </MotionBox>

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        }}
      >
        <MotionCard
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          sx={{
            borderRadius: 3,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={700}>
              Scan QR Code
            </Typography>

            {!showDemoQR && (
              <Box
                sx={{
                  border: "2px dashed #ccc",
                  borderRadius: 2,
                  p: 4,
                  textAlign: "center",
                  bgcolor: "#f9fafb",
                  mb: 2,
                }}
              >
                {errorScan && (
                  <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                    {errorScan}
                  </Typography>
                )}
                <video
                  ref={setVideoRef}
                  className="min-h-[280px] w-full rounded-2xl bg-black object-cover"
                  autoPlay
                  muted
                  playsInline
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2 }}
                >
                  Point the camera at the student QR code to continue.
                </Typography>
              </Box>
            )}
            <div className="flex justify-center">
              <Button
                variant="default"
                size="lg"
                onClick={() => {
                  if (showDemoQR) {
                    setShowDemoQR(false);
                    handleOpenScanner();
                  } else {
                    handleCloseScanner();
                    setShowDemoQR(true);
                  }
                }}
                className="mt-2"
              >
                {showDemoQR ? "Hide Demo QR" : "Show Demo QR Codes"}
              </Button>
            </div>

            <AnimatePresence>
              {showDemoQR && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Box sx={{ mb: 2 }}>
                    <Alert severity="info" className="mb-2 rounded-2xl mt-2">
                      <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Click on any QR code to simulate scanning
                      </Label>
                      {alreadyMarkedCount} student(s) has been marked attendance
                      today and not shown in the scanned list.
                    </Alert>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(100px, 1fr))",
                        gap: 2,
                      }}
                    >
                      {loading ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Loading...
                          </Typography>
                        </motion.div>
                      ) : error ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            {error}
                          </Typography>
                        </motion.div>
                      ) : unscannedStudents.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          {studentsPendingToday.length === 0
                            ? "All students have been marked attendance today"
                            : "All students in this session have been scanned"}
                        </Typography>
                      ) : (
                        unscannedStudents.map((student, idx) => (
                          <motion.div
                            key={student.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05, duration: 0.3 }}
                          >
                            <MotionBox
                              onClick={() => handleScan(student.id)}
                              whileHover={{ scale: 1.05, y: -4 }}
                              whileTap={{ scale: 0.95 }}
                              sx={{
                                cursor: "pointer",
                                p: 1.5,
                                border: "2px solid #e0e0e0",
                                borderRadius: 2,
                                transition: "all 0.2s ease",
                                "&:hover": {
                                  bgcolor: "#f5f5f5",
                                  borderColor: "#a8c0ff",
                                  boxShadow:
                                    "0 4px 12px rgba(168, 192, 255, 0.3)",
                                },
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                              }}
                            >
                              <QRCodeSVG value={student.id} size={80} />
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "block",
                                  mt: 1,
                                  textAlign: "center",
                                  fontWeight: 600,
                                }}
                              >
                                {student.holy_name}
                                {""}
                                {student.name}
                              </Typography>
                            </MotionBox>
                          </motion.div>
                        ))
                      )}
                    </Box>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Manual Entry
            </Typography>
            <form onSubmit={handleManualEntry}>
              <div className="flex gap-2">
                <Input
                  id="manualId"
                  placeholder="Enter Student Name"
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="h-12 rounded-xl border-zinc-200 bg-zinc-50 text-base focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800/50"
                />
                <Button
                  type="submit"
                  className="h-12 rounded-xl bg-indigo-600 text-base font-semibold shadow-indigo-600/20 hover:bg-indigo-700"
                  disabled={!manualName.trim()}
                >
                  <Plus size={18} />
                  Add
                </Button>
              </div>
            </form>
          </CardContent>
        </MotionCard>

        <MotionCard
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          sx={{
            borderRadius: 3,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  Scanned Students
                </Typography>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{
                    duration: 0.5,
                    repeat: visibleScannedStudents.length > 0 ? Infinity : 0,
                  }}
                >
                  <Chip
                    label={visibleScannedStudents.length}
                    size="small"
                    sx={{
                      color: "white",
                      fontWeight: 700,
                    }}
                    color="primary"
                  />
                </motion.div>
              </Box>
              <AnimatePresence>
                {visibleScannedStudents.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Button
                      size="lg"
                      variant="destructive"
                      onClick={handleClearAll}
                    >
                      Clear All
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>

            <AnimatePresence mode="wait">
              {visibleScannedStudents.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <Box
                    sx={{
                      textAlign: "center",
                      py: 6,
                      border: "2px dashed #ccc",
                      borderRadius: 3,
                      bgcolor: "#f9fafb",
                    }}
                  >
                    <QrCode
                      size={48}
                      color="#ccc"
                      style={{ margin: "0 auto 16px" }}
                    />
                    <Typography color="text.secondary" fontWeight={500}>
                      No students scanned yet
                    </Typography>
                  </Box>
                </motion.div>
              ) : (
                <motion.div
                  key="table"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "#f9fafb" }}>
                          <TableCell>
                            <strong>Student</strong>
                          </TableCell>
                          <TableCell>
                            <strong>Time</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>Action</strong>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <AnimatePresence>
                          {visibleScannedStudents.map((entry, idx) => {
                            const student = getStudentById(entry.studentId);
                            return (
                              <MotionTableRow
                                key={entry.studentId}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{
                                  delay: idx * 0.05,
                                  duration: 0.3,
                                }}
                                whileHover={{
                                  backgroundColor: "rgba(16, 185, 129, 0.05)",
                                }}
                              >
                                <TableCell>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{
                                        type: "spring",
                                        stiffness: 500,
                                      }}
                                    >
                                      <Avatar
                                        sx={{
                                          background:
                                            "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
                                          width: 32,
                                          height: 32,
                                        }}
                                      >
                                        {student?.name.charAt(0)}
                                      </Avatar>
                                    </motion.div>
                                    <Box>
                                      <Typography
                                        variant="body2"
                                        fontWeight={600}
                                      >
                                        {student?.name}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        {entry.studentId}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={formatVietnamTime(entry.timestamp)}
                                    size="small"
                                    sx={{
                                      background:
                                        "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
                                      color: "white",
                                      fontWeight: 600,
                                    }}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Button
                                      size="lg"
                                      variant="destructive"
                                      onClick={() =>
                                        handleRemoveStudent(entry.studentId)
                                      }
                                    >
                                      Remove
                                    </Button>
                                  </motion.div>
                                </TableCell>
                              </MotionTableRow>
                            );
                          })}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </MotionCard>
      </Box>
    </MotionBox>
  );
}
