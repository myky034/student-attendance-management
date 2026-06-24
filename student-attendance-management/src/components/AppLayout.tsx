import { useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router";
import {
  Sparkles,
  User,
  LogOut,
  Home,
  ScanBarcode,
  FileText,
  CalendarClock,
  History,
} from "lucide-react";
import { useAppContext } from "../context/useAppContext";

const navLinks = [
  {
    to: "/dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    icon: Home,
  },
  {
    to: "/qrscanner",
    label: "QR Scanner",
    shortLabel: "Scan",
    icon: ScanBarcode,
  },
  {
    to: "/leave-requests",
    label: "Leave Requests",
    shortLabel: "Leave",
    icon: CalendarClock,
  },
  {
    to: "/attendance-report",
    label: "Attendance Report",
    shortLabel: "Report",
    icon: FileText,
  },
  {
    to: "/audit-logs",
    label: "Audit Logs",
    shortLabel: "Logs",
    icon: History,
  },
] as const;

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAppContext();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user || user.role !== "teacher") {
    navigate("/login");
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-[100dvh] flex-col text-zinc-900 dark:text-zinc-50 font-sans">
      <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="mx-auto w-full max-w-6xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-2 sm:h-16">
            <Link
              to="/dashboard"
              className="flex min-w-0 items-center gap-2"
              aria-label="Attendify home"
            >
              <Sparkles
                className="shrink-0 text-indigo-600 dark:text-indigo-400 fill-current"
                size={22}
              />
              <span className="truncate text-lg font-bold tracking-tight sm:text-xl">
                Attendify
              </span>
            </Link>

            <div className="hidden lg:flex min-w-0 flex-1 justify-center gap-1 px-4">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Icon size={18} />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <div className="hidden min-w-0 sm:flex flex-col items-end">
                <span className="max-w-[140px] truncate text-sm font-medium md:max-w-[200px]">
                  {user.name}
                </span>
                <span className="max-w-[140px] truncate text-xs text-zinc-500 dark:text-zinc-400 md:max-w-[200px]">
                  {user.email}
                </span>
              </div>
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                aria-hidden
              >
                <User size={18} />
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:pb-8">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Mobile navigation"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-stretch justify-around">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium leading-tight transition-colors sm:text-xs ${
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
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
