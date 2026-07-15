import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import {
  Sparkles,
  Crown,
  Shield,
  LogOut,
  LayoutDashboard,
  Users,
  Settings,
  History,
} from "lucide-react";
import { Link } from "react-router";
import { useAppContext } from "../context/useAppContext";

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAppContext();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user || (user.role !== "admin" && user.role !== "supervisor")) {
    navigate("/login");
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinks = [
    {
      to: "/admin/dashboard",
      label: "Dashboard",
      shortLabel: "Home",
      icon: LayoutDashboard,
    },
    {
      to: "/admin/students",
      label: "Students",
      shortLabel: "Students",
      icon: Users,
    },
    {
      to: "/admin/settings",
      label: "Settings",
      shortLabel: "Settings",
      icon: Settings,
    },
    {
      to: "/admin/audit-logs",
      label: "Audit Logs",
      shortLabel: "Logs",
      icon: History,
    },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col text-zinc-900 dark:text-zinc-50 font-sans">
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 backdrop-blur-md border-b border-amber-200 dark:border-amber-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Sparkles
                  className="text-indigo-600 dark:text-indigo-400 fill-current"
                  size={24}
                />
                <span className="truncate text-lg font-bold tracking-tight sm:text-xl">
                  Attendify
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full text-xs font-semibold shadow-lg">
                <Crown size={14} />
                <span>ADMIN</span>
              </div>
            </div>

            <div className="hidden sm:flex gap-1 ml-10">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Icon size={20} />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-4 ml-auto">
              <div className="hidden sm:flex flex-col items-end">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{user?.name}</span>
                  <Shield size={14} className="text-amber-500" />
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {user?.email}
                </span>
              </div>
              <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-full flex items-center justify-center shadow-lg">
                <Crown size={18} />
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:pb-6 lg:pb-8">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-amber-200 bg-white/95 backdrop-blur-md dark:border-amber-900/50 dark:bg-zinc-900/95 sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Mobile navigation"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-stretch justify-around">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium leading-tight transition-colors ${
                  isActive
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="w-full truncate text-center">
                  {link.shortLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
