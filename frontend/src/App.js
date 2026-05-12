import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import UserManagement from './pages/UserManagement';
import EmployeeList from './pages/EmployeeList';
import EmployeeForm from './pages/EmployeeForm';
import EmployeeProfile from './pages/EmployeeProfile';
import DepartmentMngt from './pages/DepartmentMngt';
import PositionMngt from './pages/PositionMngt';
import MonthlyPayroll from './pages/MonthlyPayroll';
import SalaryHistory from './pages/SalaryHistory';
import AttendanceData from './pages/AttendanceData';
import ImportAndLeave from './pages/ImportAndLeave';
import ReportCenter from './pages/ReportCenter';
import AlertsBell from './pages/AlertsBell';
import MyProfile from './pages/MyProfile';

// ===== PHÂN QUYỀN THEO ROLE =====
// 🔴 Admin         - Quản lý toàn hệ thống
// 🟢 HR Manager    - Quản lý nhân sự
// 🔵 Payroll Mgr   - Quản lý lương & chấm công
// 🟡 Employee      - Nhân viên thường (hồ sơ bản thân)

const ROLES = {
  ADMIN: 'Admin',
  HR: 'HR Manager',
  PAYROLL: 'Payroll Manager',
  EMPLOYEE: 'Employee',
};

function App() {
  return (
    <Router>
      <Routes>
        {/* PUBLIC: Trang đăng nhập - luôn mở trước */}
        <Route path="/login" element={<LoginPage />} />

        {/* PUBLIC: Trang không có quyền */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* PRIVATE: Dashboard Layout - bắt buộc phải đăng nhập */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        >
          {/* [UI-03] Dashboard: Tất cả role đều vào được */}
          <Route index element={<DashboardHome />} />

          {/* [UI-02] Quản lý User: CHỈ ADMIN */}
          <Route
            path="users"
            element={
              <PrivateRoute allowedRoles={[ROLES.ADMIN]}>
                <UserManagement />
              </PrivateRoute>
            }
          />

          {/* [UI-04] Danh sách nhân viên: Admin, HR Manager */}
          <Route
            path="employees"
            element={
              <PrivateRoute allowedRoles={[ROLES.ADMIN, ROLES.HR]}>
                <EmployeeList />
              </PrivateRoute>
            }
          />

          {/* [UI-05] Thêm/Sửa nhân viên: Admin, HR Manager */}
          <Route
            path="employees/add"
            element={
              <PrivateRoute allowedRoles={[ROLES.ADMIN, ROLES.HR]}>
                <EmployeeForm />
              </PrivateRoute>
            }
          />
          <Route
            path="employees/edit/:id"
            element={
              <PrivateRoute allowedRoles={[ROLES.ADMIN, ROLES.HR]}>
                <EmployeeForm />
              </PrivateRoute>
            }
          />

          {/* [UI-06] Hồ sơ nhân viên: Admin, HR Manager, Employee (xem của chính mình) */}
          <Route
            path="employees/:id"
            element={
              <PrivateRoute allowedRoles={[ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE]}>
                <EmployeeProfile />
              </PrivateRoute>
            }
          />

          {/* [UI-07] Phòng ban: Admin, HR Manager */}
          <Route
            path="departments"
            element={
              <PrivateRoute allowedRoles={[ROLES.ADMIN, ROLES.HR]}>
                <DepartmentMngt />
              </PrivateRoute>
            }
          />

          {/* [UI-08] Chức vụ: Admin, HR Manager */}
          <Route
            path="positions"
            element={
              <PrivateRoute allowedRoles={[ROLES.ADMIN, ROLES.HR]}>
                <PositionMngt />
              </PrivateRoute>
            }
          />

          {/* [UI-09] Bảng lương tháng: Admin, Payroll Manager */}
          <Route
            path="payroll"
            element={
              <PrivateRoute allowedRoles={[ROLES.ADMIN, ROLES.PAYROLL]}>
                <MonthlyPayroll />
              </PrivateRoute>
            }
          />

          {/* [UI-10] Lịch sử lương: Admin, Payroll Manager, Employee (xem của mình) */}
          <Route
            path="salary-history"
            element={
              <PrivateRoute allowedRoles={[ROLES.ADMIN, ROLES.PAYROLL, ROLES.EMPLOYEE]}>
                <SalaryHistory />
              </PrivateRoute>
            }
          />

          {/* [UI-12] Chấm công: Admin, Payroll Manager */}
          <Route
            path="attendance"
            element={
              <PrivateRoute allowedRoles={[ROLES.ADMIN, ROLES.PAYROLL]}>
                <AttendanceData />
              </PrivateRoute>
            }
          />

          {/* [UI-13] Import & Nghỉ phép: Admin, Payroll Manager, Employee (nộp đơn) */}
          <Route
            path="import-leave"
            element={
              <PrivateRoute allowedRoles={[ROLES.ADMIN, ROLES.PAYROLL, ROLES.EMPLOYEE]}>
                <ImportAndLeave />
              </PrivateRoute>
            }
          />

          {/* [UI-14] Báo cáo: Admin, HR Manager, Payroll Manager */}
          <Route
            path="reports"
            element={
              <PrivateRoute allowedRoles={[ROLES.ADMIN, ROLES.HR, ROLES.PAYROLL]}>
                <ReportCenter />
              </PrivateRoute>
            }
          />

          {/* [UI-15] Cảnh báo: Admin, HR Manager, Payroll Manager */}
          <Route
            path="alerts"
            element={
              <PrivateRoute allowedRoles={[ROLES.ADMIN, ROLES.HR, ROLES.PAYROLL]}>
                <AlertsBell />
              </PrivateRoute>
            }
          />

          {/* [MY-PROFILE] Hồ sơ cá nhân: Employee (và Admin, HR để test) */}
          <Route
            path="my-profile"
            element={
              <PrivateRoute allowedRoles={[ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.HR]}>
                <MyProfile />
              </PrivateRoute>
            }
          />
        </Route>

        {/* Mọi URL không hợp lệ → về login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
