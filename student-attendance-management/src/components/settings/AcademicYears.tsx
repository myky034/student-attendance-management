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
import { Box, Collapse, Switch } from "@mui/material";
import {
  Clock1,
  Edit,
  Loader2,
  Plus,
  Power,
  PowerOff,
  Trash,
} from "lucide-react";
import {
  type AcademicYear,
  getAcademicYears,
  saveAcademicYear,
  deleteAcademicYear,
  toggleAcademicYearStatus,
} from "@/lib/api/academicyear";
import { motion } from "motion/react";
import { Label } from "@radix-ui/react-label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
const MotionBox = motion.create(Box);

export function AcademicYears() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<AcademicYear>({
    id: "",
    name: "",
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({
    name: "",
    startDate: "",
    endDate: "",
  });

  const loadAcademicYears = async () => {
    setIsLoading(true);
    try {
      const data = await getAcademicYears();
      setAcademicYears(data);
    } catch (error) {
      console.error("Failed to load academic years:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchAcademicYears = async () => {
      await loadAcademicYears();
    };
    fetchAcademicYears();
  }, []);

  const handleOpen = () => {
    setFormData({
      id: "",
      name: "",
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setErrors({
      name: "",
      startDate: "",
      endDate: "",
    });
    setIsEditMode(false);
    setIsOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsEditMode(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEdit = (academicYear: AcademicYear) => {
    setFormData(academicYear);
    console.log(academicYear.id);
    setIsEditMode(true);
    setIsOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (academicYearId: string) => {
    try {
      await deleteAcademicYear(academicYearId);
      toast.success("Academic year deleted successfully");
      await loadAcademicYears();
    } catch (error) {
      console.error("Failed to delete academic year:", error);
      toast.error("Failed to delete academic year");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (academicYear: AcademicYear) => {
    setIsLoading(true);
    await toggleAcademicYearStatus(academicYear);
    await loadAcademicYears();
    setIsLoading(false);
  };

  const showForm = isOpen;

  const validateForm = () => {
    const newErrors = {
      name: "",
      startDate: "",
      endDate: "",
    };
    if (!formData?.name) {
      newErrors.name = "Academic year name is required";
    }
    if (!formData?.startDate) {
      newErrors.startDate = "Start date is required";
    }
    if (!formData?.endDate) {
      newErrors.endDate = "End date is required";
    }
    if (
      formData?.startDate &&
      formData?.endDate &&
      new Date(formData?.startDate) > new Date(formData?.endDate)
    ) {
      newErrors.endDate = "End date must be after start date";
    }
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors = validateForm();
    setErrors(newErrors);
    if (!Object.values(newErrors).every((error) => error === "")) {
      return;
    }
    try {
      await saveAcademicYear({
        ...(isEditMode && formData.id ? { id: formData.id } : {}),
        name: formData.name.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        isActive: formData.isActive,
      });
      await loadAcademicYears();
      toast.success("Academic year saved successfully");
      handleClose();
    } catch (error) {
      console.error("Failed to save academic year:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save academic year",
      );
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
                    <CardTitle>Academic Years</CardTitle>
                    <CardDescription>Manage academic years.</CardDescription>
                  </div>
                  <div>
                    <Button onClick={handleOpen}>
                      <Plus size={16} className="mr-2" />
                      Add Academic Year
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
                      <Clock1 size={24} />
                      {isEditMode
                        ? "Edit Academic Year"
                        : "Create New Academic Year"}
                    </CardTitle>
                    <CardDescription>
                      {isEditMode
                        ? "Update academic year information"
                        : "Create a new academic year"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 pt-0">
                    <div className="space-y-6">
                      <form
                        className="space-y-6 w-full"
                        onSubmit={handleSubmit}
                      >
                        <div className="space-y-2">
                          <Label htmlFor="name">Academic Year Name</Label>
                          <Input
                            type="text"
                            placeholder="Academic Year Name"
                            name="name"
                            value={formData?.name || ""}
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
                            placeholder="Start Date"
                            name="startDate"
                            value={
                              new Date(formData?.startDate || "")
                                .toISOString()
                                .split("T")[0]
                            }
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
                            placeholder="End Date"
                            name="endDate"
                            value={
                              new Date(formData?.endDate || "")
                                .toISOString()
                                .split("T")[0]
                            }
                            onChange={handleChange}
                          />
                          {errors.endDate && (
                            <p className="text-red-500 text-sm">
                              {errors.endDate}
                            </p>
                          )}
                        </div>
                        {isEditMode && (
                          <div className="space-y-2">
                            <Label htmlFor="isActive">Active</Label>
                            <Switch
                              id="isActive"
                              checked={formData?.isActive}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  isActive: e.target.checked,
                                })
                              }
                            />
                          </div>
                        )}
                        <div className="space-y-2 flex justify-end gap-2">
                          <Button type="submit" variant="default">
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </div>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      <div className="flex justify-center items-center">
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                      </div>
                      <span className="text-zinc-500">Loading...</span>
                    </TableCell>
                  </TableRow>
                ) : (
                  academicYears.map((academicYear, index) => (
                    <TableRow key={academicYear.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{academicYear.name}</TableCell>
                      <TableCell>{academicYear.startDate}</TableCell>
                      <TableCell>{academicYear.endDate}</TableCell>
                      <TableCell>
                        {academicYear.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="danger">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(academicYear.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(academicYear.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(academicYear)}
                        >
                          <Edit size={16} />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash size={16} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Academic Year
                              </AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogDescription>
                              Are you sure you want to delete this academic
                              year?
                            </AlertDialogDescription>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(academicYear.id)}
                                className="bg-red-500 hover:bg-red-600 text-white"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              {academicYear.isActive ? (
                                <PowerOff size={16} />
                              ) : (
                                <Power size={16} />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Toggle Academic Year Status
                              </AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogDescription>
                              Are you sure you want to toggle the status of this
                              academic year?
                            </AlertDialogDescription>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleToggleStatus(academicYear)}
                                disabled={isLoading}
                                className={cn(
                                  "bg-blue-500 hover:bg-blue-600 text-white",
                                  isLoading && "opacity-50 cursor-not-allowed",
                                )}
                              >
                                {isLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                                ) : (
                                  "Toggle"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </MotionBox>
    </div>
  );
}
