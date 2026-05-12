import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

function MyProfile() {
  const navigate = useNavigate();
  const [emp, setEmp] = useState(null);
  const [salary, setSalary] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('hr');

  const token = localStorage.getItem('token');
  const formatVND = (n) => Number(n || 0).toLocaleString('vi-VN') + ' ₫';

  useEffect(() => {
    // Gọi API lấy hồ sơ của chính mình
    fetch(`${API}/auth/my-profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.EmployeeID) {
          setEmp(data);
          // Sau khi có EmployeeID, lấy lương & chấm công
          const empId = data.EmployeeID;

          fetch(`${API}/salaries`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
            .then(r => r.json())
            .then(d => {
              if (Array.isArray(d)) {
                const found = d.filter(s => s.EmployeeID === empId);
                if (found.length > 0) setSalary(found[0]);
              }
            }).catch(() => {});

          fetch(`${API}/attendance`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
            .then(r => r.json())
            .then(d => {
              if (Array.isArray(d)) {
                const found = d.filter(a => a.EmployeeID === empId);
                if (found.length > 0) setAttendance(found[0]);
              }
            }).catch(() => {});
        } else {
          setError(data.msg || 'Không tìm thấy hồ sơ');
        }
      })
      .catch(err => setError('Lỗi kết nối: ' + err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
      <p>Đang tải hồ sơ của bạn...</p>
    </div>
  );

  if (error) return (
    <div className="content-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>😕</div>
      <h4 style={{ color: '#dc2626', marginBottom: 12 }}>Không tìm thấy hồ sơ</h4>
      <p style={{ color: '#64748b', maxWidth: 420, margin: '0 auto 24px' }}>{error}</p>
      <div style={{
        background: '#fef9c3', border: '1px solid #fde047',
        borderRadius: 10, padding: '16px 24px',
        maxWidth: 480, margin: '0 auto', textAlign: 'left', fontSize: 13
      }}>
        <strong>💡 Nguyên nhân có thể:</strong><br />
        • Tên tài khoản (<code>FullName</code>) trong bảng TaiKhoan chưa khớp với tên trong bảng Employees<br />
        • Bạn chưa được tạo hồ sơ nhân viên<br />
        <br />
        <strong>→ Liên hệ Admin để liên kết tài khoản của bạn với hồ sơ nhân viên.</strong>
      </div>
    </div>
  );

  const tabs = [
    { key: 'hr', icon: '👤', label: 'Thông Tin Cá Nhân' },
    { key: 'salary', icon: '💰', label: 'Lương Gần Nhất' },
    { key: 'attendance', icon: '📅', label: 'Chấm Công' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="content-card">
        <div className="card-header-custom">
          <h5>👤 Hồ Sơ Của Tôi</h5>
          <span className="badge-status" style={{ background: '#f0fdf4', color: '#16a34a', fontSize: 12 }}>
            ● Nhân viên #{emp.EmployeeID}
          </span>
        </div>

        <div className="p-4">
          {/* Avatar + Tên */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 24,
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
            borderRadius: 16, marginBottom: 28
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20, flexShrink: 0,
              background: 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, color: '#fff', fontWeight: 800,
              boxShadow: '0 8px 24px rgba(79,70,229,0.3)'
            }}>
              {emp.FullName?.[0] || 'N'}
            </div>
            <div>
              <h4 style={{ margin: 0, color: '#1e293b', fontWeight: 700 }}>{emp.FullName}</h4>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
                🏢 {emp.DepartmentName || '—'} &nbsp;•&nbsp; 💼 {emp.PositionName || '—'}
              </p>
              <span className="badge-status" style={{
                marginTop: 8, display: 'inline-block',
                background: emp.Status === 'Active' ? '#f0fdf4' : '#fef2f2',
                color: emp.Status === 'Active' ? '#16a34a' : '#dc2626'
              }}>
                ● {emp.Status === 'Active' ? 'Đang làm việc' : emp.Status}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <ul className="nav nav-pills mb-4" style={{ gap: 8 }}>
            {tabs.map(t => (
              <li className="nav-item" key={t.key}>
                <button
                  className={`nav-link ${activeTab === t.key ? 'active' : ''}`}
                  style={activeTab === t.key
                    ? { background: 'var(--primary)', borderRadius: 10, fontSize: 13 }
                    : { borderRadius: 10, fontSize: 13 }}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.icon} {t.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Tab: HR */}
          {activeTab === 'hr' && (
            <div className="row g-3">
              {[
                { label: 'Mã Nhân Viên', value: `#${emp.EmployeeID}`, icon: '🆔' },
                { label: 'Email', value: emp.Email || '—', icon: '📧' },
                { label: 'Ngày Sinh', value: emp.DateOfBirth?.split('T')[0] || '—', icon: '🎂' },
                { label: 'Giới Tính', value: emp.Gender === 'Male' ? 'Nam ♂' : emp.Gender === 'Female' ? 'Nữ ♀' : '—', icon: '👤' },
                { label: 'Số Điện Thoại', value: emp.PhoneNumber || '—', icon: '📱' },
                { label: 'Ngày Vào Làm', value: emp.HireDate?.split('T')[0] || '—', icon: '📅' },
                { label: 'Phòng Ban', value: emp.DepartmentName || '—', icon: '🏢' },
                { label: 'Chức Vụ', value: emp.PositionName || '—', icon: '💼' },
              ].map((item, i) => (
                <div className="col-md-6" key={i}>
                  <div className="p-3" style={{ background: '#f8fafc', borderRadius: 10 }}>
                    <small className="text-muted d-block">{item.icon} {item.label}</small>
                    <strong>{item.value}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Salary */}
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
                  ].map((item, i) => (
                    <div className="col-md-6" key={i}>
                      <div className="p-3" style={{ background: '#f8fafc', borderRadius: 10 }}>
                        <small className="text-muted d-block">{item.icon} {item.label}</small>
                        <strong style={{ color: item.color || '#0f172a', fontSize: 15 }}>{item.value}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>💸</div>
                  <p>Chưa có dữ liệu lương của bạn</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Attendance */}
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
                      <div className="p-3" style={{ background: '#f8fafc', borderRadius: 10 }}>
                        <small className="text-muted d-block">{item.icon} {item.label}</small>
                        <strong style={{ color: item.color || '#0f172a', fontSize: 24 }}>{item.value}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                  <p>Chưa có dữ liệu chấm công của bạn</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyProfile;
