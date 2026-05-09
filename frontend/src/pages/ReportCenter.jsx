import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';

function ReportCenter() {
  const [activeReport, setActiveReport] = useState('hr');
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatVND = (n) => Number(n).toLocaleString('vi-VN') + ' ₫';
  const deptColors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];

  useEffect(() => {
    Promise.all([
      fetch(`${API}/employees`).then(r => r.json()).catch(() => []),
      fetch(`${API}/departments`).then(r => r.json()).catch(() => []),
      fetch(`${API}/salaries`).then(r => r.json()).catch(() => []),
      fetch(`${API}/attendance`).then(r => r.json()).catch(() => []),
    ]).then(([emp, dept, sal, att]) => {
      if (Array.isArray(emp)) setEmployees(emp);
      if (Array.isArray(dept)) setDepartments(dept);
      if (Array.isArray(sal)) setSalaries(sal);
      if (Array.isArray(att)) setAttendance(att);
      setLoading(false);
    });
  }, []);

  const reports = [
    { key: 'hr', icon: '👥', title: 'Báo Cáo Nhân Sự', desc: 'Số lượng NV, theo phòng ban, trạng thái', role: 'HR Manager' },
    { key: 'payroll', icon: '💰', title: 'Báo Cáo Lương', desc: 'Tổng lương, lương trung bình, theo PB', role: 'Payroll Manager' },
    { key: 'attendance', icon: '📅', title: 'Báo Cáo Chấm Công', desc: 'Tỷ lệ nghỉ, top nghỉ nhiều', role: 'Admin' },
    { key: 'dividend', icon: '📊', title: 'Báo Cáo Cổ Tức', desc: 'Tổng cổ tức, theo nhân viên', role: 'Admin' },
  ];

  // HR report data
  const empByDept = {};
  employees.forEach(e => {
    const d = e.Department || 'Chưa phân bổ';
    empByDept[d] = (empByDept[d] || 0) + 1;
  });
  const activeCount = employees.filter(e => (e.Status || 'Active') === 'Active').length;
  const inactiveCount = employees.length - activeCount;

  // Payroll report data
  const totalSalary = salaries.reduce((s, r) => s + (r.NetSalary || 0), 0);
  const avgSalary = salaries.length > 0 ? Math.round(totalSalary / salaries.length) : 0;
  const salaryByDept = {};
  salaries.forEach(s => {
    const d = s.DepartmentName || 'Khác';
    salaryByDept[d] = (salaryByDept[d] || 0) + (s.NetSalary || 0);
  });
  const maxDeptSalary = Math.max(...Object.values(salaryByDept), 1);

  // Attendance report data
  const totalWorkDays = attendance.reduce((s, a) => s + (a.WorkDays || 0), 0);
  const totalAbsent = attendance.reduce((s, a) => s + (a.AbsentDays || 0), 0);
  const totalLeave = attendance.reduce((s, a) => s + (a.LeaveDays || 0), 0);
  const leaveRate = totalWorkDays + totalAbsent + totalLeave > 0
    ? ((totalAbsent + totalLeave) / (totalWorkDays + totalAbsent + totalLeave) * 100).toFixed(1)
    : 0;

  // Top absent employees
  const absentByEmp = {};
  attendance.forEach(a => {
    const key = a.EmployeeID;
    if (!absentByEmp[key]) absentByEmp[key] = { id: key, name: a.FullName || `NV #${key}`, total: 0 };
    absentByEmp[key].total += (a.AbsentDays || 0) + (a.LeaveDays || 0);
  });
  const topAbsent = Object.values(absentByEmp).sort((a, b) => b.total - a.total).slice(0, 5);

  if (loading) return <div className="text-center py-5 text-muted">⏳ Đang tải dữ liệu báo cáo...</div>;

  return (
    <div className="animate-fade-in">
      {/* Report Type Cards */}
      <div className="row g-3 mb-4">
        {reports.map(r => (
          <div className="col-md-6 col-xl-3" key={r.key}>
            <div className="stat-card" style={{cursor: 'pointer',
              border: activeReport === r.key ? '2px solid var(--primary)' : '1px solid var(--border-color)'
            }} onClick={() => setActiveReport(r.key)}>
              <div style={{fontSize: 32, marginBottom: 8}}>{r.icon}</div>
              <h6 style={{fontWeight: 700, fontSize: 14}}>{r.title}</h6>
              <p className="text-muted mb-1" style={{fontSize: 12}}>{r.desc}</p>
              <span className="badge-status" style={{background: 'rgba(79,70,229,0.1)', color: '#4f46e5', fontSize: 10}}>{r.role}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Report Content */}
      <div className="content-card">
        <div className="card-header-custom">
          <h5>📈 {reports.find(r => r.key === activeReport)?.title}</h5>
          <div className="d-flex gap-2">
            <button className="btn btn-primary-custom btn-sm">📥 Xuất Excel</button>
            <button className="btn btn-outline-secondary btn-sm">📄 Xuất PDF</button>
          </div>
        </div>
        <div className="p-4">
          {/* HR Report */}
          {activeReport === 'hr' && (
            <div>
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{color: '#4f46e5'}}>{employees.length}</div>
                    <div className="stat-label">Tổng Nhân Viên</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{color: '#10b981'}}>{activeCount}</div>
                    <div className="stat-label">Đang Làm Việc</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{color: '#ef4444'}}>{inactiveCount}</div>
                    <div className="stat-label">Nghỉ Việc</div>
                  </div>
                </div>
              </div>
              <h6 className="mb-3 fw-bold">Nhân Viên Theo Phòng Ban</h6>
              <div style={{display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, padding: '0 10px'}}>
                {Object.entries(empByDept).map(([dept, count], i) => {
                  const maxCount = Math.max(...Object.values(empByDept), 1);
                  return (
                    <div key={dept} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
                      <span style={{fontSize: 12, fontWeight: 700, color: deptColors[i % deptColors.length]}}>{count}</span>
                      <div style={{
                        width: '100%', maxWidth: 50,
                        height: `${(count / maxCount) * 150}px`,
                        background: deptColors[i % deptColors.length],
                        borderRadius: '6px 6px 0 0', minHeight: 20
                      }} />
                      <span style={{fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.2, maxWidth: 70, overflow: 'hidden'}}>
                        {dept.replace('Phòng ', '')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payroll Report */}
          {activeReport === 'payroll' && (
            <div>
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{color: '#10b981', fontSize: 20}}>{formatVND(totalSalary)}</div>
                    <div className="stat-label">Tổng Chi Lương</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{color: '#0ea5e9', fontSize: 20}}>{formatVND(avgSalary)}</div>
                    <div className="stat-label">Lương Trung Bình</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{color: '#4f46e5'}}>{salaries.length}</div>
                    <div className="stat-label">Phiếu Lương</div>
                  </div>
                </div>
              </div>
              <h6 className="mb-3 fw-bold">Lương Theo Phòng Ban</h6>
              {Object.entries(salaryByDept).map(([dept, total], i) => (
                <div key={dept} className="mb-3">
                  <div className="d-flex justify-content-between mb-1" style={{fontSize: 12}}>
                    <span className="fw-semibold">{dept}</span>
                    <span style={{color: '#64748b'}}>{formatVND(total)}</span>
                  </div>
                  <div style={{height: 10, background: '#f1f5f9', borderRadius: 5}}>
                    <div style={{
                      height: '100%', borderRadius: 5,
                      width: `${(total / maxDeptSalary) * 100}%`,
                      background: `linear-gradient(90deg, ${deptColors[i % deptColors.length]}, ${deptColors[i % deptColors.length]}88)`
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Attendance Report */}
          {activeReport === 'attendance' && (
            <div>
              <div className="row g-3 mb-4">
                <div className="col-md-3">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{color: '#10b981'}}>{totalWorkDays}</div>
                    <div className="stat-label">Tổng Ngày Công</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{color: '#ef4444'}}>{totalAbsent}</div>
                    <div className="stat-label">Tổng Ngày Vắng</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{color: '#f59e0b'}}>{totalLeave}</div>
                    <div className="stat-label">Tổng Ngày Nghỉ</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{color: '#4f46e5'}}>{leaveRate}%</div>
                    <div className="stat-label">Tỷ Lệ Nghỉ</div>
                  </div>
                </div>
              </div>
              <h6 className="mb-3 fw-bold">🔴 Top Nhân Viên Nghỉ Nhiều</h6>
              <table className="table table-custom">
                <thead>
                  <tr>
                    <th>Hạng</th><th>Mã NV</th><th>Họ Tên</th>
                    <th className="text-center">Tổng Ngày Nghỉ/Vắng</th>
                    <th>Mức Độ</th>
                  </tr>
                </thead>
                <tbody>
                  {topAbsent.length === 0 ? (
                    <tr><td colSpan="5" className="text-center text-muted py-3">Chưa có dữ liệu</td></tr>
                  ) : (
                    topAbsent.map((e, i) => (
                      <tr key={e.id}>
                        <td><strong>#{i + 1}</strong></td>
                        <td>#{e.id}</td>
                        <td>{e.name}</td>
                        <td className="text-center fw-bold">{e.total}</td>
                        <td>
                          <span className="badge-status" style={{
                            background: e.total > 4 ? '#fef2f2' : e.total > 2 ? '#fefce8' : '#f0fdf4',
                            color: e.total > 4 ? '#dc2626' : e.total > 2 ? '#ca8a04' : '#16a34a'
                          }}>
                            {e.total > 4 ? '⚠️ Cảnh báo' : e.total > 2 ? '⚡ Lưu ý' : '✅ Bình thường'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Dividend Report */}
          {activeReport === 'dividend' && (
            <div className="text-center py-4">
              <div style={{fontSize: 48, marginBottom: 16}}>📊</div>
              <h6>Báo Cáo Cổ Tức</h6>
              <p className="text-muted">Tính năng đang phát triển. Kết nối với bảng Dividends từ SQL Server.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReportCenter;
