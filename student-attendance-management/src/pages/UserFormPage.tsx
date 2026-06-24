import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button";
import { Paper, Box, Typography } from "@mui/material";
import { Input } from "../components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Label } from "../components/ui/lable";
import {
  getStudentById,
  saveStudent,
  type StudentRecord,
} from "../lib/api/students";
import { useAppContext } from "../context/useAppContext";
import { Switch } from "../components/ui/switch";
import { generateQRCode } from "../lib/importStudents";

export const UserFormPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user } = useAppContext();
  const isEditMode = Boolean(userId);

  const [existingStudent, setExistingStudent] = useState<StudentRecord | null>(
    null,
  );
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
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
  });

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    //setLoading(true);

    getStudentById(userId)
      .then((student) => {
        if (cancelled) return;
        setExistingStudent(student);
        if (student) {
          setFormData({
            name: student.name,
            holy_name: student.holy_name,
            email: student.email,
            username: student.username,
            password: "",
            qrCode: student.qrCode,
          });
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
  }, [userId]);

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

  const validateForm = () => {
    const newErrors = {
      name: "",
      holy_name: "",
      email: "",
      username: "",
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

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user?.classId) {
      toast.error("Your account is not assigned to a class");
      return;
    }

    const newErrors = validateForm();
    setErrors(newErrors);
    if (!Object.values(newErrors).every((error) => error === "")) {
      return;
    }

    setSubmitting(true);
    try {
      await saveStudent({
        id: isEditMode ? userId : undefined,
        name: formData.name.trim(),
        holy_name: formData.holy_name.trim(),
        email: formData.email.trim(),
        username: formData.username.trim(),
        qrCode: formData.qrCode,
        classId: user.classId,
        isActive: existingStudent?.isActive ?? true,
        isLocked: existingStudent?.isLocked ?? false,
      });

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
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Loading student...
      </p>
    );
  }

  if (isEditMode && !existingStudent) {
    return (
      <div>
        <p className="text-sm text-red-500 mb-4">Student not found.</p>
        <Button variant="outline" onClick={handleClose}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link
          to="/dashboard"
          className="w-10 h-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors shadow-sm"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          {isEditMode ? "Edit Student" : "Create Student"}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm">
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
              <div className="space-y-4 flex items-center gap-4">
                <div className="space-y-2 flex items-center gap-2 mb-0">
                  <Label htmlFor="isActive">Active</Label>
                  <Switch
                    id="isActive"
                    checked={existingStudent?.isActive}
                    //onCheckedChange={}
                  />
                </div>

                <div className="space-y-2 flex items-center gap-2 mb-0">
                  <Label htmlFor="isLocked">Locked</Label>
                  <Switch
                    id="isLocked"
                    checked={existingStudent?.isLocked}
                    //onCheckedChange={}
                  />
                </div>
              </div>
            )}

            <div className="flex w-full justify-end gap-4 pt-2">
              <Button variant="outline" type="button" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="default" type="submit" disabled={submitting}>
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
