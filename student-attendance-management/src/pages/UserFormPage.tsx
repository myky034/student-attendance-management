import { useEffect, useMemo, useState } from "react";

import { Link, useNavigate, useParams, useSearchParams, useLocation } from "react-router";

import { ArrowLeft, RefreshCw } from "lucide-react";

import { Button } from "../components/ui/button";

import { Paper, Box, Typography } from "@mui/material";

import { Input } from "../components/ui/input";

import { QRCodeSVG } from "qrcode.react";

import { toast } from "sonner";

import { Label } from "../components/ui/lable";

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from "../components/ui/select";

import {

  getStudentById,

  saveStudent,

  type StudentRecord,

} from "../lib/api/students";

import { getClasses, type ClassOption } from "@/lib/api/classes";

import { getGrades, type GradeOption } from "@/lib/api/grades";

import { useAppContext } from "../context/useAppContext";

import { useAuditContext } from "@/hooks/useAuditContext";

import { Switch } from "../components/ui/switch";

import { generateQRCode } from "../lib/importStudents";
import { cn } from "@/lib/utils";

type UserFormLocationState = {
  prefetchedGrades?: GradeOption[];
  prefetchedClasses?: ClassOption[];
};

function hasPrefetchedOptions(
  state: UserFormLocationState | null | undefined,
): state is UserFormLocationState & {
  prefetchedGrades: GradeOption[];
  prefetchedClasses: ClassOption[];
} {
  return Boolean(
    state?.prefetchedGrades?.length && state?.prefetchedClasses?.length,
  );
}

function SelectFieldSkeleton() {
  return (
    <div className="h-11 w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
  );
}



export const UserFormPage = () => {

  const navigate = useNavigate();

  const { userId } = useParams();

  const [searchParams] = useSearchParams();

  const location = useLocation();

  const { user } = useAppContext();

  const audit = useAuditContext();

  const isEditMode = Boolean(userId);

  const isAdminOrSupervisor =

    user?.role === "admin" || user?.role === "supervisor";

  const returnTo =
    searchParams.get("returnTo") ??
    (location.pathname.startsWith("/admin") ? "/admin/students" : "/dashboard");

  const prefetchedOptions = hasPrefetchedOptions(
    location.state as UserFormLocationState | null,
  )
    ? (location.state as UserFormLocationState)
    : null;



  const [existingStudent, setExistingStudent] = useState<StudentRecord | null>(

    null,

  );

  const [loading, setLoading] = useState(isEditMode);

  const [submitting, setSubmitting] = useState(false);

  const [grades, setGrades] = useState<GradeOption[]>(
    () => prefetchedOptions?.prefetchedGrades ?? [],
  );

  const [classes, setClasses] = useState<ClassOption[]>(
    () => prefetchedOptions?.prefetchedClasses ?? [],
  );

  const [loadingOptions, setLoadingOptions] = useState(
    () => isAdminOrSupervisor && !prefetchedOptions,
  );

  const [selectedGradeId, setSelectedGradeId] = useState("");

  const [selectedClassId, setSelectedClassId] = useState("");

  const [formData, setFormData] = useState({

    name: "",

    holy_name: "",

    email: "",

    username: "",

    password: "",

    qrCode: generateQRCode(),

  });

  const [errors, setErrors] = useState({

    name: "",

    holy_name: "",

    email: "",

    username: "",

    classId: "",

    gradeId: "",

  });



  useEffect(() => {

    if (!isAdminOrSupervisor) return;



    if (prefetchedOptions) {

      setGrades(prefetchedOptions.prefetchedGrades ?? []);

      setClasses(prefetchedOptions.prefetchedClasses ?? []);

      setLoadingOptions(false);

      return;

    }



    let cancelled = false;

    setLoadingOptions(true);



    Promise.all([getGrades(), getClasses()])

      .then(([gradeList, classList]) => {

        if (cancelled) return;

        setGrades(gradeList);

        setClasses(classList);

      })

      .catch((error) => {

        console.error(error);

        if (!cancelled) {

          toast.error("Failed to load grades and classes");

        }

      })

      .finally(() => {

        if (!cancelled) setLoadingOptions(false);

      });



    return () => {

      cancelled = true;

    };

  }, [isAdminOrSupervisor, prefetchedOptions]);



  useEffect(() => {

    if (!userId) return;



    let cancelled = false;



    getStudentById(userId)

      .then((student) => {

        if (cancelled) return;

        setExistingStudent(student);

        if (student) {

          setFormData({

            name: student.name,

            holy_name: student.holy_name ?? "",

            email: student.email,

            username: student.username,

            password: "",

            qrCode: student.qrCode,

          });

          if (isAdminOrSupervisor && student.class) {

            setSelectedClassId(student.classId ?? "");

            setSelectedGradeId(student.class.grade?.id ?? "");

          }

        }

      })

      .catch((error) => {

        console.error(error);

        if (!cancelled) toast.error("Failed to load student");

      })

      .finally(() => {

        if (!cancelled) setLoading(false);

      });



    return () => {

      cancelled = true;

    };

  }, [userId, isAdminOrSupervisor]);



  const classesForGrade = useMemo(() => {

    if (!selectedGradeId) return [];

    return classes.filter((item) => item.grade?.id === selectedGradeId);

  }, [classes, selectedGradeId]);



  const handleRefreshQRCode = (e: React.MouseEvent<HTMLButtonElement>) => {

    e.preventDefault();

    setFormData((prev) => ({ ...prev, qrCode: generateQRCode() }));

  };



  const handleChange =

    (key: keyof typeof formData) =>

    (e: React.ChangeEvent<HTMLInputElement>) => {

      setFormData((prev) => ({ ...prev, [key]: e.target.value }));

      setErrors((prev) => ({ ...prev, [key]: "" }));

    };



  const resolveClassId = (): string | null => {

    if (isAdminOrSupervisor) {

      return selectedClassId || null;

    }

    return user?.classId ?? null;

  };



  const validateForm = () => {

    const newErrors = {

      name: "",

      holy_name: "",

      email: "",

      username: "",

      classId: "",

      gradeId: "",

    };



    if (!formData.name.trim()) {

      newErrors.name = "Name is required";

    }

    if (!formData.holy_name.trim()) {

      newErrors.holy_name = "Holy Name is required";

    }

    if (!formData.email.trim()) {

      newErrors.email = "Email is required";

    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {

      newErrors.email = "Invalid email format";

    }



    if (isAdminOrSupervisor) {

      if (!selectedGradeId) {

        newErrors.gradeId = "Grade is required";

      }

      if (!selectedClassId) {

        newErrors.classId = "Class is required";

      }

    }



    return newErrors;

  };



  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {

    e.preventDefault();



    const classId = resolveClassId();

    if (!classId) {

      toast.error(

        isAdminOrSupervisor

          ? "Please select grade and class"

          : "Your account is not assigned to a class",

      );

      return;

    }



    const newErrors = validateForm();

    setErrors(newErrors);

    if (!Object.values(newErrors).every((error) => error === "")) {

      return;

    }



    setSubmitting(true);

    try {

      await saveStudent(

        {

          id: isEditMode ? userId : undefined,

          name: formData.name.trim(),

          holy_name: formData.holy_name.trim(),

          email: formData.email.trim(),

          username: formData.username.trim(),

          qrCode: formData.qrCode,

          classId,

          isActive: existingStudent?.isActive ?? true,

          isLocked: existingStudent?.isLocked ?? false,

        },

        audit ?? undefined,

      );



      toast.success(

        isEditMode && existingStudent

          ? "Student updated successfully"

          : "Student created successfully",

      );

      handleClose();

    } catch (error) {

      console.error(error);

      toast.error("Failed to save student");

    } finally {

      setSubmitting(false);

    }

  };



  const handleClose = () => {

    navigate(returnTo);

  };



  const handleGradeChange = (gradeId: string) => {

    setSelectedGradeId(gradeId);

    setSelectedClassId("");

    setErrors((prev) => ({ ...prev, gradeId: "", classId: "" }));

  };



  const handleClassChange = (classId: string) => {

    setSelectedClassId(classId);

    setErrors((prev) => ({ ...prev, classId: "" }));

  };



  if (loading) {

    return (

      <div className="space-y-6">

        <div className="flex items-center gap-4">

          <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />

          <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />

        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">

          <div className="space-y-4">

            <div className="h-40 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />

            <div className="h-11 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />

            <div className="h-11 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />

            <div className="h-11 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />

          </div>

        </div>

      </div>

    );

  }



  if (isEditMode && !existingStudent) {

    return (

      <div>

        <p className="text-sm text-red-500 mb-4">Student not found.</p>

        <Button variant="outline" onClick={handleClose}>

          Back

        </Button>

      </div>

    );

  }



  return (

    <div>

      <div className="flex items-center gap-4 mb-8">

        <Link

          to={returnTo}

          className="w-10 h-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors shadow-sm"

        >

          <ArrowLeft size={20} />

        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">

          {isEditMode ? "Edit Student" : "Create Student"}

        </h1>

      </div>



      <form onSubmit={handleSubmit}>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm">

          <div className="space-y-6">

            <Paper

              sx={{

                p: 3,

                mb: 3,

                borderRadius: 3,

                background: "linear-gradient(135deg, #fafbff 0%, #f0f4ff 100%)",

                border: "2px dashed #a8c0ff",

                textAlign: "center",

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

              <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>

                <Box

                  sx={{

                    p: 2,

                    bgcolor: "white",

                    borderRadius: 2,

                    boxShadow: "0 4px 20px rgba(168, 192, 255, 0.2)",

                  }}

                >

                  <QRCodeSVG value={formData.qrCode} size={150} />

                </Box>

              </Box>

              <Typography

                variant="caption"

                color="text.secondary"

                sx={{ display: "block", mb: 1 }}

              >

                Code: {formData.qrCode}

              </Typography>

              {!isEditMode && (

                <Button variant="default" onClick={handleRefreshQRCode}>

                  <RefreshCw size={16} />

                  <span>Refresh QR Code</span>

                </Button>

              )}

            </Paper>



            {isAdminOrSupervisor && (

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div className="space-y-2">

                  <Label htmlFor="grade">Grade</Label>

                  {loadingOptions ? (

                    <SelectFieldSkeleton />

                  ) : (

                    <Select value={selectedGradeId} onValueChange={handleGradeChange}>

                      <SelectTrigger

                        id="grade"

                        className={cn(errors.gradeId ? "border-red-500" : "", "w-full min-h-11")}

                      >

                        <SelectValue placeholder="Select grade" />

                      </SelectTrigger>

                      <SelectContent>

                        {grades.map((grade) => (

                          <SelectItem key={grade.id} value={grade.id}>

                            {grade.name}

                          </SelectItem>

                        ))}

                      </SelectContent>

                    </Select>

                  )}

                  {errors.gradeId && (

                    <p className="text-sm text-red-500">{errors.gradeId}</p>

                  )}

                </div>



                <div className="space-y-2">

                  <Label htmlFor="class">Class</Label>

                  {loadingOptions ? (

                    <SelectFieldSkeleton />

                  ) : (

                    <Select

                      value={selectedClassId}

                      onValueChange={handleClassChange}

                      disabled={!selectedGradeId}

                    >

                      <SelectTrigger

                        id="class"

                        className={cn(errors.classId ? "border-red-500" : "", "w-full min-h-11")}

                      >

                        <SelectValue

                          placeholder={

                            selectedGradeId ? "Select class" : "Select grade first"

                          }

                        />

                      </SelectTrigger>

                      <SelectContent>

                        {classesForGrade.map((cls) => (

                          <SelectItem key={cls.id} value={cls.id}>

                            {cls.name}

                          </SelectItem>

                        ))}

                      </SelectContent>

                    </Select>

                  )}

                  {errors.classId && (

                    <p className="text-sm text-red-500">{errors.classId}</p>

                  )}

                </div>

              </div>

            )}



            <div className="space-y-2">

              <Label htmlFor="holy_name">Holy Name</Label>

              <Input

                id="holy_name"

                value={formData.holy_name}

                onChange={handleChange("holy_name")}

                placeholder="Enter holy name"

                className={errors.holy_name ? "border-red-500" : ""}

              />

              {errors.holy_name && (

                <p className="text-sm text-red-500">{errors.holy_name}</p>

              )}

            </div>



            <div className="space-y-2">

              <Label htmlFor="name">Full Name</Label>

              <Input

                id="name"

                value={formData.name}

                onChange={handleChange("name")}

                placeholder="Enter full name"

                className={errors.name ? "border-red-500" : ""}

              />

              {errors.name && (

                <p className="text-sm text-red-500">{errors.name}</p>

              )}

            </div>



            <div className="space-y-2">

              <Label htmlFor="email">Email</Label>

              <Input

                id="email"

                value={formData.email}

                onChange={handleChange("email")}

                placeholder="Enter email"

                className={errors.email ? "border-red-500" : ""}

              />

              {errors.email && (

                <p className="text-sm text-red-500">{errors.email}</p>

              )}

            </div>



            <div className="space-y-2">

              <Label htmlFor="username">Username</Label>

              <Input

                id="username"

                value={formData.username}

                onChange={handleChange("username")}

                placeholder="Enter username"

                className={errors.username ? "border-red-500" : ""}

              />

              {errors.username && (

                <p className="text-sm text-red-500">{errors.username}</p>

              )}

            </div>



            {isEditMode && (

              <div className="space-y-4 flex flex-col sm:flex-row sm:items-center gap-4">

                <div className="space-y-2 flex items-center gap-2 mb-0">

                  <Label htmlFor="isActive">Active</Label>

                  <Switch id="isActive" checked={existingStudent?.isActive} />

                </div>



                <div className="space-y-2 flex items-center gap-2 mb-0">

                  <Label htmlFor="isLocked">Locked</Label>

                  <Switch id="isLocked" checked={existingStudent?.isLocked} />

                </div>

              </div>

            )}



            <div className="flex w-full flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-4">

              <Button

                variant="outline"

                type="button"

                onClick={handleClose}

                className="min-h-11 w-full sm:w-auto"

              >

                Cancel

              </Button>

              <Button

                variant="default"

                type="submit"

                disabled={submitting || loadingOptions}

                className="min-h-11 w-full sm:w-auto"

              >

                {submitting

                  ? "Saving..."

                  : isEditMode

                    ? "Update Student"

                    : "Add Student"}

              </Button>

            </div>

          </div>

        </div>

      </form>

    </div>

  );
};

