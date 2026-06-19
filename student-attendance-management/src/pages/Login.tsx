"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Zap, AlertCircle, LogIn, Eye, EyeOff } from "lucide-react";
import { authenticateUser } from "@/lib/api/user";
import { useAppContext } from "../context/useAppContext";
import type { User, UserRole } from "../context/appContext";

function mapDbUserToSessionUser(
  dbUser: Awaited<ReturnType<typeof authenticateUser>>,
): User {
  if (!dbUser) {
    throw new Error("User not found");
  }

  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    username: dbUser.username,
    password: dbUser.password,
    role: dbUser.role as UserRole,
    qrCode: dbUser.qrCode,
    classId: dbUser.classId,
    isActive: dbUser.isActive,
    isDeleted: dbUser.isDeleted,
    isLocked: dbUser.isLocked,
    isVerified: false,
    isSuspended: false,
    createdAt: new Date(dbUser.createdAt),
    updatedAt: new Date(dbUser.updatedAt),
  };
}

export function Login() {
  const navigate = useNavigate();
  const { setSessionUser } = useAppContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const userData = await authenticateUser(email, password);

      if (!userData) {
        setError("Invalid email or password");
        return;
      }

      if (!userData.isActive || userData.isDeleted || userData.isLocked) {
        setError("Your account is not active, deleted, or locked");
        return;
      }

      setSessionUser(mapDbUserToSessionUser(userData));

      if (userData.role === "admin" || userData.role === "supervisor") {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err);
      setError("Login failed. Check Supabase RLS policies for the User table.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden font-sans">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden border border-zinc-100 dark:border-zinc-800"
      >
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
              <Zap size={32} className="fill-current" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2 text-zinc-900 dark:text-zinc-50">
            Welcome back
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-center mb-8">
            Enter your details to access your attendance.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={handleShowPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-6 py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2 group shadow-lg shadow-indigo-600/20"
            >
              <LogIn
                size={20}
                className="group-hover:translate-x-1 transition-transform"
              />
              <span>{isSubmitting ? "Logging in..." : "Log In"}</span>
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Use the email and password stored in the <strong>User</strong>{" "}
            table.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
