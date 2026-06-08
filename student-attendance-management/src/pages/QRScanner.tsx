import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QrCode, Save, Trash2 } from "lucide-react";
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
import { initialStudents } from "../data/mockData";

const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card);
const MotionTableRow = motion.create(TableRow);

export function QRScanner() {
  const [students] = useState(initialStudents);
  const [showDemoQR, setShowDemoQR] = useState(false);
  const [manualId, setManualId] = useState("");
  const [scannedStudents, setScannedStudents] = useState<
    { studentId: string; timestamp: string }[]
  >([]);

  const handleScan = (studentId: string) => {
    const foundStudent = students.find((s) => s.id === studentId);
    if (!foundStudent) {
      toast.error("Student not found");
      return;
    }

    const alreadyScanned = scannedStudents.find(
      (s) => s.studentId === studentId,
    );
    if (alreadyScanned) {
      toast.warning("Student already scanned");
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    setScannedStudents([...scannedStudents, { studentId, timestamp }]);
    toast.success(`Scanned ${foundStudent.name} at ${timestamp}`);
  };

  const handleManualEntry = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!manualId.trim()) {
      toast.error("Please enter a student ID");
      return;
    }
    const foundStudent = students.find((s) => s.id === manualId);
    if (!foundStudent) {
      toast.error("Student not found");
      return;
    }
    toast.success(`Scanned ${foundStudent.name}`);
  };

  const handleCompleteAttendance = () => {
    if (scannedStudents.length === 0) {
      toast.error("No students scanned");
      return;
    }

    setScannedStudents([]);
    toast.success(
      `Completed attendance for ${scannedStudents.length} students`,
    );
  };

  const handleRemoveStudent = (studentId: string) => {
    setScannedStudents(
      scannedStudents.filter((s) => s.studentId !== studentId),
    );
    toast.success(`Removed student ${studentId}`);
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h4" gutterBottom fontWeight={700}>
            QR Code
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
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
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(100px, 1fr))",
                        gap: 2,
                      }}
                    >
                      {students.map((student, idx) => (
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
                              {student.name.split(" ")[0]}
                            </Typography>
                          </MotionBox>
                        </motion.div>
                      ))}
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
                    repeat: scannedStudents.length > 0 ? Infinity : 0,
                  }}
                >
                  <Chip
                    label={scannedStudents.length}
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
                {scannedStudents.length > 0 && (
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
              {scannedStudents.length === 0 ? (
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
                          {scannedStudents.map((entry, idx) => {
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
                                    label={entry.timestamp}
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

      <AnimatePresence>
        {scannedStudents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Box
              sx={{
                mt: 3,
                display: "flex",
                gap: 2,
                justifyContent: "flex-end",
              }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="contained"
                  size="medium"
                  startIcon={<Save size={20} />}
                  onClick={handleCompleteAttendance}
                  className="py-2.5 px-6 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 inline-flex items-center gap-2"
                >
                  Complete Attendance ({scannedStudents.length} students)
                </Button>
              </motion.div>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionBox>
  );
}
