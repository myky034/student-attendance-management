import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock1,
  Edit,
  Loader2,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash,
} from "lucide-react";
import { Collapse, Box } from "@mui/material";
import { Label } from "@/components/ui/lable";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import {
  type Semester,
  getSemesters,
  saveSemester,
  deleteSemester,
  toggleSemesterStatus,
} from "@/lib/api/semester";
import { getAcademicYears, type AcademicYear } from "@/lib/api/academicyear";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "sonner";

const MotionBox = motion.create(Box);

const ITEMS_PER_PAGE = 10;

function toDateOnly(value: string): string {
  return value.split("T")[0];
}

function matchesSemesterFilters(
  semester: Semester,
  searchName: string,
  searchStartDate: string,
  searchEndDate: string,
  searchAcademicYearId: string,
): boolean {
  const query = searchName.trim().toLowerCase();
  if (query) {
    const matchesName = semester.name.toLowerCase().includes(query);
    const matchesCode = semester.code.toLowerCase().includes(query);
    if (!matchesName && !matchesCode) return false;
  }

  const semStart = toDateOnly(semester.startDate);
  const semEnd = toDateOnly(semester.endDate);

  if (searchStartDate && semStart < searchStartDate) return false;
  if (searchEndDate && semEnd > searchEndDate) return false;

  if (
    searchAcademicYearId &&
    searchAcademicYearId !== "all" &&
    semester.academicYearId !== searchAcademicYearId
  ) {
    return false;
  }

  return true;
}

export function Semester() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Semester>({
    id: "",
    name: "",
    code: "",
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    sortOrder: 0,
    isActive: true,
    academicYearId: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({
    name: "",
    code: "",
    startDate: "",
    endDate: "",
    sortOrder: "",
    academicYearId: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchName, setSearchName] = useState("");
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");
  const [searchAcademicYearId, setSearchAcademicYearId] = useState("all");

  const showForm = isOpen;

  const filteredSemesters = useMemo(() => {
    if (
      searchStartDate &&
      searchEndDate &&
      searchStartDate > searchEndDate
    ) {
      return [];
    }

    return semesters.filter((semester) =>
      matchesSemesterFilters(
        semester,
        searchName,
        searchStartDate,
        searchEndDate,
        searchAcademicYearId,
      ),
    );
  }, [
      semesters,
      searchName,
      searchStartDate,
      searchEndDate,
      searchAcademicYearId,
    ],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSemesters.length / ITEMS_PER_PAGE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedSemesters = filteredSemesters.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE,
  );

  const handleSearchChange = (value: string) => {
    setSearchName(value);
    setCurrentPage(1);
  };

  const handleSearchStartDateChange = (value: string) => {
    setSearchStartDate(value);
    setCurrentPage(1);
  };

  const handleSearchEndDateChange = (value: string) => {
    setSearchEndDate(value);
    setCurrentPage(1);
  };

  const handleSearchAcademicYearChange = (value: string) => {
    setSearchAcademicYearId(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchName("");
    setSearchStartDate("");
    setSearchEndDate("");
    setSearchAcademicYearId("all");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchName.trim() !== "" ||
    searchStartDate !== "" ||
    searchEndDate !== "" ||
    searchAcademicYearId !== "all";

  const loadSemesters = async () => {
    setIsLoading(true);
    try {
      const data = await getSemesters();
      const academicYears = await getAcademicYears();
      setSemesters(data);
      setAcademicYears(academicYears);
    } catch (error) {
      console.error("Failed to load semesters:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchSemesters = async () => {
      await loadSemesters();
    };
    fetchSemesters();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }
    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    }
    if (
      formData.startDate &&
      formData.endDate &&
      new Date(formData.startDate) > new Date(formData.endDate)
    ) {
      newErrors.endDate = "End date must be after start date";
    }
    if (!formData.academicYearId) {
      newErrors.academicYearId = "Academic year is required";
    }
    return newErrors;
  };

  const handleOpen = () => {
    setFormData({
      id: "",
      name: "",
      code: "",
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      sortOrder: 0,
      isActive: true,
      academicYearId: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setErrors({
      name: "",
      code: "",
      startDate: "",
      endDate: "",
      sortOrder: "",
      academicYearId: "",
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEdit = (semester: Semester) => {
    setFormData(semester);
    setIsEditMode(true);
    setIsOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors = validateForm();
    setErrors(newErrors);
    if (!Object.values(newErrors).every((error) => error === "")) {
      return;
    }
    try {
      await saveSemester({
        ...(isEditMode && formData.id ? { id: formData.id } : {}),
        name: formData.name.trim(),
        code: formData.code.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
        academicYearId: formData.academicYearId,
      });
      toast.success("Semester saved successfully");
      handleClose();
      await loadSemesters();
    } catch (error) {
      console.error("Failed to save semester:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save semester",
      );
    }
  };

  const handleDelete = async (semesterId: string) => {
    try {
      await deleteSemester(semesterId);
      toast.success("Semester deleted successfully");
      await loadSemesters();
    } catch (error) {
      console.error("Failed to delete semester:", error);
    }
  };

  const handleToggleStatus = async (semester: Semester) => {
    try {
      await toggleSemesterStatus(semester);
      toast.success("Semester status toggled successfully");
      await loadSemesters();
    } catch (error) {
      console.error("Failed to toggle semester status:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to toggle semester status",
      );
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
                    <CardTitle>Semesters</CardTitle>
                    <CardDescription>Manage semesters.</CardDescription>
                  </div>
                  <div>
                    <Button onClick={handleOpen}>
                      <Plus size={16} className="mr-2" />
                      Add Semester
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
                      {isEditMode ? "Edit Semester" : "Create New Semester"}
                    </CardTitle>
                    <CardDescription>
                      {isEditMode
                        ? "Update semester information"
                        : "Create a new semester"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 pt-0">
                    <div className="space-y-6">
                      <form
                        className="space-y-6 w-full"
                        onSubmit={handleSubmit}
                      >
                        <div className="space-y-2">
                          <Label htmlFor="name">Semester Name</Label>
                          <Input
                            type="text"
                            placeholder="Semester Name"
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
                          <Label htmlFor="code">Semester Code</Label>
                          <Input
                            type="text"
                            placeholder="Semester Code"
                            name="code"
                            value={formData?.code || ""}
                            onChange={handleChange}
                          />
                          {errors.code && (
                            <p className="text-red-500 text-sm">
                              {errors.code}
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
                        <div className="space-y-2">
                          <Label htmlFor="academicYearId">Academic Year</Label>
                          <Select
                            name="academicYearId"
                            value={formData?.academicYearId || ""}
                            onValueChange={(value) =>
                              setFormData({
                                ...formData,
                                academicYearId: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Academic Year" />
                            </SelectTrigger>
                            <SelectContent>
                              {academicYears.map((academicYear) => (
                                <SelectItem
                                  key={academicYear.id}
                                  value={academicYear.id}
                                >
                                  {academicYear.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.academicYearId && (
                            <p className="text-red-500 text-sm">
                              {errors.academicYearId}
                            </p>
                          )}
                        </div>
                        {isEditMode && (
                          <div className="space-y-2">
                            <Label htmlFor="isActive">Active</Label>
                            <Switch
                              id="isActive"
                              checked={formData?.isActive}
                              onChange={(
                                e: React.ChangeEvent<
                                  HTMLInputElement | HTMLButtonElement
                                >,
                              ) =>
                                setFormData({
                                  ...formData,
                                  isActive: (e.target as HTMLInputElement)
                                    .checked,
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
            <div className="flex flex-wrap items-end justify-start gap-4 mb-4">
              <div className="relative max-w-sm w-full space-y-2">
                <Label htmlFor="searchName">Search</Label>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <Input
                    id="searchName"
                    type="search"
                    placeholder="Search by name, code"
                    value={searchName}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filterStartDate">Start Date</Label>
                <Input
                  id="filterStartDate"
                  type="date"
                  value={searchStartDate}
                  onChange={(e) => handleSearchStartDateChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filterEndDate">End Date</Label>
                <Input
                  id="filterEndDate"
                  type="date"
                  value={searchEndDate}
                  onChange={(e) => handleSearchEndDateChange(e.target.value)}
                />
              </div>
              <div className="space-y-2 min-w-[180px]">
                <Label htmlFor="filterAcademicYearId">Academic Year</Label>
                <Select
                  value={searchAcademicYearId}
                  onValueChange={handleSearchAcademicYearChange}
                >
                  <SelectTrigger id="filterAcademicYearId">
                    <SelectValue placeholder="Select Academic Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {academicYears.map((academicYear) => (
                      <SelectItem key={academicYear.id} value={academicYear.id}>
                        {academicYear.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearFilters}
                >
                  Clear filters
                </Button>
              )}
            </div>
            {searchStartDate &&
              searchEndDate &&
              searchStartDate > searchEndDate && (
                <p className="mb-4 text-sm text-red-500">
                  Filter start date must be before or equal to end date.
                </p>
              )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-4">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                        <span className="text-zinc-500">Loading...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredSemesters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <p className="text-zinc-500">
                        {hasActiveFilters
                          ? "No semesters match your search or filters."
                          : "No semesters found."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSemesters.map((semester, index) => (
                    <TableRow key={semester.id}>
                      <TableCell>
                        {(safeCurrentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </TableCell>
                      <TableCell>{semester.name}</TableCell>
                      <TableCell>{semester.code}</TableCell>
                      <TableCell>{semester.startDate}</TableCell>
                      <TableCell>{semester.endDate}</TableCell>
                      <TableCell>
                        {
                          academicYears.find(
                            (academicYear) =>
                              academicYear.id === semester.academicYearId,
                          )?.name
                        }
                      </TableCell>
                      <TableCell>
                        {semester.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="danger">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(semester.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(semester.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(semester)}
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
                                Delete Semester
                              </AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogDescription>
                              Are you sure you want to delete this semester?
                            </AlertDialogDescription>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(semester.id)}
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
                              {semester.isActive ? (
                                <PowerOff size={16} />
                              ) : (
                                <Power size={16} />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Toggle Semester Status
                              </AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogDescription>
                              Are you sure you want to toggle the status of this
                              semester?
                            </AlertDialogDescription>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleToggleStatus(semester)}
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
          <CardFooter>
            <div className="flex flex-col items-center gap-2 w-full">
              <p className="text-sm text-zinc-500">
                Showing {filteredSemesters.length === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}
                –
                {Math.min(
                  safeCurrentPage * ITEMS_PER_PAGE,
                  filteredSemesters.length,
                )}{" "}
                of {filteredSemesters.length} semesters
              </p>
              <Pagination
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </CardFooter>
        </Card>
      </MotionBox>
    </div>
  );
}
