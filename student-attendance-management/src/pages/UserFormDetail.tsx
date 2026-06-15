import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { getStudentById, type StudentRecord } from "@/lib/api/students";
import { getAcademicYears } from "@/lib/api/academicyear";
import { getSemesters } from "@/lib/api/semester";
import { getAttendanceRecordsByStudentIds } from "@/lib/api/attendancerecord";
import {
  calculateYearlyAttendanceTotals,
  getAcademicYearForDate,
  getYearSchoolSessions,
  toDateString,
} from "@/lib/attendanceYear";
import { motion } from "motion/react";
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Calendar,
  Edit,
  ImageDown,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Paper, Typography, Box } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";

const QR_CODE_SIZE = 150;

function buildQrCodeLabel(name: string, qrCode: string) {
  return `${name}-${qrCode}`;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = word;
      continue;
    }

    let chunk = "";
    for (const char of word) {
      const testChunk = chunk + char;
      if (ctx.measureText(testChunk).width <= maxWidth) {
        chunk = testChunk;
      } else {
        if (chunk) lines.push(chunk);
        chunk = char;
      }
    }
    currentLine = chunk;
  }

  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [text];
}

function downloadQrCodeImage(
  svg: SVGSVGElement,
  fileName: string,
  qrSize: number,
  label: string,
) {
  const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
  clonedSvg.setAttribute("width", String(qrSize));
  clonedSvg.setAttribute("height", String(qrSize));

  const svgString = new XMLSerializer().serializeToString(clonedSvg);
  const svgBlob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = () => {
    const horizontalPadding = qrSize * 0.1;
    const topPadding = qrSize * 0.1;
    const bottomPadding = qrSize * 0.1;
    const labelGap = qrSize * 0.1;
    const fontSize = qrSize * 0.05;
    const lineHeight = Math.round(fontSize * 1.4);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return;
    }

    canvas.width = qrSize + horizontalPadding * 2;
    const maxTextWidth = canvas.width - horizontalPadding * 2;

    ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
    const lines = wrapCanvasText(ctx, label, maxTextWidth);
    const labelBlockHeight = lines.length * lineHeight;

    canvas.height =
      topPadding + qrSize + labelGap + labelBlockHeight + bottomPadding;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, horizontalPadding, topPadding, qrSize, qrSize);

    ctx.fillStyle = "#18181b";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;

    const labelStartY = topPadding + qrSize + labelGap;
    lines.forEach((line, index) => {
      ctx.fillText(line, canvas.width / 2, labelStartY + index * lineHeight);
    });

    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(downloadUrl);
    }, "image/png");
  };

  image.src = url;
}

export function UserFormDetail() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const qrCodeRef = useRef<SVGSVGElement>(null);
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [academicYearName, setAcademicYearName] = useState("");
  const [yearSchoolSundays, setYearSchoolSundays] = useState<string[]>([]);
  const [yearAttendanceRecords, setYearAttendanceRecords] = useState<
    { date: string; status: string }[]
  >([]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    void (async () => {
      try {
        const loadedStudent = await getStudentById(userId);
        if (cancelled) return;
        setStudent(loadedStudent);

        if (!loadedStudent) {
          setAcademicYearName("");
          setYearSchoolSundays([]);
          setYearAttendanceRecords([]);
          return;
        }

        const [years, semesters] = await Promise.all([
          getAcademicYears(),
          getSemesters(),
        ]);
        if (cancelled) return;

        const academicYear = getAcademicYearForDate(years);
        if (!academicYear) {
          setAcademicYearName("");
          setYearSchoolSundays([]);
          setYearAttendanceRecords([]);
          return;
        }

        setAcademicYearName(academicYear.name);
        const { sundays } = getYearSchoolSessions(semesters, academicYear);
        setYearSchoolSundays(sundays);

        const records = await getAttendanceRecordsByStudentIds({
          studentIds: [loadedStudent.id],
          dateFrom: toDateString(academicYear.startDate),
          dateTo: toDateString(academicYear.endDate),
        });
        if (!cancelled) {
          setYearAttendanceRecords(records);
        }
      } catch (err) {
        console.error("Failed to load student attendance stats:", err);
        if (!cancelled) {
          setAcademicYearName("");
          setYearSchoolSundays([]);
          setYearAttendanceRecords([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const attendanceStats = useMemo(
    () =>
      calculateYearlyAttendanceTotals(
        yearAttendanceRecords,
        yearSchoolSundays,
      ),
    [yearAttendanceRecords, yearSchoolSundays],
  );

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
                    fontWeight={600}
                    color="primary"
                    className="text-center items-center justify-center"
                  >
                    QR Code
                  </Typography>
                  <Box
                    sx={{ display: "flex", justifyContent: "center", my: 2 }}
                  >
                    <Box>
                      <QRCodeSVG
                        ref={qrCodeRef}
                        value={student?.qrCode ?? ""}
                        size={QR_CODE_SIZE}
                      />
                    </Box>
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 1 }}
                  >
                    Code: {student?.qrCode}
                  </Typography>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (
                        !qrCodeRef.current ||
                        !student?.qrCode ||
                        !student.name
                      ) {
                        return;
                      }

                      const label = buildQrCodeLabel(
                        student.name,
                        student.qrCode,
                      );
                      downloadQrCodeImage(
                        qrCodeRef.current,
                        `qr-code-${label}.png`,
                        QR_CODE_SIZE,
                        label,
                      );
                    }}
                  >
                    <ImageDown size={16} className="mr-2" />
                    Download QR Code
                  </Button>
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
              <CardDescription>
                {academicYearName
                  ? `Academic year ${academicYearName} · both semesters (TL + GL per Sunday)`
                  : "No active academic year configured"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900">
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Present (P)
                </p>
                <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                  {attendanceStats.present}
                </p>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-100 dark:border-red-900">
                <p className="text-sm text-red-700 dark:text-red-300">
                  Absent (V)
                </p>
                <p className="text-3xl font-bold text-red-900 dark:text-red-100 mt-1">
                  {attendanceStats.absent}
                </p>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-100 dark:border-amber-900">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Excused Absence (E)
                </p>
                <p className="text-3xl font-bold text-amber-900 dark:text-amber-100 mt-1">
                  {attendanceStats.excused}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
