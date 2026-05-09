import React, { useState } from 'react';

function UserManagement() {
  const [users] = useState([]);
  const [search, setSearch] = useState('');

  const roleColors = {
    'Admin': { bg: '#fef2f2', color: '#dc2626' },
    'HR Manager': { bg: '#f0fdf4', color: '#16a34a' },
    'Payroll Manager': { bg: '#eff6ff', color: '#2563eb' },
    'Employee': { bg: '#fefce8', color: '#ca8a04' }
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="content-card">
        <div className="card-header-custom">
          <h5>🔐 Quản Lý Tài Khoản & Phân Quyền</h5>
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
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    Chưa có dữ liệu người dùng
                  </td>
                </tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.id}</strong></td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge-status" style={{
                        background: roleColors[u.role]?.bg,
                        color: roleColors[u.role]?.color
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className="badge-status" style={{background: '#f0fdf4', color: '#16a34a'}}>
                        ● {u.status}
                      </span>
                    </td>
                    <td className="text-muted">{u.lastLogin}</td>
                    <td>
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
        </div>
        <div className="p-3">
          <p className="text-center text-muted py-3">Chưa có dữ liệu Audit Log</p>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
