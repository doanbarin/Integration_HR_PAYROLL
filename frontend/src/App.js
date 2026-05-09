import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="employees" element={<EmployeeList />} />
          <Route path="employees/add" element={<EmployeeForm />} />
          <Route path="employees/edit/:id" element={<EmployeeForm />} />
          <Route path="employees/:id" element={<EmployeeProfile />} />
          <Route path="departments" element={<DepartmentMngt />} />
          <Route path="positions" element={<PositionMngt />} />
          <Route path="payroll" element={<MonthlyPayroll />} />
          <Route path="salary-history" element={<SalaryHistory />} />
          <Route path="attendance" element={<AttendanceData />} />
          <Route path="import-leave" element={<ImportAndLeave />} />
          <Route path="reports" element={<ReportCenter />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
