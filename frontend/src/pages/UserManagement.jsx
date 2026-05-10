import React, { useState } from 'react';

function UserManagement() {
  const [search, setSearch] = useState('');

  // Demo data - would come from API in production
  const [users] = useState([
    { id: 1, username: 'admin', email: 'admin@companyx.com', role: 'Admin', status: 'Active', lastLogin: '2026-05-09 22:30' },
    { id: 2, username: 'hr_manager', email: 'hr@companyx.com', role: 'HR Manager', status: 'Active', lastLogin: '2026-05-09 21:15' },
    { id: 3, username: 'payroll_mgr', email: 'payroll@companyx.com', role: 'Payroll Manager', status: 'Active', lastLogin: '2026-05-09 20:00' },
    { id: 4, username: 'nguyen.vana', email: 'vana@companyx.com', role: 'Employee', status: 'Active', lastLogin: '2026-05-09 18:30' },
    { id: 5, username: 'tran.thib', email: 'thib@companyx.com', role: 'Employee', status: 'Active', lastLogin: '2026-05-08 17:45' },
    { id: 6, username: 'le.vanc', email: 'vanc@companyx.com', role: 'Employee', status: 'Inactive', lastLogin: '2026-04-20 10:00' },
  ]);

  const [auditLogs] = useState([
    { time: '2026-05-09 22:30:15', user: 'admin', action: 'Đăng nhập', detail: 'Đăng nhập thành công từ 192.168.1.100', type: 'login' },
    { time: '2026-05-09 22:25:00', user: 'hr_manager', action: 'Thêm NV', detail: 'Thêm nhân viên mới #1025 - Nguyễn Văn A', type: 'create' },
    { time: '2026-05-09 22:20:10', user: 'payroll_mgr', action: 'Cập nhật lương', detail: 'Cập nhật bảng lương tháng 09/2024', type: 'update' },
    { time: '2026-05-09 22:15:30', user: 'admin', action: 'Phân quyền', detail: 'Thay đổi role le.vanc → Inactive', type: 'permission' },
    { time: '2026-05-09 22:10:00', user: 'hr_manager', action: 'Xoá NV', detail: 'Xoá nhân viên #998 - Trần Minh B', type: 'delete' },
    { time: '2026-05-09 22:05:45', user: 'admin', action: 'Đăng nhập', detail: 'Đăng nhập thành công từ 10.0.0.5', type: 'login' },
  ]);

  const roleColors = {
    'Admin': { bg: '#fef2f2', color: '#dc2626', icon: '🔴' },
    'HR Manager': { bg: '#f0fdf4', color: '#16a34a', icon: '🟢' },
    'Payroll Manager': { bg: '#eff6ff', color: '#2563eb', icon: '🔵' },
    'Employee': { bg: '#fefce8', color: '#ca8a04', icon: '🟡' }
  };

  const actionColors = {
    'login': { bg: '#eff6ff', color: '#2563eb', icon: '🔑' },
    'create': { bg: '#f0fdf4', color: '#16a34a', icon: '➕' },
    'update': { bg: '#fefce8', color: '#ca8a04', icon: '✏️' },
    'delete': { bg: '#fef2f2', color: '#dc2626', icon: '🗑️' },
    'permission': { bg: '#faf5ff', color: '#7c3aed', icon: '🔐' },
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  // Counts by role
  const roleCounts = {};
  users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });

  return (
    <div className="animate-fade-in">
      {/* Role Summary Cards */}
      <div className="row g-3 mb-4">
        {Object.entries(roleColors).map(([role, style]) => (
          <div className="col-md-3" key={role}>
            <div className="stat-card">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span style={{fontSize: 20}}>{style.icon}</span>
                <span className="stat-label" style={{fontSize: 13, fontWeight: 600}}>{role}</span>
              </div>
              <div className="stat-value" style={{color: style.color}}>{roleCounts[role] || 0}</div>
              <div className="stat-label">Tài khoản</div>
            </div>
          </div>
        ))}
      </div>

      {/* User Table */}
      <div className="content-card">
        <div className="card-header-custom">
          <h5>🔐 Quản Lý Tài Khoản & Phân Quyền ({filtered.length})</h5>
          <div className="d-flex gap-2">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="🔍 Tìm kiếm..."
              style={{width: 220}}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="btn btn-primary-custom btn-sm">+ Thêm User</button>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-custom">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Trạng Thái</th>
                <th>Đăng Nhập Cuối</th>
                <th className="text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    Không tìm thấy user nào
                  </td>
                </tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.id}>
                    <td><strong>#{u.id}</strong></td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: `linear-gradient(135deg, ${roleColors[u.role]?.color || '#4f46e5'}, ${roleColors[u.role]?.color || '#4f46e5'}88)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 12, fontWeight: 700
                        }}>
                          {u.username[0].toUpperCase()}
                        </div>
                        <span className="fw-semibold">{u.username}</span>
                      </div>
                    </td>
                    <td style={{color: '#64748b'}}>{u.email}</td>
                    <td>
                      <span className="badge-status" style={{
                        background: roleColors[u.role]?.bg,
                        color: roleColors[u.role]?.color
                      }}>
                        {roleColors[u.role]?.icon} {u.role}
                      </span>
                    </td>
                    <td>
                      <span className="badge-status" style={{
                        background: u.status === 'Active' ? '#f0fdf4' : '#fef2f2',
                        color: u.status === 'Active' ? '#16a34a' : '#dc2626'
                      }}>
                        ● {u.status}
                      </span>
                    </td>
                    <td className="text-muted" style={{fontSize: 12}}>{u.lastLogin}</td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-outline-primary me-1" title="Sửa">✏️</button>
                      <button className="btn btn-sm btn-outline-danger" title="Xoá">🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log */}
      <div className="content-card mt-3">
        <div className="card-header-custom">
          <h5>📜 Audit Log</h5>
          <span className="badge-status" style={{background: 'rgba(79,70,229,0.1)', color: '#4f46e5', fontSize: 11}}>
            {auditLogs.length} bản ghi
          </span>
        </div>
        <div className="p-3">
          {auditLogs.map((log, i) => {
            const style = actionColors[log.type] || actionColors.login;
            return (
              <div key={i} className="d-flex align-items-start gap-3 mb-2 p-2" style={{
                background: '#f8fafc', borderRadius: 10,
                borderLeft: `3px solid ${style.color}`
              }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: style.bg, color: style.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0
                }}>{style.icon}</span>
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong style={{fontSize: 13}}>{log.action}</strong>
                      <span className="badge-status ms-2" style={{
                        background: roleColors[users.find(u => u.username === log.user)?.role]?.bg || '#f1f5f9',
                        color: roleColors[users.find(u => u.username === log.user)?.role]?.color || '#64748b',
                        fontSize: 10
                      }}>{log.user}</span>
                    </div>
                    <span style={{fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap'}}>{log.time}</span>
                  </div>
                  <p className="mb-0 mt-1" style={{fontSize: 12, color: '#64748b'}}>{log.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
