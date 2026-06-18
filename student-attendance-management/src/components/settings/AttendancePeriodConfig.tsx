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
  saveAttendancePeriodConfig,
  deleteAttendancePeriodConfig,
  toggleAttendancePeriodConfigStatus,
} from "@/lib/api/attendanceperiodconfig";
import {
  getSemesterGreaterThanCurrent,
  type Semester,
} from "@/lib/api/semester";
import { getAcademicYears, type AcademicYear } from "@/lib/api/academicyear";
import { motion } from "motion/react";
import { Label } from "@radix-ui/react-label";
import { toast } from "sonner";
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
} as const;

const PERIOD_TYPE_DB = {
  SUNDAY: "sunday",
  REGULAR: "regular",
} as const;

function toDbPeriodType(uiValue: string): string {
  return uiValue === PERIOD_TYPE.SUNDAY
    ? PERIOD_TYPE_DB.SUNDAY
    : PERIOD_TYPE_DB.REGULAR;
}

function toUiPeriodType(dbValue: string): string {
  return dbValue === PERIOD_TYPE_DB.SUNDAY
    ? PERIOD_TYPE.SUNDAY
    : PERIOD_TYPE.REGULAR;
}

const currentDate = new Date();

function toDateOnly(value: string): string {
  return value.split("T")[0];
}

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
    type: PERIOD_TYPE_DB.SUNDAY,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({
    name: "",
    startDate: "",
    endDate: "",
    semesterId: "",
    type: "",
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

  const handleSelectAttendancePeriodConfig = (uiValue: string) => {
    setFormData((prev) => ({
      ...prev,
      type: toDbPeriodType(uiValue),
    }));
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsEditMode(false);
    setFormData({
      id: "",
      name: "",
      startDate: "",
      endDate: "",
      semesterId: "",
      type: PERIOD_TYPE_DB.SUNDAY,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setErrors({
      name: "",
      startDate: "",
      endDate: "",
      semesterId: "",
      type: "",
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

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name) {
      errors.name = "Name is required";
    }
    if (!formData.startDate) {
      errors.startDate = "Start date is required";
    }
    if (!formData.endDate) {
      errors.endDate = "End date is required";
    }
    if (formData.startDate >= formData.endDate) {
      errors.startDate = "Start date must be before end date";
    }
    if (!formData.semesterId) {
      errors.semesterId = "Semester is required";
    }
    if (!formData.type) {
      errors.type = "Type is required";
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors = validateForm();
    setErrors(newErrors);
    if (!Object.values(newErrors).every((error) => error === "")) {
      return;
    }
    try {
      await saveAttendancePeriodConfig({
        ...(isEditMode && formData.id ? { id: formData.id } : {}),
        name: formData.name.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        semesterId: formData.semesterId,
        type: formData.type,
        isActive: formData.isActive,
      });
      await loadAttendancePeriodConfigs();
      toast.success("Attendance period config saved successfully");
      handleClose();
    } catch (error) {
      console.error("Failed to save attendance period config:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save attendance period config",
      );
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (attendancePeriodConfig: AttendancePeriodConfig) => {
    handleOpen();
    setIsEditMode(true);
    setFormData(attendancePeriodConfig);
  };

  const handleDelete = async (
    attendancePeriodConfig: AttendancePeriodConfig,
  ) => {
    try {
      await deleteAttendancePeriodConfig(attendancePeriodConfig.id);
      await loadAttendancePeriodConfigs();
      toast.success("Attendance period config deleted successfully");
    } catch (error) {
      console.error("Failed to delete attendance period config:", error);
    }
    toast.error("Failed to delete attendance period config");
  };

  const handleToggleStatus = async (
    attendancePeriodConfig: AttendancePeriodConfig,
  ) => {
    try {
      await toggleAttendancePeriodConfigStatus(attendancePeriodConfig);
      await loadAttendancePeriodConfigs();
      toast.success("Attendance period config status toggled successfully");
    } catch (error) {
      console.error("Failed to toggle attendance period config status:", error);
      toast.error("Failed to toggle attendance period config status");
    }
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
                    <form className="space-y-6 w-full" onSubmit={handleSubmit}>
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
                          {errors.name && (
                            <p className="text-red-500 text-sm">
                              {errors.name}
                            </p>
                          )}
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
                          {errors.startDate && (
                            <p className="text-red-500 text-sm">
                              {errors.startDate}
                            </p>
                          )}
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
                          {errors.endDate && (
                            <p className="text-red-500 text-sm">
                              {errors.endDate}
                            </p>
                          )}
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
                          {errors.semesterId && (
                            <p className="text-red-500 text-sm">
                              {errors.semesterId}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="type">Type</Label>
                          <Select
                            value={toUiPeriodType(formData.type)}
                            onValueChange={handleSelectAttendancePeriodConfig}
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
                        <TableCell>
                          {toUiPeriodType(attendancePeriodConfig.type)}
                        </TableCell>
                        <TableCell>
                          {attendancePeriodConfig.isActive ? (
                            <Badge variant="success" className="w-fit">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="danger" className="w-fit">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {toDateOnly(attendancePeriodConfig.createdAt)}
                        </TableCell>
                        <TableCell>
                          {toDateOnly(attendancePeriodConfig.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(attendancePeriodConfig)}
                          >
                            <Edit size={16} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger>
                              <Button variant="ghost" size="icon">
                                <Trash size={16} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Attendance Period Config
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this
                                  attendance period config?
                                  <br />
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDelete(attendancePeriodConfig)
                                  }
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <AlertDialog>
                            <AlertDialogTrigger>
                              <Button variant="ghost" size="icon">
                                {attendancePeriodConfig.isActive ? (
                                  <PowerOff size={16} />
                                ) : (
                                  <Power size={16} />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Toggle Attendance Period Config Status
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to toggle the status of
                                  this attendance period config?
                                  <br />
                                  {attendancePeriodConfig.isActive
                                    ? "This will deactivate the attendance period config."
                                    : "This will activate the attendance period config."}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleToggleStatus(attendancePeriodConfig)
                                  }
                                >
                                  {attendancePeriodConfig.isActive
                                    ? "Deactivate"
                                    : "Activate"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
