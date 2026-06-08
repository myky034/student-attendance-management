import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { User, Trash2, Crown, Shield } from "lucide-react";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "../components/ui/table";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../components/ui/alert-dialog";
import { Users, UserCheck, UserX, TrendingUp } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAppContext } from "../context/useAppContext";
import { initialStudents } from "../data/mockData";

export function AdminDashboard() {
  const [students] = useState(initialStudents);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const totalStudents = students.length;
    const presentToday = students.filter((s) =>
      (s.attendanceRecords ?? []).some(
        (r) => r.date === today && r.status === "present",
      ),
    ).length;
    const absentToday = totalStudents - presentToday;

    const totalRecords = students.reduce(
      (acc, s) => acc + (s.attendanceRecords ?? []).length,
      0,
    );
    const presentRecords = students.reduce(
      (acc, s) =>
        acc +
        (s.attendanceRecords ?? []).filter((r) => r.status === "present")
          .length,
      0,
    );
    const attendanceRate =
      totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;

    return {
      totalStudents,
      presentToday,
      absentToday,
      attendanceRate,
    };
  }, [students]);

  const { getAllUsers } = useAppContext();

  const users = getAllUsers();

  const statCards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      gradient: "linear-gradient(135deg, #a8c0ff 0%, #c2e9fb 100%)",
      color: "#6b8cce",
      icon: Users,
    },
    {
      title: "Present Today",
      value: stats.presentToday,
      gradient: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
      color: "#4ecdc4",
      icon: UserCheck,
    },
    {
      title: "Absent Today",
      value: stats.absentToday,
      gradient: "linear-gradient(135deg, #ffa8b5 0%, #ffd3a5 100%)",
      color: "#ff6b9d",
      icon: UserX,
    },
    {
      title: "Attendance Rate",
      value: `${stats.attendanceRate.toFixed(1)}%`,
      gradient: "linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)",
      color: "#fdcb6e",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <Crown size={20} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400">
            Manage users, flashcard sets, and monitor platform activity.
          </p>
        </div>
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 py-1.5 px-3"
        >
          <Shield size={14} className="text-amber-500" />
          <span className="text-xs font-semibold">Administrator</span>
        </Badge>
      </motion.header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}
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

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="sets">Students</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage all registered users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.email}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            <User
                              size={16}
                              className="text-zinc-500 dark:text-zinc-400"
                            />
                          </div>
                          {u.name}
                        </div>
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={u.role === "admin" ? "default" : "secondary"}
                        >
                          {u.role === "admin" ? (
                            <div className="flex items-center gap-1">
                              <Crown size={12} />
                              <span>Admin</span>
                            </div>
                          ) : (
                            "User"
                          )}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sets" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Students Management</CardTitle>
              <CardDescription>
                View and manage all students on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.class.name}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                              // onClick={() => setDeletingSetId(set.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Student?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{student.name}
                                "? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                              //onClick={() => setDeletingSetId(null)}
                              >
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                // onClick={() => handleDeleteSet(set.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
