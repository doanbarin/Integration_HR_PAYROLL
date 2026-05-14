import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';

function DashboardHome() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    departments: 0,
    totalSalary: 0,
    avgSalary: 0,
    totalAbsent: 0,
    totalLeave: 0,
    attendanceRate: 0,
    alertCount: 0
  });
  const [recentEmployees, setRecentEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [deptData, setDeptData] = useState([]);
  const [salaryData, setSalaryData] = useState([]);
  const [attendSummary, setAttendSummary] = useState([]);

  useEffect(() => {
    // Employees from SQL Server
    fetch(`${API}/employees`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStats(prev => ({ ...prev, totalEmployees: data.length }));
          setAllEmployees(data);
          setRecentEmployees(data.slice(-5).reverse());
        }
      }).catch(() => { });

    // Departments from SQL Server
    fetch(`${API}/departments`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStats(prev => ({ ...prev, departments: data.length }));
          setDeptData(data);
        }
      }).catch(() => { });

    // Payroll summary from MySQL
    fetch(`${API}/payroll-summary`)
      .then(r => r.json())
      .then(data => {
        setStats(prev => ({
          ...prev,
          totalSalary: data.totalNetSalary || 0,
          avgSalary: data.salaryEmployees > 0
            ? Math.round((data.totalNetSalary || 0) / data.salaryEmployees)
            : 0,
          attendanceRate: data.attendanceRate || 0
        }));
      }).catch(() => { });

    // Salaries for chart
    fetch(`${API}/salaries`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSalaryData(data); })
      .catch(() => { });

    // Attendance for summary
    fetch(`${API}/attendance`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAttendSummary(data);
          const totalAbsent = data.reduce((s, d) => s + (d.AbsentDays || 0), 0);
          const totalLeave = data.reduce((s, d) => s + (d.LeaveDays || 0), 0);
          setStats(prev => ({ ...prev, totalAbsent, totalLeave }));
        }
      }).catch(() => { });

    // Alerts count
    fetch(`${API}/alerts`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setStats(prev => ({ ...prev, alertCount: data.length }));
      }).catch(() => { });
  }, []);

  const formatVND = (n) => Number(n).toLocaleString('vi-VN') + ' ₫';

  // Build salary by month chart data
  const salaryByMonth = {};
  salaryData.forEach(s => {
    const m = (s.SalaryMonth || '').substring(0, 7);
    if (m) salaryByMonth[m] = (salaryByMonth[m] || 0) + (s.NetSalary || 0);
  });
  const salaryChartEntries = Object.entries(salaryByMonth).sort();
  const maxSalary = Math.max(...Object.values(salaryByMonth), 1);

  // Employee count by department
  const empByDept = {};
  allEmployees.forEach(emp => {
    const dept = emp.Department || 'Khác';
    empByDept[dept] = (empByDept[dept] || 0) + 1;
  });
  const maxEmpInDept = Math.max(...Object.values(empByDept), 1);
  const deptColors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];

  // Attendance summary
  const totalWorkDays = attendSummary.reduce((s, d) => s + (d.WorkDays || 0), 0);
  const totalAbsentDays = attendSummary.reduce((s, d) => s + (d.AbsentDays || 0), 0);
  const totalLeaveDays = attendSummary.reduce((s, d) => s + (d.LeaveDays || 0), 0);
  const totalAllDays = totalWorkDays + totalAbsentDays + totalLeaveDays || 1;

  const kpiCards = [
    {
      icon: '📅', label: 'Ngày Nghỉ / Vắng',
      value: `${stats.totalLeave + stats.totalAbsent}`,
      change: `${stats.totalLeave} nghỉ phép • ${stats.totalAbsent} vắng`,
      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',
      cardBg: '#fffbeb'
    },
    {
      icon: '🔔', label: 'Cảnh Báo',
      value: stats.alertCount,
      change: '',
      color: '#000000ff', bg: 'rgba(239,68,68,0.1)',
      cardBg: '#ff0000ff'
    },
    {
      icon: '👥', label: 'Tổng Nhân Viên', value: stats.totalEmployees,
      change: '', color: '#4f46e5', bg: 'rgba(79,70,229,0.1)'
    },
    {
      icon: '💰', label: 'Tổng Chi Phí Lương',
      value: stats.totalSalary > 0 ? formatVND(stats.totalSalary) : '---',
      change: stats.totalSalary > 0 ? '' : 'Chưa có dữ liệu',
      color: '#10b981', bg: 'rgba(16,185,129,0.1)'
    },
    {
      icon: '📊', label: 'Lương Trung Bình',
      value: stats.avgSalary > 0 ? formatVND(stats.avgSalary) : '---',
      change: stats.avgSalary > 0 ? '' : 'Chưa có dữ liệu',
      color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)'
    }
  ];

  return (
    <div className="animate-fade-in">
      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        {kpiCards.map((card, i) => (
          <div className={i < 2 ? "col-md-6" : "col-md-4"} key={i}>
            <div className="stat-card" style={card.cardBg ? { backgroundColor: card.cardBg } : {}}>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="stat-icon" style={{ background: card.bg, color: card.color }}>
                  {card.icon}
                </div>
              </div>
              <div className="stat-value" style={{ color: card.color, fontSize: card.value.toString().length > 10 ? 20 : 28 }}>
                {card.value}
              </div>
              <div className="stat-label">{card.label}</div>
              <div className="stat-change text-muted mt-1" style={{ fontSize: 11 }}>
                {card.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="row g-3 mb-4">
        {/* Salary by Month Chart */}
        <div className="col-lg-6">
          <div className="content-card">
            <div className="card-header-custom">
              <h5>📈 Biểu Đồ Lương Theo Thời Gian</h5>
            </div>
            <div className="p-3">
              {salaryChartEntries.length === 0 ? (
                <p className="text-center text-muted py-4">Chưa có dữ liệu</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180, padding: '0 10px' }}>
                  {salaryChartEntries.map(([month, total], i) => (
                    <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>
                        {formatVND(total).replace(' ₫', '')}
                      </span>
                      <div style={{
                        width: '100%', maxWidth: 60,
                        height: `${(total / maxSalary) * 140}px`,
                        background: `linear-gradient(180deg, ${deptColors[i % deptColors.length]} 0%, ${deptColors[i % deptColors.length]}88 100%)`,
                        borderRadius: '6px 6px 0 0',
                        minHeight: 20,
                        transition: 'height 0.5s ease'
                      }} />
                      <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>{month}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Employees by Department - Donut */}
        <div className="col-lg-3">
          <div className="content-card">
            <div className="card-header-custom">
              <h5>🏢 NV Theo Phòng Ban</h5>
            </div>
            <div className="p-3">
              {deptData.length === 0 ? (
                <p className="text-center text-muted py-4">Chưa có dữ liệu</p>
              ) : (
                <div>
                  {/* Simple horizontal bars */}
                  {deptData.slice(0, 6).map((d, i) => {
                    const count = empByDept[d.DepartmentName] || 0;
                    const pct = maxEmpInDept > 0 ? (count / maxEmpInDept) * 100 : 0;
                    return (
                      <div key={d.DepartmentID} className="mb-2">
                        <div className="d-flex justify-content-between" style={{ fontSize: 11, fontWeight: 500 }}>
                          <span style={{ color: '#334155' }}>{d.DepartmentName}</span>
                          <span style={{ color: '#94a3b8' }}>{count} NV</span>
                        </div>
                        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, marginTop: 2 }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.max(5, pct)}%`,
                            background: deptColors[i % deptColors.length],
                            borderRadius: 3,
                            transition: 'width 0.5s ease'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Attendance Summary - Pie */}
        <div className="col-lg-3">
          <div className="content-card">
            <div className="card-header-custom">
              <h5>📊 Chấm Công</h5>
            </div>
            <div className="p-3">
              <div className="text-center mb-3">
                <div style={{
                  width: 100, height: 100, borderRadius: '50%', margin: '0 auto',
                  background: `conic-gradient(
                    #10b981 0deg ${(totalWorkDays / totalAllDays) * 360}deg,
                    #f59e0b ${(totalWorkDays / totalAllDays) * 360}deg ${((totalWorkDays + totalLeaveDays) / totalAllDays) * 360}deg,
                    #ef4444 ${((totalWorkDays + totalLeaveDays) / totalAllDays) * 360}deg 360deg
                  )`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative'
                }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: '50%', background: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 14, color: '#10b981'
                  }}>
                    {stats.attendanceRate}%
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11 }}>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                  <span>Ngày công: {totalWorkDays}</span>
                </div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                  <span>Nghỉ phép: {totalLeaveDays}</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                  <span>Vắng: {totalAbsentDays}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Employees */}
      <div className="row g-3">
        <div className="col-lg-8">
          <div className="content-card">
            <div className="card-header-custom">
              <h5>📋 Nhân Viên Mới Nhất</h5>
            </div>
            <div className="table-responsive">
              <table className="table table-custom">
                <thead>
                  <tr>
                    <th>ID</th><th>Họ Tên</th><th>Phòng Ban</th><th>Chức Vụ</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEmployees.length === 0 ? (
                    <tr><td colSpan="4" className="text-center text-muted py-4">Kết nối Backend để xem dữ liệu</td></tr>
                  ) : (
                    recentEmployees.map(e => (
                      <tr key={e.EmployeeID}>
                        <td><strong>#{e.EmployeeID}</strong></td>
                        <td>{e.FullName}</td>
                        <td>{e.Department || '—'}</td>
                        <td>{e.Position || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="content-card">
            <div className="card-header-custom">
              <h5>🔔 Cảnh Báo Hệ Thống</h5>
            </div>
            <div className="p-3">
              {stats.alertCount === 0 ? (
                <p className="text-center text-muted py-3">Chưa có cảnh báo</p>
              ) : (
                <p className="text-center text-muted py-3">Có {stats.alertCount} cảnh báo</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardHome;
