import { createBrowserRouter } from "react-router";
import { SplashScreen } from "../pages/SplashScreen";
import { Login } from "../pages/Login";
import { AdminLayout } from "../components/AdminLayout";
import { AdminDashboard } from "../pages/AdminDashboard";
import { AppLayout } from "../components/AppLayout";
import { DashboardPage } from "../pages/DashboardPage";
import { QRScanner } from "../pages/QRScanner";
import { UserFormPage } from "../pages/UserFormPage";
import { Students } from "../pages/(admin)/Students";
import { Settings } from "../pages/(admin)/Settings";
import { UserFormDetail } from "@/pages/UserFormDetail";
import { AttendanceReport } from "@/pages/AttendanceReport";
import { ParentLayout } from "@/components/ParentLayout";
import { ParentPortal } from "@/pages/ParentPortal";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: SplashScreen,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/parent-portal",
    Component: ParentLayout,
    children: [
      {
        path: "",
        Component: ParentPortal,
      },
    ],
  },
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      {
        path: "dashboard",
        Component: AdminDashboard,
      },
      {
        path: "students",
        Component: Students,
      },
      {
        path: "settings",
        Component: Settings,
      },
    ],
  },
  {
    path: "/",
    Component: AppLayout,
    children: [
      {
        path: "dashboard",
        Component: DashboardPage,
      },
      {
        path: "qrscanner",
        Component: QRScanner,
      },
      {
        path: "users/create",
        Component: UserFormPage,
      },
      { path: "users/edit/:userId", Component: UserFormPage },
      { path: "users/detail/:userId", Component: UserFormDetail },
      { path: "attendance-report", Component: AttendanceReport },
    ],
  },
]);
