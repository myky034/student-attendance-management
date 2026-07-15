import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Crown,
  Shield,
  Users,
  GraduationCap,
  School,
  TrendingUp,
  AlertTriangle,
  History,
  RefreshCw,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "../components/ui/table";
import { useAppContext } from "../context/useAppContext";
import {
  getAdminDashboardOverview,
  getAttendanceRateByClass,
  getWeeklyAttendanceTrend,
  getTopAbsentStudentsThisWeek,
  getRecentAuditLogs,
  type AdminDashboardOverview,
  type ClassAttendanceRate,
  type WeekdayTrendPoint,
  type AbsentStudentAlert,
} from "@/lib/api/adminDashboard";
import type { AuditLogRecord } from "@/lib/audit/types";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
} from "@/lib/audit/constants";
import { formatAuditDateTime } from "@/lib/audit/format";

type SectionState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

function SectionSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800"
        />
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-8 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="h-12 w-12 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </CardHeader>
      <CardContent>
        <div className="h-[260px] animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </CardContent>
    </Card>
  );
}

function SectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw size={14} className="mr-1.5" />
          Thử lại
        </Button>
      )}
    </div>
  );
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

export function AdminDashboard() {
  const { user } = useAppContext();

  const scopeContext = useMemo(
    () => ({
      scope: (user?.role === "supervisor" ? "supervisor" : "admin") as
        | "admin"
        | "supervisor",
      userId: user?.id ?? "",
      classId: user?.classId ?? null,
    }),
    [user],
  );

  const [overview, setOverview] = useState<
    SectionState<AdminDashboardOverview>
  >({ data: null, loading: true, error: null });
  const [byClass, setByClass] = useState<
    SectionState<ClassAttendanceRate[]>
  >({ data: null, loading: true, error: null });
  const [trend, setTrend] = useState<SectionState<WeekdayTrendPoint[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const [absentAlerts, setAbsentAlerts] = useState<
    SectionState<AbsentStudentAlert[]>
  >({ data: null, loading: true, error: null });
  const [auditLogs, setAuditLogs] = useState<
    SectionState<AuditLogRecord[]>
  >({ data: null, loading: true, error: null });

  const loadOverview = useCallback(async () => {
    setOverview((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getAdminDashboardOverview();
      setOverview({ data, loading: false, error: null });
    } catch {
      setOverview({
        data: null,
        loading: false,
        error: "Không tải được thống kê tổng quan.",
      });
    }
  }, []);

  const loadByClass = useCallback(async () => {
    setByClass((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getAttendanceRateByClass();
      setByClass({ data, loading: false, error: null });
    } catch {
      setByClass({
        data: null,
        loading: false,
        error: "Không tải được biểu đồ theo lớp.",
      });
    }
  }, []);

  const loadTrend = useCallback(async () => {
    setTrend((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getWeeklyAttendanceTrend();
      setTrend({ data, loading: false, error: null });
    } catch {
      setTrend({
        data: null,
        loading: false,
        error: "Không tải được xu hướng điểm danh.",
      });
    }
  }, []);

  const loadAbsent = useCallback(async () => {
    setAbsentAlerts((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getTopAbsentStudentsThisWeek();
      setAbsentAlerts({ data, loading: false, error: null });
    } catch {
      setAbsentAlerts({
        data: null,
        loading: false,
        error: "Không tải được danh sách vắng nhiều.",
      });
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setAuditLogs((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getRecentAuditLogs(scopeContext, 5);
      setAuditLogs({ data, loading: false, error: null });
    } catch {
      setAuditLogs({
        data: null,
        loading: false,
        error: "Không tải được nhật ký hoạt động.",
      });
    }
  }, [scopeContext]);

  const loadAll = useCallback(() => {
    void loadOverview();
    void loadByClass();
    void loadTrend();
    void loadAbsent();
    void loadAudit();
  }, [loadOverview, loadByClass, loadTrend, loadAbsent, loadAudit]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const statCards = useMemo(() => {
    const o = overview.data;
    return [
      {
        title: "Tổng học sinh",
        value: o?.totalStudents ?? "—",
        gradient: "linear-gradient(135deg, #a8c0ff 0%, #c2e9fb 100%)",
        icon: Users,
      },
      {
        title: "Tổng giáo viên",
        value: o?.totalTeachers ?? "—",
        gradient: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
        icon: GraduationCap,
      },
      {
        title: "Tổng lớp học",
        value: o?.totalClasses ?? "—",
        gradient: "linear-gradient(135deg, #ffa8b5 0%, #ffd3a5 100%)",
        icon: School,
      },
      {
        title: "Tỷ lệ điểm danh hôm nay",
        value:
          o != null ? `${o.todayAttendanceRate.toFixed(1)}%` : "—",
        subtitle:
          o != null
            ? `${o.todayPresent}/${o.todayTotal} có mặt`
            : undefined,
        gradient: "linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)",
        icon: TrendingUp,
      },
    ];
  }, [overview.data]);

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
              Bảng điều khiển
            </h1>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400">
            Tổng quan điểm danh, lớp học và hoạt động hệ thống.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAll}>
            <RefreshCw size={14} className="mr-1.5" />
            Làm mới
          </Button>
          <Badge
            variant="outline"
            className="flex items-center gap-1.5 px-3 py-1.5"
          >
            <Shield size={14} className="text-amber-500" />
            <span className="text-xs font-semibold">
              {user?.role === "supervisor" ? "Supervisor" : "Administrator"}
            </span>
          </Badge>
        </div>
      </motion.header>

      {/* Overview cards */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
        {overview.loading
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          : overview.error
            ? (
                <div className="col-span-full">
                  <Card>
                    <CardContent className="p-6">
                      <SectionError
                        message={overview.error}
                        onRetry={loadOverview}
                      />
                    </CardContent>
                  </Card>
                </div>
              )
            : statCards.map((stat, i) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                            {stat.title}
                          </p>
                          <p className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-zinc-50">
                            {stat.value}
                          </p>
                          {"subtitle" in stat && stat.subtitle && (
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              {stat.subtitle}
                            </p>
                          )}
                        </div>
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-xl"
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

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {byClass.loading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Tỷ lệ điểm danh theo lớp</CardTitle>
              <CardDescription>Hôm nay — % học sinh có mặt</CardDescription>
            </CardHeader>
            <CardContent>
              {byClass.error ? (
                <SectionError message={byClass.error} onRetry={loadByClass} />
              ) : !byClass.data?.length ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  Chưa có dữ liệu lớp học.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={byClass.data}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                    <XAxis
                      dataKey="className"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value: number, _name, item) => [
                        `${value}% (${item.payload.present}/${item.payload.total})`,
                        "Tỷ lệ",
                      ]}
                    />
                    <Bar
                      dataKey="rate"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                      name="Tỷ lệ"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {trend.loading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Xu hướng điểm danh</CardTitle>
              <CardDescription>5 ngày làm việc gần nhất (T2–T6)</CardDescription>
            </CardHeader>
            <CardContent>
              {trend.error ? (
                <SectionError message={trend.error} onRetry={loadTrend} />
              ) : !trend.data?.length ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  Chưa có dữ liệu xu hướng.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={trend.data}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelFormatter={(_, payload) => {
                        const point = payload?.[0]?.payload as
                          | WeekdayTrendPoint
                          | undefined;
                        return point?.date ?? "";
                      }}
                      formatter={(value: number, _name, item) => [
                        `${value}% (${item.payload.present}/${item.payload.total})`,
                        "Tỷ lệ",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#6366f1" }}
                      name="Tỷ lệ"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Alerts & Activities */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <CardTitle>Vắng nhiều tuần này</CardTitle>
            </div>
            <CardDescription>Top 5 học sinh vắng mặt nhiều nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {absentAlerts.loading ? (
              <SectionSkeleton rows={5} />
            ) : absentAlerts.error ? (
              <SectionError
                message={absentAlerts.error}
                onRetry={loadAbsent}
              />
            ) : !absentAlerts.data?.length ? (
              <p className="py-6 text-center text-sm text-zinc-500">
                Không có học sinh vắng trong tuần này.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-3 md:hidden">
                  {absentAlerts.data.map((s) => (
                    <div
                      key={s.studentId}
                      className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                    >
                      <p className="font-medium">{s.studentName}</p>
                      <p className="text-sm text-zinc-500">{s.className}</p>
                      <Badge variant="secondary" className="mt-2">
                        {s.absentCount} buổi vắng
                      </Badge>
                    </div>
                  ))}
                </div>
                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Học sinh</TableHead>
                      <TableHead>Lớp</TableHead>
                      <TableHead className="text-right">Số buổi vắng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {absentAlerts.data.map((s) => (
                      <TableRow key={s.studentId}>
                        <TableCell className="font-medium">
                          {s.studentName}
                        </TableCell>
                        <TableCell>{s.className}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{s.absentCount}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <History size={18} className="text-indigo-500" />
                <CardTitle>Hoạt động gần đây</CardTitle>
              </div>
              <Link
                to="/admin/audit-logs"
                className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Xem tất cả
              </Link>
            </div>
            <CardDescription>5 nhật ký audit mới nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {auditLogs.loading ? (
              <SectionSkeleton rows={5} />
            ) : auditLogs.error ? (
              <SectionError message={auditLogs.error} onRetry={loadAudit} />
            ) : !auditLogs.data?.length ? (
              <p className="py-6 text-center text-sm text-zinc-500">
                Chưa có nhật ký hoạt động.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-3 md:hidden">
                  {auditLogs.data.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {AUDIT_ACTION_LABELS[log.action]}
                        </Badge>
                        <span className="text-xs text-zinc-500">
                          {AUDIT_ENTITY_LABELS[log.entity]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium">
                        {log.actorName ?? "—"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatAuditDateTime(log.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Người thực hiện</TableHead>
                      <TableHead>Hành động</TableHead>
                      <TableHead>Đối tượng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.data.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatAuditDateTime(log.createdAt)}
                        </TableCell>
                        <TableCell>{log.actorName ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {AUDIT_ACTION_LABELS[log.action]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-zinc-500">
                          {AUDIT_ENTITY_LABELS[log.entity]}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
