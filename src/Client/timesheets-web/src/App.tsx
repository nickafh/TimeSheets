import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/useAuth";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { RoleProtectedRoute } from "./auth/RoleProtectedRoute";
import { PageWrapper } from "./components/Layout/PageWrapper";
import { ToastProvider } from "./components/Toast";
import { ConfirmProvider } from "./components/ConfirmDialog";
import { ErrorBoundary } from "./components/ErrorBoundary";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TimeOffSummary from "./pages/TimeOffSummary";
import TimeOffRequests from "./pages/TimeOffRequests";
import NewTimeOffRequest from "./pages/NewTimeOffRequest";
import CalendarView from "./pages/CalendarView";
import WeeklyTimeEntries from "./pages/WeeklyTimeEntries";
import ManagerDashboard from "./pages/ManagerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ManageUsers from "./pages/ManageUsers";
import ManageNotifications from "./pages/ManageNotifications";
import SystemReports from "./pages/SystemReports";
import ManageHolidays from "./pages/ManageHolidays";
import ApprovePto from "./pages/ApprovePto";
import TeamTimeEntries from "./pages/TeamTimeEntries";
import TeamMemberDetails from "./pages/TeamMemberDetails";
import AdminUserDetails from "./pages/AdminUserDetails";
import SystemSettings from "./pages/SystemSettings";

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <ErrorBoundary level="app">
      <Routes>
        {/* Public login */}
        <Route path="/login" element={<Login />} />

        {/* Protected app */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PageWrapper>
                <Dashboard />
              </PageWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/timesheets/weekly"
          element={
            <ProtectedRoute>
              <PageWrapper>
                <WeeklyTimeEntries />
              </PageWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/timeoff/summary"
          element={
            <ProtectedRoute>
              <PageWrapper>
                <TimeOffSummary />
              </PageWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/timeoff/requests"
          element={
            <ProtectedRoute>
              <PageWrapper>
                <TimeOffRequests />
              </PageWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/timeoff/new"
          element={
            <ProtectedRoute>
              <PageWrapper>
                <NewTimeOffRequest />
              </PageWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <PageWrapper>
                <CalendarView />
              </PageWrapper>
            </ProtectedRoute>
          }
        />

        {/* Manager Routes - Only accessible by Manager and Admin */}
        <Route
          path="/manager/dashboard"
          element={
            <RoleProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <PageWrapper>
                <ManagerDashboard />
              </PageWrapper>
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/manager/team-time-entries"
          element={
            <RoleProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <PageWrapper>
                <TeamTimeEntries />
              </PageWrapper>
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/manager/approve-pto"
          element={
            <RoleProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <PageWrapper>
                <ApprovePto />
              </PageWrapper>
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/manager/team-member/:id"
          element={
            <RoleProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <PageWrapper>
                <TeamMemberDetails />
              </PageWrapper>
            </RoleProtectedRoute>
          }
        />

        {/* Admin Routes - Only accessible by Admin */}
        <Route
          path="/admin/dashboard"
          element={
            <RoleProtectedRoute allowedRoles={["Admin"]}>
              <PageWrapper>
                <AdminDashboard />
              </PageWrapper>
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/admin/manage-users"
          element={
            <RoleProtectedRoute allowedRoles={["Admin"]}>
              <PageWrapper>
                <ManageUsers />
              </PageWrapper>
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/admin/notifications"
          element={
            <RoleProtectedRoute allowedRoles={["Admin"]}>
              <PageWrapper>
                <ManageNotifications />
              </PageWrapper>
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/admin/manage-holidays"
          element={
            <RoleProtectedRoute allowedRoles={["Admin"]}>
              <PageWrapper>
                <ManageHolidays />
              </PageWrapper>
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/admin/reports"
          element={
            <RoleProtectedRoute allowedRoles={["Admin"]}>
              <PageWrapper>
                <SystemReports />
              </PageWrapper>
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/admin/time-entries"
          element={
            <RoleProtectedRoute allowedRoles={["Admin"]}>
              <PageWrapper>
                <div className="p-8">
                  <h1 className="text-3xl font-bold text-afh-navy">All Time Entries</h1>
                  <p className="mt-4 text-slate-600">View time entries for all employees. (Feature coming soon)</p>
                </div>
              </PageWrapper>
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/admin/settings"
          element={
            <RoleProtectedRoute allowedRoles={["Admin"]}>
              <PageWrapper>
                <SystemSettings />
              </PageWrapper>
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/admin/user/:id"
          element={
            <RoleProtectedRoute allowedRoles={["Admin"]}>
              <PageWrapper>
                <AdminUserDetails />
              </PageWrapper>
            </RoleProtectedRoute>
          }
        />

        {/* Default */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
          </ErrorBoundary>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;