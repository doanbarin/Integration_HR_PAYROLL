import React, { useState, useEffect } from 'react';

function UserManagement() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [viewPasswordUser, setViewPasswordUser] = useState(null);
  const [viewPasswordData, setViewPasswordData] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [permissionUser, setPermissionUser] = useState(null);
  const [newRole, setNewRole] = useState('Employee');
  const [resetUser, setResetUser] = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [formData, setFormData] = useState({
    Username: '',
    Password: '',
    FullName: '',
    Role: 'Employee',
    IsActive: 1,
    EmployeeID: ''
  });
  const [empSearchText, setEmpSearchText] = useState('');
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);

  const token = localStorage.getItem('token');
  const API_URL = 'http://localhost:5000';

  // Fetch users từ API
  useEffect(() => {
    fetchUsers();
    fetchLogs();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_URL}/api/employees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Lỗi khi tải employees:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      setError('Lỗi khi tải danh sách users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/logs?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Lỗi khi tải logs:', err);
    }
  };

  const handleAddClick = () => {
    setEditingUser(null);
    setFormData({
      Username: '',
      Password: '',
      FullName: '',
      Role: 'Employee',
      IsActive: 1,
      EmployeeID: ''
    });
    setEmpSearchText('');
    setShowModal(true);
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setFormData({
      Username: user.Username,
      Password: '',
      FullName: user.FullName,
      Role: user.Role,
      IsActive: user.IsActive,
      EmployeeID: user.EmployeeID || ''
    });
    const emp = employees.find(e => e.EmployeeID === user.EmployeeID);
    setEmpSearchText(emp ? `${emp.FullName} - ${emp.Position}` : '');
    setShowModal(true);
  };

  const handleEmployeeSelect = (empId) => {
    if (!empId) {
      setFormData({ ...formData, EmployeeID: '', FullName: '' });
      setEmpSearchText('');
      return;
    }
    
    const emp = employees.find(e => e.EmployeeID.toString() === empId.toString());
    const existingUser = users.find(u => u.EmployeeID?.toString() === empId.toString());

    if (existingUser) {
      if (window.confirm(`Nhân viên ${emp.FullName} đã có tài khoản (${existingUser.Username}). Bạn có muốn chuyển sang giao diện chỉnh sửa tài khoản này không?`)) {
        handleEditClick(existingUser);
      } else {
        // Reset select
        setFormData({ ...formData, EmployeeID: '', FullName: '' });
        setEmpSearchText('');
      }
    } else {
      setFormData({ 
        ...formData, 
        EmployeeID: empId, 
        FullName: emp ? emp.FullName : '',
        Username: emp ? emp.Email?.split('@')[0] || '' : '' // Gợi ý username từ email nếu có
      });
      setEmpSearchText(`${emp.FullName} - ${emp.Position}`);
    }
    setShowEmpDropdown(false);
  };

  const handleSaveUser = async () => {
    try {
      if (!formData.FullName || !formData.Username) {
        alert('Vui lòng nhập đầy đủ thông tin');
        return;
      }

      if (editingUser) {
        // Update user
        const response = await fetch(`${API_URL}/api/users/${editingUser.UserID}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
        const data = await response.json();
        if (response.ok) {
          alert('Cập nhật user thành công');
          setShowModal(false);
          fetchUsers();
          fetchLogs();
        } else {
          alert('Lỗi: ' + data.msg);
        }
      } else {
        // Create new user
        if (!formData.Password) {
          alert('Vui lòng nhập mật khẩu');
          return;
        }
        const response = await fetch(`${API_URL}/api/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
        const data = await response.json();
        if (response.ok) {
          alert('Tạo user thành công');
          setShowModal(false);
          fetchUsers();
          fetchLogs();
        } else {
          alert('Lỗi: ' + data.msg);
        }
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Bạn chắc chắn muốn xóa user này?')) {
      try {
        const response = await fetch(`${API_URL}/api/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (response.ok) {
          alert('Xóa user thành công');
          fetchUsers();
          fetchLogs();
        } else {
          alert('Lỗi: ' + data.msg);
        }
      } catch (err) {
        alert('Lỗi: ' + err.message);
      }
    }
  };

  const handleResetPassword = async (userId, userName) => {
    if (window.confirm(`Bạn chắc chắn muốn reset mật khẩu cho ${userName}?`)) {
      try {
        const response = await fetch(`${API_URL}/api/users/${userId}/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ ResetBy: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).Username : 'admin' })
        });
        const data = await response.json();
        if (response.ok) {
          setResetUser({ UserID: userId, Username: userName });
          setTempPassword(data.tempPassword);
          setShowResetModal(true);
          fetchLogs();
        } else {
          alert('Lỗi: ' + data.msg);
        }
      } catch (err) {
        alert('Lỗi: ' + err.message);
      }
    }
  };

  const handleOpenPermissionModal = (user) => {
    setPermissionUser(user);
    setNewRole(user.Role);
    setShowPermissionModal(true);
  };

  const handleShowPassword = async (user) => {
    setViewPasswordUser(user);
    setViewPasswordData(null);
    setShowPasswordModal(true);
    try {
      const response = await fetch(`${API_URL}/api/users/${user.UserID}/show-password`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setViewPasswordData(data);
      } else {
        setViewPasswordData({ error: data.msg });
      }
    } catch (err) {
      setViewPasswordData({ error: err.message });
    }
  };

  const handleChangePermission = async () => {
    if (!permissionUser) return;
    
    try {
      const response = await fetch(`${API_URL}/api/users/${permissionUser.UserID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          FullName: permissionUser.FullName,
          Role: newRole,
          IsActive: permissionUser.IsActive,
          UpdatedBy: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).Username : 'admin'
        })
      });
      const data = await response.json();
      if (response.ok) {
        alert(`Cập nhật quyền thành công (${permissionUser.Username} → ${newRole})`);
        setShowPermissionModal(false);
        fetchUsers();
        fetchLogs();
      } else {
        alert('Lỗi: ' + data.msg);
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const roleColors = {
    'Admin': { bg: '#fef2f2', color: '#dc2626', icon: '🔴' },
    'HR Manager': { bg: '#f0fdf4', color: '#16a34a', icon: '🟢' },
    'Payroll Manager': { bg: '#eff6ff', color: '#2563eb', icon: '🔵' },
    'Employee': { bg: '#fefce8', color: '#ca8a04', icon: '🟡' }
  };

  const actionColors = {
    'LOGIN': { bg: '#eff6ff', color: '#2563eb', icon: '🔑' },
    'CREATE_USER': { bg: '#f0fdf4', color: '#16a34a', icon: '➕' },
    'UPDATE_USER': { bg: '#fefce8', color: '#ca8a04', icon: '✏️' },
    'DELETE_USER': { bg: '#fef2f2', color: '#dc2626', icon: '🗑️' },
    'CHANGE_PASSWORD': { bg: '#faf5ff', color: '#7c3aed', icon: '🔐' },
  };

  const filtered = users.filter(u =>
    u.Username.toLowerCase().includes(search.toLowerCase()) ||
    u.FullName.toLowerCase().includes(search.toLowerCase()) ||
    u.Role.toLowerCase().includes(search.toLowerCase())
  );

  const roleCounts = {};
  users.forEach(u => { roleCounts[u.Role] = (roleCounts[u.Role] || 0) + 1; });

  const getFirstName = (fullName) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    return parts[parts.length - 1];
  };

  const sortedEmployees = [...employees].sort((a, b) => 
    getFirstName(a.FullName).localeCompare(getFirstName(b.FullName), 'vi')
  );

  const filteredEmployees = sortedEmployees.filter(emp => 
    emp.FullName.toLowerCase().includes(empSearchText.toLowerCase()) || 
    (emp.Department && emp.Department.toLowerCase().includes(empSearchText.toLowerCase())) ||
    (emp.Position && emp.Position.toLowerCase().includes(empSearchText.toLowerCase()))
  );

  if (loading) {
    return <div className="text-center py-5">Đang tải dữ liệu...</div>;
  }

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

      {error && <div className="alert alert-danger">{error}</div>}

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
            <button className="btn btn-primary-custom btn-sm" onClick={handleAddClick}>+ Thêm User</button>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-custom">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Họ Tên</th>
                <th>Role</th>
                <th>Trạng Thái</th>
                <th>Ngày Tạo</th>
                <th>Mật Khẩu Tạm</th>
                <th className="text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">
                    Không tìm thấy user nào
                  </td>
                </tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.UserID}>
                    <td><strong>#{u.UserID}</strong></td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: `linear-gradient(135deg, ${roleColors[u.Role]?.color || '#4f46e5'}, ${roleColors[u.Role]?.color || '#4f46e5'}88)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 12, fontWeight: 700
                        }}>
                          {u.Username[0].toUpperCase()}
                        </div>
                        <span className="fw-semibold">{u.Username}</span>
                      </div>
                    </td>
                    <td>
                      <div><strong>{u.FullName}</strong></div>
                      {u.EmployeeID ? (
                        <span style={{fontSize: 11, color: '#16a34a', background: '#f0fdf4', padding: '2px 6px', borderRadius: 4}}>
                          ✔ Đã lk NV #{u.EmployeeID}
                        </span>
                      ) : (
                        <span style={{fontSize: 11, color: '#dc2626', background: '#fef2f2', padding: '2px 6px', borderRadius: 4}}>
                          ❌ Chưa lk NV
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge-status" style={{
                        background: roleColors[u.Role]?.bg,
                        color: roleColors[u.Role]?.color
                      }}>
                        {roleColors[u.Role]?.icon} {u.Role}
                      </span>
                    </td>
                    <td>
                      <span className="badge-status" style={{
                        background: u.IsActive ? '#f0fdf4' : '#fef2f2',
                        color: u.IsActive ? '#16a34a' : '#dc2626'
                      }}>
                        ● {u.IsActive ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="text-muted" style={{fontSize: 12}}>{new Date(u.CreatedAt).toLocaleDateString('vi-VN')}</td>
                    <td style={{fontSize: 12}}>
                      {u.TempPasswordPlain ? (
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleShowPassword(u)}
                          title="Xem mật khẩu tạm"
                          style={{fontSize: 11}}
                        >
                          👁️ Xem
                        </button>
                      ) : (
                        <span className="text-muted" style={{fontSize: 11}}>—</span>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'nowrap' }}>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => handleEditClick(u)} title="Sửa" style={{padding:'3px 8px'}}>✏️</button>
                        <button className="btn btn-sm btn-outline-info" onClick={() => handleOpenPermissionModal(u)} title="Phân quyền" style={{padding:'3px 8px'}}>🔐</button>
                        <button className="btn btn-sm btn-outline-warning" onClick={() => handleResetPassword(u.UserID, u.Username)} title="Reset Password" style={{padding:'3px 8px'}}>🔑</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteUser(u.UserID)} title="Xoá" style={{padding:'3px 8px'}}>🗑️</button>
                      </div>
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
            {logs.length} bản ghi gần đây
          </span>
        </div>
        <div className="p-3">
          {logs.length === 0 ? (
            <div className="text-center text-muted py-4">Không có log nào</div>
          ) : (
            logs.map((log, i) => {
              const style = actionColors[log.Action] || actionColors.LOGIN;
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
                        <strong style={{fontSize: 13}}>{log.Action}</strong>
                        <span className="badge-status ms-2" style={{
                          background: '#e0e7ff',
                          color: '#4f46e5',
                          fontSize: 10
                        }}>{log.UserID}</span>
                        <span className="badge-status ms-1" style={{
                          background: log.ResultStatus === 'Success' ? '#f0fdf4' : '#fef2f2',
                          color: log.ResultStatus === 'Success' ? '#16a34a' : '#dc2626',
                          fontSize: 10
                        }}>{log.ResultStatus}</span>
                      </div>
                      <span style={{fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap'}}>{new Date(log.Timestamp).toLocaleString('vi-VN')}</span>
                    </div>
                    <p className="mb-0 mt-1" style={{fontSize: 12, color: '#64748b'}}>{log.Endpoint} | IP: {log.SourceIP}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Add/Edit User */}
      {showModal && (
        <div className="modal" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog" style={{marginTop: '100px'}}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingUser ? 'Sửa User' : 'Thêm User Mới'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Chọn Nhân Viên (Hồ sơ)</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={empSearchText} 
                      onChange={e => {
                         setEmpSearchText(e.target.value);
                         setShowEmpDropdown(true);
                         if(e.target.value === '') handleEmployeeSelect('');
                      }}
                      onFocus={() => setShowEmpDropdown(true)}
                      onBlur={() => setTimeout(() => setShowEmpDropdown(false), 200)}
                      placeholder="-- Tìm và Chọn Nhân Viên --"
                      style={{ paddingRight: 35 }}
                    />
                    <span 
                      style={{ position: 'absolute', right: 12, top: 10, cursor: 'pointer', color: '#94a3b8', fontSize: 12 }}
                      onClick={() => setShowEmpDropdown(!showEmpDropdown)}
                    >
                      ▼
                    </span>

                    {showEmpDropdown && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                        background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8,
                        maxHeight: 240, overflowY: 'auto', zIndex: 1050, 
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                      }}>
                         {filteredEmployees.map(emp => (
                           <div 
                             key={emp.EmployeeID}
                             style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}
                             onMouseDown={() => handleEmployeeSelect(emp.EmployeeID)}
                             onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                             onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                           >
                             <div style={{ fontWeight: 600, color: '#0f172a' }}>{emp.FullName}</div>
                             <div style={{ fontSize: 12, color: '#64748b' }}>{emp.Position} ({emp.Department})</div>
                           </div>
                         ))}
                         {filteredEmployees.length === 0 && (
                           <div style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 14, textAlign: 'center' }}>Không tìm thấy nhân viên</div>
                         )}
                      </div>
                    )}
                  </div>
                  {!formData.EmployeeID && !editingUser && <small className="text-muted">Vui lòng chọn nhân viên để tạo/tìm tài khoản</small>}
                </div>

                <div className="mb-3">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.Username}
                    onChange={e => setFormData({...formData, Username: e.target.value})}
                    disabled={editingUser ? true : false}
                    placeholder="Tên đăng nhập"
                  />
                </div>

                {!editingUser && (
                  <div className="mb-3">
                    <label className="form-label">Mật khẩu</label>
                    <input
                      type="password"
                      className="form-control"
                      value={formData.Password}
                      onChange={e => setFormData({...formData, Password: e.target.value})}
                      placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                    />
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">Role</label>
                  <select
                    className="form-control"
                    value={formData.Role}
                    onChange={e => setFormData({...formData, Role: e.target.value})}
                  >
                    <option value="Employee">Employee</option>
                    <option value="HR Manager">HR Manager</option>
                    <option value="Payroll Manager">Payroll Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.IsActive === 1}
                      onChange={e => setFormData({...formData, IsActive: e.target.checked ? 1 : 0})}
                    />
                    Hoạt động
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="button" className="btn btn-primary" onClick={handleSaveUser}>Lưu</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {showResetModal && resetUser && (
        <div className="modal" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog" style={{marginTop: '150px'}}>
            <div className="modal-content" style={{borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'}}>
              <div className="modal-header" style={{borderBottom: '1px solid #e2e8f0'}}>
                <h5 className="modal-title">🔑 Reset Mật Khẩu</h5>
                <button type="button" className="btn-close" onClick={() => setShowResetModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info mb-3" role="alert">
                  <strong>User: {resetUser.Username}</strong><br/>
                  Mật khẩu tạm đã được tạo và có thể được sử dụng ngay. User sẽ được yêu cầu thay đổi mật khẩu khi đăng nhập lần đầu tiên.
                </div>
                
                <div className="mb-3">
                  <label className="form-label"><strong>Mật khẩu tạm:</strong></label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      value={tempPassword}
                      readOnly
                      style={{fontFamily: 'monospace', fontSize: '14px'}}
                    />
                    <button 
                      className="btn btn-outline-secondary" 
                      onClick={() => {
                        navigator.clipboard.writeText(tempPassword);
                        alert('Đã copy vào clipboard!');
                      }}
                      title="Copy"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>

                <div className="alert alert-warning" role="alert">
                  <strong>⚠️ Lưu ý quan trọng:</strong><br/>
                  • Gửi mật khẩu này cho user qua kênh an toàn<br/>
                  • User phải thay đổi mật khẩu tạm khi đăng nhập lần đầu<br/>
                  • Mật khẩu tạm sẽ hết hạn sau khi user đổi mật khẩu mới
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowResetModal(false)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Phân Quyền */}
      {showPermissionModal && permissionUser && (
        <div className="modal" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog" style={{marginTop: '150px'}}>
            <div className="modal-content" style={{borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'}}>
              <div className="modal-header" style={{borderBottom: '1px solid #e2e8f0'}}>
                <h5 className="modal-title">🔐 Phân Quyền</h5>
                <button type="button" className="btn-close" onClick={() => setShowPermissionModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <strong>Tên tài khoản:</strong> {permissionUser.Username}<br/>
                  <strong>Họ tên:</strong> {permissionUser.FullName}
                </div>

                <hr/>

                <div className="mb-3">
                  <label className="form-label"><strong>Phân quyền mới:</strong></label>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                    {['Admin', 'HR Manager', 'Payroll Manager', 'Employee'].map(role => (
                      <div key={role} style={{position: 'relative'}}>
                        <input
                          type="radio"
                          id={`role-${role}`}
                          name="role"
                          value={role}
                          checked={newRole === role}
                          onChange={e => setNewRole(e.target.value)}
                          style={{marginRight: '8px'}}
                        />
                        <label htmlFor={`role-${role}`} style={{cursor: 'pointer', marginBottom: 0}}>
                          {roleColors[role]?.icon} {role}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="alert alert-info" role="alert">
                  <strong>Mô tả quyền hạn:</strong><br/>
                  • <strong>Admin:</strong> Quản lý toàn hệ thống<br/>
                  • <strong>HR Manager:</strong> Quản lý nhân sự<br/>
                  • <strong>Payroll Manager:</strong> Quản lý bảng lương<br/>
                  • <strong>Employee:</strong> Nhân viên thường
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPermissionModal(false)}>Hủy</button>
                <button type="button" className="btn btn-primary" onClick={handleChangePermission}>Lưu quyền</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Mật Khẩu Tạm */}
      {showPasswordModal && viewPasswordUser && (
        <div className="modal" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog" style={{marginTop: '150px'}}>
            <div className="modal-content" style={{borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'}}>
              <div className="modal-header" style={{borderBottom: '1px solid #e2e8f0'}}>
                <h5 className="modal-title">👁️ Xem Mật Khẩu Tạm</h5>
                <button type="button" className="btn-close" onClick={() => setShowPasswordModal(false)}></button>
              </div>
              <div className="modal-body">
                {!viewPasswordData ? (
                  <div className="text-center py-3">⏳ Đang tải...</div>
                ) : viewPasswordData.error ? (
                  <div className="alert alert-danger">{viewPasswordData.error}</div>
                ) : (
                  <>
                    <div className="alert alert-info mb-3">
                      <strong>User:</strong> {viewPasswordData.Username}<br/>
                      <strong>Họ tên:</strong> {viewPasswordData.FullName}
                    </div>
                    <div className="mb-3">
                      <label className="form-label"><strong>Mật khẩu tạm hiện tại:</strong></label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={viewPasswordData.TempPassword || '(Không có mật khẩu tạm)'}
                          readOnly
                          style={{fontFamily: 'monospace', fontSize: '16px', letterSpacing: '2px'}}
                        />
                        {viewPasswordData.TempPassword && (
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => {
                              navigator.clipboard.writeText(viewPasswordData.TempPassword);
                              alert('Đã copy vào clipboard!');
                            }}
                          >
                            📋 Copy
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="alert alert-warning">
                      <strong>⚠️ Lưu ý bảo mật:</strong><br/>
                      • Đây là mật khẩu tạm được tạo khi Reset Password<br/>
                      • Chỉ Admin mới có thể xem mật khẩu này<br/>
                      • Gửi cho user qua kênh liên lạc an toàn<br/>
                      • Khuyến nghị user đổi mật khẩu sau khi đăng nhập
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
