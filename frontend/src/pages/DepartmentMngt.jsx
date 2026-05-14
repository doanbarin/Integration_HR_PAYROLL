import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';

function DepartmentMngt() {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formName, setFormName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDepartments();
    fetch(`${API}/employees`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setEmployees(data);
    }).catch(() => {});
  }, []);

  const fetchDepartments = () => {
    setLoading(true);
    fetch(`${API}/departments`)
      .then(r => r.json())
      .then(data => { setDepartments(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const countByDept = (deptName) => {
    return employees.filter(e => e.Department === deptName).length;
  };

  const openAdd = () => {
    setEditId(null);
    setFormName('');
    setShowModal(true);
  };

  const openEdit = (dept) => {
    setEditId(dept.DepartmentID);
    setFormName(dept.DepartmentName);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formName.trim()) return alert('Vui lòng nhập tên phòng ban');
    setSaving(true);
    const url = editId ? `${API}/departments/${editId}` : `${API}/departments`;
    const method = editId ? 'PUT' : 'POST';
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ DepartmentName: formName.trim() })
    })
      .then(r => r.json())
      .then(data => {
        setSaving(false);
        if (data.status === 'success') {
          setShowModal(false);
          fetchDepartments();
        } else {
          alert('Lỗi: ' + (data.msg || 'Không xác định'));
        }
      })
      .catch(err => { setSaving(false); alert('Lỗi: ' + err); });
  };

  const handleDelete = (id, name) => {
    if (!window.confirm(`Xác nhận xoá phòng ban "${name}" (ID: ${id})?`)) return;
    fetch(`${API}/departments/${id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') {
          fetchDepartments();
        } else {
          alert('Lỗi: ' + (data.msg || 'Không thể xoá'));
        }
      })
      .catch(err => alert('Lỗi: ' + err));
  };

  const filtered = departments.filter(d =>
    (d.DepartmentName || '').toLowerCase().includes(search.toLowerCase()) ||
    String(d.DepartmentID).includes(search)
  );

  const sortedDepartments = [...filtered].sort((a, b) =>
    Number(a.DepartmentID) - Number(b.DepartmentID)
  );
  const deptColors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];

  return (
    <div className="animate-fade-in">
      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'rgba(79,70,229,0.1)', color: '#4f46e5'}}>🏢</div>
            <div className="stat-value mt-2" style={{color: '#4f46e5'}}>{departments.length}</div>
            <div className="stat-label">Tổng Phòng Ban</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'rgba(16,185,129,0.1)', color: '#10b981'}}>👥</div>
            <div className="stat-value mt-2" style={{color: '#10b981'}}>{employees.length}</div>
            <div className="stat-label">Tổng Nhân Viên</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'rgba(245,158,11,0.1)', color: '#f59e0b'}}>📊</div>
            <div className="stat-value mt-2" style={{color: '#f59e0b'}}>
              {departments.length > 0 ? Math.round(employees.length / departments.length) : 0}
            </div>
            <div className="stat-label">TB NV / Phòng Ban</div>
          </div>
        </div>
      </div>

      {/* Distribution Chart */}
      {departments.length > 0 && (
        <div className="content-card mb-4">
          <div className="card-header-custom"><h5>📊 Phân Bố Nhân Viên Theo Phòng Ban</h5></div>
          <div className="p-3">
            <div style={{display: 'flex', alignItems: 'flex-end', gap: 12, height: 160, padding: '0 10px'}}>
              {departments.map((d, i) => {
                const count = countByDept(d.DepartmentName);
                const maxCount = Math.max(...departments.map(dept => countByDept(dept.DepartmentName)), 1);
                return (
                  <div key={d.DepartmentID} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
                    <span style={{fontSize: 12, fontWeight: 700, color: deptColors[i % deptColors.length]}}>{count}</span>
                    <div style={{
                      width: '100%', maxWidth: 50,
                      height: `${Math.max(20, (count / maxCount) * 120)}px`,
                      background: `linear-gradient(180deg, ${deptColors[i % deptColors.length]}, ${deptColors[i % deptColors.length]}88)`,
                      borderRadius: '6px 6px 0 0',
                      transition: 'height 0.5s ease'
                    }} />
                    <span style={{fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.2, maxWidth: 70, overflow: 'hidden'}}>
                      {d.DepartmentName.replace('Phòng ', '')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="content-card">
        <div className="card-header-custom">
          <h5>🏢 Quản Lý Phòng Ban ({filtered.length})</h5>
          <div className="d-flex gap-2">
            <input
              type="text" className="form-control form-control-sm"
              placeholder="🔍 Tìm kiếm..." style={{width: 200}}
              value={search} onChange={e => setSearch(e.target.value)}
            />
            <button className="btn btn-primary-custom btn-sm" onClick={openAdd}>+ Thêm Phòng Ban</button>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-custom">
            <thead>
              <tr>
                <th>Mã PB</th>
                <th>Tên Phòng Ban</th>
                <th className="text-center">Số Nhân Viên</th>
                <th className="text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="text-center py-4 text-muted">⏳ Đang tải...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-4 text-muted">Chưa có dữ liệu</td></tr>
              ) : (
                sortedDepartments.map((d, i) => (
                  <tr key={d.DepartmentID}>
                    <td><strong>#{d.DepartmentID}</strong></td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: deptColors[i % deptColors.length], flexShrink: 0
                        }} />
                        {d.DepartmentName}
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="badge-status" style={{background: 'rgba(79,70,229,0.1)', color: '#4f46e5'}}>
                        {countByDept(d.DepartmentName)} người
                      </span>
                    </td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-outline-warning me-1" onClick={() => openEdit(d)} title="Sửa">✏️</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(d.DepartmentID, d.DepartmentName)} title="Xoá">🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="modal d-block" style={{background: 'rgba(0,0,0,0.5)'}} onClick={() => setShowModal(false)}>
          <div className="modal-dialog modal-dialog-centered modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editId ? '✏️ Sửa Phòng Ban' : '➕ Thêm Phòng Ban'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <label className="form-label">Tên Phòng Ban *</label>
                <input
                  className="form-control" autoFocus
                  value={formName} onChange={e => setFormName(e.target.value)}
                  placeholder="VD: Phòng Kỹ Thuật"
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowModal(false)}>Huỷ</button>
                <button className="btn btn-primary-custom btn-sm" onClick={handleSave} disabled={saving}>
                  {saving ? '⏳ Đang lưu...' : (editId ? '💾 Cập Nhật' : '✅ Thêm Mới')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DepartmentMngt;
