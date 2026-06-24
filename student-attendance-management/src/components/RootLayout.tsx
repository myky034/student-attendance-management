import { Outlet } from "react-router";
import { AppBackground } from "./AppBackground";

export function RootLayout() {
  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
      <AppBackground />
      <div className="relative z-10 min-h-screen">
        <Outlet />
      </div>
    </div>
  );
}
