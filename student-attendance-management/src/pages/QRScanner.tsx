import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QrCode, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Box,
  Card,
  TableRow,
  Typography,
  CardContent,
  Button,
  Alert,
  TextField,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableCell,
  Paper,
  Avatar,
} from "@mui/material";
import { toast } from "sonner";
import { getStudents, type StudentRecord } from "@/lib/api/students";
import { saveAttendanceRecord } from "@/lib/api/attendancerecord";
import {
  formatVietnamTime,
  getVietnamDateString,
  getVietnamTimestampString,
} from "@/lib/datetime";
import { useAppContext } from "../context/useAppContext";

const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card);
const MotionTableRow = motion.create(TableRow);

function normalizeAttendanceDate(date: string): string {
  return date.split("T")[0];
}

function hasAttendanceToday(student: StudentRecord, today: string): boolean {
  return student.studentAttendance.some(
    (record) => normalizeAttendanceDate(record.date) === today,
  );
}

export function QRScanner() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDemoQR, setShowDemoQR] = useState(false);
  const [manualId, setManualId] = useState("");
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
      const data = await getStudents({ classId });
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
    () => students.filter((student) => !hasAttendanceToday(student, today)),
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

  const handleScan = (studentId: string) => {
    const foundStudent = studentsPendingToday.find((s) => s.id === studentId);
    if (!foundStudent) {
      const markedStudent = students.find((s) => s.id === studentId);
      if (markedStudent && hasAttendanceToday(markedStudent, today)) {
        toast.warning(`${markedStudent.name} đã được điểm danh hôm nay`);
      } else {
        toast.error("Student not found");
      }
      return;
    }

    const alreadyScanned = scannedStudents.some(
      (entry) => entry.studentId === studentId,
    );
    if (alreadyScanned) {
      toast.warning("Student already scanned");
      return;
    }

    const timestamp = getVietnamTimestampString();
    setScannedStudents((prev) => [...prev, { studentId, timestamp }]);
    toast.success(
      `Scanned ${foundStudent.name} at ${formatVietnamTime(timestamp)}`,
    );
  };

  const handleManualEntry = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!manualId.trim()) {
      toast.error("Please enter a student ID");
      return;
    }

    const studentId = manualId.trim();
    const foundStudent = studentsPendingToday.find((s) => s.id === studentId);
    if (!foundStudent) {
      const markedStudent = students.find((s) => s.id === studentId);
      if (markedStudent && hasAttendanceToday(markedStudent, today)) {
        toast.warning(`${markedStudent.name} đã được điểm danh hôm nay`);
      } else {
        toast.error("Student not found");
      }
      return;
    }

    handleScan(studentId);
    setManualId("");
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

    const todayDate = getVietnamDateString();
    const absentTimestamp = getVietnamTimestampString();
    const scannedById = new Map(
      visibleScannedStudents.map((entry) => [entry.studentId, entry]),
    );

    let presentCount = 0;
    let absentCount = 0;
    let errorCount = 0;

    for (const student of studentsPendingToday) {
      const scanned = scannedById.get(student.id);

      try {
        await saveAttendanceRecord({
          studentId: student.id,
          date: todayDate,
          status: scanned ? "present" : "absent",
          timestamp: scanned ? scanned.timestamp : absentTimestamp,
          createdById: user.id,
        });

        if (scanned) {
          presentCount++;
        } else {
          absentCount++;
        }
      } catch (error) {
        console.error("Failed to save attendance record:", error);
        errorCount++;
        toast.error(`Failed to save attendance for ${student.name}`);
      }
    }

    setScannedStudents([]);

    if (errorCount === 0) {
      toast.success(
        `Attendance completed: ${presentCount} present, ${absentCount} absent`,
      );
      await loadStudents();
    } else if (presentCount + absentCount > 0) {
      toast.warning(
        `Saved ${presentCount + absentCount} record(s), ${errorCount} failed`,
      );
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
                    variant="contained"
                    size="medium"
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
              <QrCode
                size={48}
                style={{ margin: "0 auto", color: "#667eea" }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                QR Scanner would appear here in a production app
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowDemoQR(!showDemoQR)}
                sx={{ mt: 2 }}
              >
                {showDemoQR ? "Hide Demo QR" : "Show Demo QR Codes"}
              </Button>
            </Box>

            <AnimatePresence>
              {showDemoQR && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Box sx={{ mb: 2 }}>
                    <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                      Demo: Click on any QR code to simulate scanning
                    </Alert>
                    {alreadyMarkedCount > 0 && (
                      <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                        {alreadyMarkedCount} student(s) đã điểm danh hôm nay và
                        không hiển thị trong danh sách quét.
                      </Alert>
                    )}
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
                            ? "Tất cả học sinh đã được điểm danh hôm nay"
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
              <TextField
                fullWidth
                size="small"
                placeholder="Enter Student ID"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <Button
                      type="submit"
                      size="small"
                      disabled={!manualId.trim()}
                    >
                      Add
                    </Button>
                  ),
                }}
              />
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
                      size="small"
                      startIcon={<Trash2 size={16} />}
                      onClick={handleClearAll}
                      color="error"
                      sx={{
                        transition: "all 0.2s ease",
                        "&:hover": {
                          transform: "scale(1.05)",
                        },
                      }}
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
                                      size="small"
                                      color="error"
                                      onClick={() =>
                                        handleRemoveStudent(entry.studentId)
                                      }
                                      sx={{
                                        transition: "all 0.2s ease",
                                      }}
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
