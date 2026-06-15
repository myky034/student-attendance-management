import { motion } from "motion/react";
import {
  GraduationCap,
  SettingsIcon,
  Shield,
  Users,
  BookA,
  Calendar,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { UserManagement } from "@/components/settings/UserManagement";

export function Settings() {
  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <SettingsIcon size={20} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Settings
            </h1>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400">
            Manage system settings, users roles, and permissions.
          </p>
        </div>
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 py-1.5 px-3"
        >
          <Shield size={14} className="text-purple-500" />
          <span className="text-xs font-semibold">Admin Panel</span>
        </Badge>
      </motion.header>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users size={16} />
            Users
          </TabsTrigger>
          <TabsTrigger value="grades" className="flex items-center gap-2">
            <GraduationCap size={16} />
            Grades
          </TabsTrigger>
          <TabsTrigger value="classes" className="flex items-center gap-2">
            <BookA size={16} />
            Classes
          </TabsTrigger>
          <TabsTrigger value="semesters" className="flex items-center gap-2">
            <Calendar size={16} />
            Semesters
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="grades" className="mt-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center">
            <GraduationCap
              size={48}
              className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4"
            />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Grades Management
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400">
              Grade management features will be available soon
            </p>
          </div>
        </TabsContent>

        <TabsContent value="classes" className="mt-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center">
            <BookA
              size={48}
              className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4"
            />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Classes Management
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400">
              Class management features will be available soon
            </p>
          </div>
        </TabsContent>

        <TabsContent value="semesters" className="mt-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center">
            <Calendar
              size={48}
              className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4"
            />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Semesters Management
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400">
              Semester management features will be available soon
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
