import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [emp, setEmp] = useState(null);
  const [salary, setSalary] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('hr');

  const formatVND = (n) => Number(n).toLocaleString('vi-VN') + ' ₫';

  useEffect(() => {
    // HR info from SQL Server
    fetch(`${API}/employees/${id}`)
      .then(r => r.json())
      .then(data => { setEmp(data); setLoading(false); })
      .catch(() => setLoading(false));

    // Latest salary from MySQL
    fetch(`${API}/salaries`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const empSalary = data.filter(s => s.EmployeeID === parseInt(id));
          if (empSalary.length > 0) setSalary(empSalary[0]);
        }
      }).catch(() => {});

    // Latest attendance from MySQL
    fetch(`${API}/attendance`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const empAttend = data.filter(a => a.EmployeeID === parseInt(id));
          if (empAttend.length > 0) setAttendance(empAttend[0]);
        }
      }).catch(() => {});
  }, [id]);

  if (loading) return <div className="text-center py-5 text-muted">⏳ Đang tải...</div>;
  if (!emp) return <div className="text-center py-5 text-muted">Không tìm thấy nhân viên</div>;

  const tabs = [
    { key: 'hr', icon: '👤', label: 'Thông Tin HR' },
    { key: 'salary', icon: '💰', label: 'Lương Gần Nhất' },
    { key: 'attendance', icon: '📅', label: 'Chấm Công' }
  ];

  return (
    <div className="animate-fade-in">
      <div className="content-card">
        <div className="card-header-custom">
          <h5>👤 Hồ Sơ Nhân Viên #{emp.EmployeeID}</h5>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-warning btn-sm" onClick={() => navigate(`/employees/edit/${id}`)}>
              ✏️ Sửa
            </button>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/employees')}>
              ← Quay lại
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="row">
            <div className="col-md-3 text-center mb-4">
              <div style={{
                width: 120, height: 120, borderRadius: 20,
                background: 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48, color: '#fff', fontWeight: 800, margin: '0 auto'
              }}>
                {emp.FullName?.[0] || 'N'}
              </div>
              <h5 className="mt-3 mb-1">{emp.FullName}</h5>
              <span className="badge-status" style={{
                background: emp.Status === 'Active' ? '#f0fdf4' : '#fef2f2',
                color: emp.Status === 'Active' ? '#16a34a' : '#dc2626'
              }}>
                ● {emp.Status}
              </span>
            </div>
            <div className="col-md-9">
              {/* Tabs */}
              <ul className="nav nav-pills mb-3" style={{gap: 6}}>
                {tabs.map(t => (
                  <li className="nav-item" key={t.key}>
                    <button
                      className={`nav-link ${activeTab === t.key ? 'active' : ''}`}
                      style={activeTab === t.key
                        ? {background: 'var(--primary)', borderRadius: 10, fontSize: 13}
                        : {borderRadius: 10, fontSize: 13}}
                      onClick={() => setActiveTab(t.key)}
                    >{t.icon} {t.label}</button>
                  </li>
                ))}
              </ul>

              {/* HR Tab */}
              {activeTab === 'hr' && (
                <div className="row g-3">
                  {[
                    { label: 'Mã Nhân Viên', value: `#${emp.EmployeeID}`, icon: '🆔' },
                    { label: 'Email', value: emp.Email, icon: '📧' },
                    { label: 'Ngày Sinh', value: emp.DateOfBirth?.split('T')[0] || '—', icon: '🎂' },
                    { label: 'Giới Tính', value: emp.Gender === 'Male' ? 'Nam' : 'Nữ', icon: '👤' },
                    { label: 'Số Điện Thoại', value: emp.PhoneNumber || '—', icon: '📱' },
                    { label: 'Ngày Vào Làm', value: emp.HireDate?.split('T')[0] || '—', icon: '📅' },
                    { label: 'Phòng Ban', value: emp.DepartmentName || '—', icon: '🏢' },
                    { label: 'Chức Vụ', value: emp.PositionName || '—', icon: '💼' },
                  ].map((item, i) => (
                    <div className="col-md-6" key={i}>
                      <div className="p-3" style={{background: '#f8fafc', borderRadius: 10}}>
                        <small className="text-muted d-block">{item.icon} {item.label}</small>
                        <strong>{item.value}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Salary Tab */}
              {activeTab === 'salary' && (
                <div>
                  {salary ? (
                    <div className="row g-3">
                      {[
                        { label: 'Kỳ Lương', value: salary.SalaryMonth, icon: '📅' },
                        { label: 'Lương Cơ Bản', value: formatVND(salary.BaseSalary), icon: '💵' },
                        { label: 'Phụ Cấp / Thưởng', value: formatVND(salary.Bonus), icon: '🎁', color: '#10b981' },
                        { label: 'Khấu Trừ', value: formatVND(salary.Deductions), icon: '📉', color: '#ef4444' },
                        { label: 'Thực Lãnh', value: formatVND(salary.NetSalary), icon: '💰', color: '#4f46e5' },
                        { label: 'Phòng Ban', value: salary.DepartmentName || '—', icon: '🏢' },
                      ].map((item, i) => (
                        <div className="col-md-6" key={i}>
                          <div className="p-3" style={{background: '#f8fafc', borderRadius: 10}}>
                            <small className="text-muted d-block">{item.icon} {item.label}</small>
                            <strong style={{color: item.color || '#0f172a'}}>{item.value}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted py-4">Chưa có dữ liệu lương cho nhân viên này</p>
                  )}
                </div>
              )}

              {/* Attendance Tab */}
              {activeTab === 'attendance' && (
                <div>
                  {attendance ? (
                    <div className="row g-3">
                      {[
                        { label: 'Tháng', value: attendance.AttendanceMonth, icon: '📅' },
                        { label: 'Ngày Công', value: attendance.WorkDays, icon: '✅', color: '#10b981' },
                        { label: 'Ngày Vắng', value: attendance.AbsentDays, icon: '❌', color: '#ef4444' },
                        { label: 'Ngày Nghỉ Phép', value: attendance.LeaveDays, icon: '📋', color: '#f59e0b' },
                      ].map((item, i) => (
                        <div className="col-md-6" key={i}>
                          <div className="p-3" style={{background: '#f8fafc', borderRadius: 10}}>
                            <small className="text-muted d-block">{item.icon} {item.label}</small>
                            <strong style={{color: item.color || '#0f172a', fontSize: 20}}>{item.value}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted py-4">Chưa có dữ liệu chấm công cho nhân viên này</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeProfile;
