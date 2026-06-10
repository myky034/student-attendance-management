import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useAppContext } from "../context/useAppContext";
import type { UserRole } from "../context/appContext";
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
import { initialClasses, initialStudents } from "../data/mockData";

const generateQRCode = () => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const qrCode = `STU-${timestamp}-${randomString}`.toUpperCase();
  return qrCode;
};

export const UserFormPage = () => {
  const { addUser, updateUser } = useAppContext();
  const navigate = useNavigate();
  const { userId } = useParams();
  const existingStudent = initialStudents.find(
    (student) => student.id === userId,
  );
  const [formData, setFormData] = useState({
    name: existingStudent?.name || "",
    email: existingStudent?.email || "",
    username: "",
    password: "",
    role: "student",
    qrCode: existingStudent?.qrCode || generateQRCode(),
    class: existingStudent?.class.id ?? "",
  });
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    class: "",
  });
  const isEditMode = !!existingStudent;

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

  const handleClassChange = (value: string) => {
    setFormData((prev) => ({ ...prev, class: value }));
    setErrors((prev) => ({ ...prev, class: "" }));
  };

  const validateForm = () => {
    const newErrors = {
      name: "",
      email: "",
      class: "",
    };

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.class.trim()) {
      newErrors.class = "Class is required";
    }
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors = validateForm();
    setErrors(newErrors);
    if (Object.values(newErrors).every((error) => error === "")) {
      if (isEditMode) {
        updateUser(userId ?? "", {
          name: formData.name,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          role: formData.role as UserRole,
          id: userId ?? "",
          createdAt: new Date(),
          updatedAt: new Date(),
          qrCode: formData.qrCode,
          isActive: true,
          isDeleted: false,
          isVerified: false,
          isSuspended: false,
          isLocked: false,
        });
        toast.success("Student updated successfully");
        handleClose();
      } else {
        addUser({
          name: formData.name,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          role: formData.role as UserRole,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          qrCode: formData.qrCode,
          isActive: true,
          isDeleted: false,
          isVerified: false,
          isSuspended: false,
          isLocked: false,
        });
        toast.success("Student added successfully");
        handleClose();
      }
    }
  };

  const handleClose = () => {
    navigate("/dashboard");
    setFormData({
      name: "",
      email: "",
      username: "",
      password: "",
      role: "student",
      qrCode: generateQRCode(),
      class: "",
    });
    setErrors({
      name: "",
      email: "",
      class: "",
    });
  };

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
              <Label htmlFor="class">Class</Label>
              <Select value={formData.class} onValueChange={handleClassChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {initialClasses.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.class && (
                <p className="text-sm text-red-500">{errors.class}</p>
              )}
            </div>

            <div className="flex w-full justify-end gap-4 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="default" type="submit">
                {isEditMode ? "Update Student" : "Add Student"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
