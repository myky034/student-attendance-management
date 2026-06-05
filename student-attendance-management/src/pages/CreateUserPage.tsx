import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAppContext } from "../context/useAppContext";
import type { UserRole } from "../context/appContext";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Paper, Box, Typography, TextField } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

const generateQRCode = () => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const qrCode = `STU-${timestamp}-${randomString}`.toUpperCase();
  return qrCode;
};

export const CreateUserPage = () => {
  const { addUser } = useAppContext();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    role: "student",
    qrCode: generateQRCode(),
    class: "",
  });
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    class: "",
  });

  const handleRefreshQRCode = () => {
    setFormData((prev) => ({ ...prev, qrCode: generateQRCode() }));
    toast.success("QR Code refreshed successfully");
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
          Create a new user
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
                Student QR Code
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
              <button
                type="button"
                onClick={handleRefreshQRCode}
                className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 group shadow-lg shadow-indigo-600/20 mx-auto"
              >
                <RefreshCw size={16} />
                <span>Refresh QR Code</span>
              </button>
            </Paper>

            <TextField
              fullWidth
              label="Student Name"
              placeholder="Enter full name"
              value={formData.name}
              onChange={handleChange("name")}
              error={!!errors.name}
              helperText={errors.name}
              margin="normal"
            />

            <TextField
              fullWidth
              label="Email Address"
              placeholder="student@school.edu"
              type="email"
              value={formData.email}
              onChange={handleChange("email")}
              error={!!errors.email}
              helperText={errors.email}
              margin="normal"
            />

            <TextField
              fullWidth
              label="Class"
              placeholder="e.g., Class 10A"
              value={formData.class}
              onChange={handleChange("class")}
              error={!!errors.class}
              helperText={errors.class}
              margin="normal"
            />

            <div className="flex w-full justify-end gap-4 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="py-3 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 group shadow-lg shadow-red-600/20"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 group shadow-lg shadow-indigo-600/20"
              >
                Add Student
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
