import { Outlet } from "react-router";
import { Sparkles } from "lucide-react";

export function ParentLayout() {
  return (
    <div className="min-h-screen flex flex-col text-zinc-900 dark:text-zinc-50 font-sans">
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Sparkles
                className="text-indigo-600 dark:text-indigo-400 fill-current"
                size={24}
              />
              <span className="text-xl font-bold tracking-tight">
                Attendify
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 sm:pb-8">
        <Outlet />
      </main>
    </div>
  );
}
