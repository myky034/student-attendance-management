import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { getStudentById, type StudentRecord } from "@/lib/api/students";
import { motion } from "motion/react";
import { ArrowLeft, User, Mail, Shield, Calendar, Edit } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Paper, Typography, Box } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";

export function UserFormDetail() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  useEffect(() => {
    if (!userId) return;
    getStudentById(userId).then((student) => {
      setStudent(student);
    });
  }, [userId]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Student Details
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              View user information and activity
            </p>
          </div>
          <Button onClick={() => navigate(`/users/edit/${student?.id ?? ""}`)}>
            <Edit size={16} className="mr-2" />
            Edit User
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Paper
                  sx={{
                    p: 3,
                    mb: 3,
                    borderRadius: 3,
                    textAlign: "center",
                    boxShadow: 0,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    gutterBottom
                    fontWeight={600}
                    color="primary"
                  >
                    QR Code
                  </Typography>
                  <Box
                    sx={{ display: "flex", justifyContent: "center", my: 2 }}
                  >
                    <Box>
                      <QRCodeSVG value={student?.qrCode} size={150} />
                    </Box>
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 1 }}
                  >
                    Code: {student?.qrCode}
                  </Typography>
                </Paper>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                  <User
                    size={24}
                    className="text-zinc-500 dark:text-zinc-400"
                  />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Full Name
                  </p>
                  <p className="font-semibold">{student?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                  <Mail
                    size={24}
                    className="text-zinc-500 dark:text-zinc-400"
                  />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Email
                  </p>
                  <p className="font-semibold">{student?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                  <Shield
                    size={24}
                    className="text-zinc-500 dark:text-zinc-400"
                  />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Role
                  </p>
                  <Badge variant="default">
                    {student?.role === "student" ? "Student" : "Teacher"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                  <Calendar
                    size={24}
                    className="text-zinc-500 dark:text-zinc-400"
                  />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Joined
                  </p>
                  <p className="font-semibold">
                    {student?.createdAt
                      ? new Date(student.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Total Attendances
                </p>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
                  {student?.studentAttendance.length}
                </p>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Total Present Attendances
                </p>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
                  {student?.studentAttendance.reduce(
                    (acc, attendance) =>
                      acc + (attendance.status === "present" ? 1 : 0),
                    0,
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
