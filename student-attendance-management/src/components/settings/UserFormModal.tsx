import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/lable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { Paper, Typography, Box } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import { Key, RefreshCw, Eye } from "lucide-react";
import { getClasses, type ClassOption } from "@/lib/api/classes";
import { createUser, type DbUser, type UserRole } from "@/lib/api/user";
import { toast } from "sonner";

const generateQRCode = () => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const qrCode = `STU-${timestamp}-${randomString}`.toUpperCase();
  return qrCode;
};

const generatePassword = () => {
  const length = 8;
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }

  return password;
};

export function UserFormModal({
  isOpen,
  onClose,
  onSuccess,
  user,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user: DbUser;
}) {
  const isEditMode = user ? true : false;
  const [formData, setFormData] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    username: user?.username ?? "",
    password: user?.password ?? "",
    role: user?.role ?? "",
    isActive: user?.isActive ?? true,
    isDeleted: user?.isDeleted ?? false,
    createdAt: user?.createdAt ?? new Date(),
    updatedAt: user?.updatedAt ?? new Date(),
    qrCode: user?.qrCode ?? generateQRCode(),
    id: user?.id ?? "",
    class: user?.class ?? "",
    classId: user?.classId ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({
    name: "",
    email: "",
    username: "",
    password: "",
    role: "",
    class: "",
    classId: "",
    isActive: "",
    qrCode: "",
    id: "",
  });
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    getClasses()
      .then((data) => {
        setClasses(data);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [isOpen]);

  const handleRefreshQRCode = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setFormData((prev) => ({ ...prev, qrCode: generateQRCode() }));
  };

  const handleGeneratePassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setFormData((prev) => ({ ...prev, password: generatePassword() }));
  };

  const handleShowPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setShowPassword((prev) => !prev);
  };

  const validateForm = () => {
    const newErrors = {
      name: "",
      email: "",
      username: "",
      password: "",
      role: "",
    };

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }
    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one uppercase letter, one lowercase letter, and one number";
    }
    if (!formData.role.trim()) {
      newErrors.role = "Role is required";
    }
    return newErrors;
  };

  const handleSubmit: React.ComponentProps<"form">["onSubmit"] = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    setErrors(newErrors);
    if (!Object.values(newErrors).every((error) => error === "")) {
      return;
    }

    try {
      if (isEditMode) {
        // updateUser(formData);
      } else {
        await createUser({
          name: formData.name,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          role: formData.role as UserRole,
          qrCode: formData.qrCode,
          classId: formData.classId,
          isActive: formData.isActive,
        });
        if (!isEditMode) {
          toast.success("User created successfully");
          onSuccess?.();
        } else {
          toast.success("User updated successfully");
          onSuccess?.();
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(
        "Failed to save user. Check Supabase RLS policies and required fields.",
      );
    } finally {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full p-4">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit User" : "Create User"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Edit the user details" : "Add a new user"}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4 w-full" onSubmit={handleSubmit}>
          <div className="flex flex-row gap-4 justify-between">
            <div className="w-1/2">
              <Paper
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 3,
                  background:
                    "linear-gradient(135deg, #fafbff 0%, #f0f4ff 100%)",
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
                    <QRCodeSVG
                      value={
                        isEditMode
                          ? (user?.qrCode ?? "")
                          : (formData.qrCode ?? "")
                      }
                      size={150}
                    />
                  </Box>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 1 }}
                >
                  Code:{" "}
                  {isEditMode ? (user?.qrCode ?? "") : (formData.qrCode ?? "")}
                </Typography>
                {!isEditMode && (
                  <Button
                    type="button"
                    variant="default"
                    onClick={handleRefreshQRCode}
                  >
                    <RefreshCw size={16} />
                    <span>Refresh QR Code</span>
                  </Button>
                )}
              </Paper>
            </div>
            <div className="w-1/2">
              <div className="space-y-2 mb-4">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={
                    isEditMode ? (user?.name ?? "") : (formData.name ?? "")
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2 mb-4">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="Enter email"
                  value={
                    isEditMode ? (user?.email ?? "") : (formData.email ?? "")
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2 mb-4">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter username"
                  value={
                    isEditMode
                      ? (user?.username ?? "")
                      : (formData.username ?? "")
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                />
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username}</p>
                )}
              </div>
              <div className="space-y-2 mb-4">
                <Label htmlFor="password">Password</Label>
                <div>
                  <Input
                    id="password"
                    placeholder="Enter password"
                    value={
                      isEditMode
                        ? (user?.password ?? "")
                        : (formData.password ?? "")
                    }
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    type={showPassword ? "text" : "password"}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleShowPassword}
                  >
                    <Eye size={16} />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGeneratePassword}
                >
                  <Key size={16} />
                  <span>Generate Password</span>
                </Button>
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>
              <div className="space-y-2 mb-4">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={
                    isEditMode ? (user?.role ?? "") : (formData.role ?? "")
                  }
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      role: value as UserRole,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-red-500">{errors.role}</p>
                )}
              </div>
              <div className="space-y-2 mb-4">
                <Label htmlFor="class">Class</Label>
                <Select
                  value={
                    isEditMode
                      ? (user?.classId ?? "")
                      : (formData.classId ?? "")
                  }
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, classId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classOption) => (
                      <SelectItem key={classOption.id} value={classOption.id}>
                        {classOption.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.class && (
                  <p className="text-sm text-red-500">{errors.class}</p>
                )}
              </div>
              <div className="space-y-2 mb-4">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  checked={
                    isEditMode
                      ? (user?.isActive ?? true)
                      : (formData.isActive ?? true)
                  }
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isActive: checked }))
                  }
                />
                {errors.isActive && (
                  <p className="text-sm text-red-500">{errors.isActive}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" variant="default">
              Save
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
