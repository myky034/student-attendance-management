import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Box, Collapse } from "@mui/material";
import {
  Clock1,
  Edit,
  Loader2,
  Plus,
  Power,
  PowerOff,
  Trash,
  CalendarClock,
} from "lucide-react";
import {
  type AttendancePeriodConfig,
  getAttendancePeriodConfigs,
  getAttendancePeriodConfigById,
} from "@/lib/api/attendanceperiodconfig";
import {
  getSemesters,
  getSemesterGreaterThanCurrent,
  type Semester,
} from "@/lib/api/semester";
import { getAcademicYears, type AcademicYear } from "@/lib/api/academicyear";
import { motion } from "motion/react";
import { Label } from "@radix-ui/react-label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

const MotionBox = motion.create(Box);

const PERIOD_TYPE = {
  SUNDAY: "Sunday",
  REGULAR: "Regular",
};

const currentDate = new Date();

export function AttendancePeriodConfig() {
  const [attendancePeriodConfigs, setAttendancePeriodConfigs] = useState<
    AttendancePeriodConfig[]
  >([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<AttendancePeriodConfig>({
    id: "",
    name: "",
    startDate: "",
    endDate: "",
    semesterId: "",
    type: PERIOD_TYPE.SUNDAY,
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({
    name: "",
    startDate: "",
    endDate: "",
    semesterId: "",
    type: PERIOD_TYPE.SUNDAY,
    isActive: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const showForm = isOpen;

  const loadAttendancePeriodConfigs = async () => {
    setIsLoading(true);
    try {
      const data = await getAttendancePeriodConfigs();
      setAttendancePeriodConfigs(data);
      const semesters = await getSemesterGreaterThanCurrent(currentDate);
      setSemesters(semesters);
      const academicYears = await getAcademicYears();
      setAcademicYears(academicYears);
    } catch (error) {
      console.error("Failed to load attendance period configs:", error);
      toast.error("Failed to load attendance period configs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchAttendancePeriodConfigs = async () => {
      await loadAttendancePeriodConfigs();
    };
    fetchAttendancePeriodConfigs();
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setIsEditMode(false);
    setFormData({
      id: "",
      name: "",
      startDate: "",
      endDate: "",
      semesterId: "",
      type: PERIOD_TYPE.SUNDAY,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setErrors({
      name: "",
      startDate: "",
      endDate: "",
      semesterId: "",
      type: PERIOD_TYPE.SUNDAY,
      isActive: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsLoading(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsEditMode(false);
  };

  //   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  //     e.preventDefault();
  //     try {
  //       await saveAttendancePeriodConfig(formData);
  //       toast.success("Attendance period config saved successfully");
  //       handleClose();
  //       loadAttendancePeriodConfigs();
  //     } catch (error) {
  //       console.error("Failed to save attendance period config:", error);
  //       toast.error("Failed to save attendance period config");
  //     }
  //   };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      <MotionBox
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              {!showForm && (
                <>
                  <div>
                    <CardTitle>Attendance Period Config</CardTitle>
                    <CardDescription>
                      Manage attendance period configurations.
                    </CardDescription>
                  </div>
                  <div>
                    <Button onClick={handleOpen}>
                      <Plus size={16} className="mr-2" />
                      Add Attendance Period Config
                    </Button>
                  </div>
                </>
              )}
            </div>
            <Collapse in={showForm} unmountOnExit>
              <MotionBox
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="border-none shadow-none">
                  <CardHeader className="px-0 pb-0 pt-0">
                    <CardTitle className="flex items-center gap-2">
                      <CalendarClock size={24} />
                      {isEditMode
                        ? "Edit Attendance Period Config"
                        : "Add Attendance Period Config"}
                    </CardTitle>
                    <CardDescription>
                      {isEditMode
                        ? "Update attendance period configuration"
                        : "Add a new attendance period configuration"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 pt-0">
                    <form
                      className="space-y-6 w-full"
                      //onSubmit={handleSubmit}
                    >
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Attendance Period Name</Label>
                          <Input
                            type="text"
                            id="name"
                            name="name"
                            placeholder="Attendance Period Name"
                            value={formData.name}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="startDate">Start Date</Label>
                          <Input
                            type="date"
                            id="startDate"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endDate">End Date</Label>
                          <Input
                            type="date"
                            id="endDate"
                            name="endDate"
                            value={formData.endDate}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="semesterId">Semester</Label>
                          <Select
                            value={formData.semesterId}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                semesterId: value,
                              }))
                            }
                          >
                            <SelectTrigger id="semesterId">
                              <SelectValue placeholder="Select a semester" />
                            </SelectTrigger>
                            <SelectContent>
                              {semesters.map((semester) => (
                                <SelectItem
                                  key={semester.id}
                                  value={semester.id}
                                >
                                  {semester.name} -{" "}
                                  {
                                    academicYears.find(
                                      (academicYear) =>
                                        academicYear.id ===
                                        semester.academicYearId,
                                    )?.name
                                  }
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="type">Type</Label>
                          <Select
                            value={formData.type}
                            onValueChange={(value) =>
                              setFormData((prev) => ({ ...prev, type: value }))
                            }
                          >
                            <SelectTrigger id="type">
                              <SelectValue placeholder="Select a type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={PERIOD_TYPE.SUNDAY}>
                                {PERIOD_TYPE.SUNDAY}
                              </SelectItem>
                              <SelectItem value={PERIOD_TYPE.REGULAR}>
                                {PERIOD_TYPE.REGULAR}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {isEditMode && (
                          <div className="space-y-2 flex items-center gap-2">
                            <Label htmlFor="isActive">Status</Label>
                            <Switch
                              id="isActive"
                              name="isActive"
                              checked={formData.isActive}
                              onCheckedChange={(checked) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  isActive: checked,
                                }))
                              }
                            ></Switch>
                          </div>
                        )}
                        <div className="flex items-center gap-2 justify-end">
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </MotionBox>
            </Collapse>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      <div className="flex justify-center items-center">
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                      </div>
                      <span className="text-zinc-500">Loading...</span>
                    </TableCell>
                  </TableRow>
                ) : attendancePeriodConfigs.length > 0 ? (
                  attendancePeriodConfigs.map(
                    (attendancePeriodConfig, index) => (
                      <TableRow key={attendancePeriodConfig.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{attendancePeriodConfig.name}</TableCell>
                        <TableCell>
                          {attendancePeriodConfig.startDate}
                        </TableCell>
                        <TableCell>{attendancePeriodConfig.endDate}</TableCell>
                        <TableCell>
                          {
                            semesters.find(
                              (semester) =>
                                semester.id ===
                                attendancePeriodConfig.semesterId,
                            )?.name
                          }
                        </TableCell>
                        <TableCell>{attendancePeriodConfig.type}</TableCell>
                        <TableCell>
                          {attendancePeriodConfig.isActive
                            ? "Active"
                            : "Inactive"}
                        </TableCell>
                        <TableCell>
                          {attendancePeriodConfig.createdAt}
                        </TableCell>
                        <TableCell>
                          {attendancePeriodConfig.updatedAt}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="icon">
                            <Edit size={16} />
                          </Button>
                          <Button variant="outline" size="icon">
                            <Trash size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ),
                  )
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4 h-24">
                      <p className="text-center text-sm text-gray-500">
                        No attendance period configs found.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </MotionBox>
    </div>
  );
}
