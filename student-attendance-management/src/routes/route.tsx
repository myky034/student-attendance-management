import { createBrowserRouter } from "react-router";
import { SplashScreen } from "../pages/SplashScreen";
import { Login } from "../pages/Login";
import { AdminLayout } from "../components/AdminLayout";
import { AdminDashboard } from "../pages/AdminDashboard";
import { AppLayout } from "../components/AppLayout";
import { DashboardPage } from "../pages/DashboardPage";
import { QRScanner } from "../pages/QRScanner";
import { UserFormPage } from "../pages/UserFormPage";

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
    path: "/admin",
    Component: AdminLayout,
    children: [
      {
        path: "dashboard",
        Component: AdminDashboard,
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
      { path: "users/edit/:userId", 
        Component: UserFormPage 
      },
    ],
  },
]);
