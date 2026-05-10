import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';

function PositionMngt() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formName, setFormName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = () => {
    setLoading(true);
    fetch(`${API}/positions`)
      .then(r => r.json())
      .then(data => { setPositions(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const openAdd = () => {
    setEditId(null);
    setFormName('');
    setShowModal(true);
  };

  const openEdit = (pos) => {
    setEditId(pos.PositionID);
    setFormName(pos.PositionName);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formName.trim()) return alert('Vui lòng nhập tên chức vụ');
    setSaving(true);
    const url = editId ? `${API}/positions/${editId}` : `${API}/positions`;
    const method = editId ? 'PUT' : 'POST';
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ PositionName: formName.trim() })
    })
      .then(r => r.json())
      .then(data => {
        setSaving(false);
        if (data.status === 'success') {
          setShowModal(false);
          fetchPositions();
        } else {
          alert('Lỗi: ' + (data.msg || 'Không xác định'));
        }
      })
      .catch(err => { setSaving(false); alert('Lỗi: ' + err); });
  };

  const handleDelete = (id, name) => {
    if (!window.confirm(`Xác nhận xoá chức vụ "${name}" (ID: ${id})?`)) return;
    fetch(`${API}/positions/${id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') {
          fetchPositions();
        } else {
          alert('Lỗi: ' + (data.msg || 'Không thể xoá'));
        }
      })
      .catch(err => alert('Lỗi: ' + err));
  };

  const filtered = positions.filter(p =>
    (p.PositionName || '').toLowerCase().includes(search.toLowerCase()) ||
    String(p.PositionID).includes(search)
  );

  const posColors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="animate-fade-in">
      {/* Summary */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'rgba(79,70,229,0.1)', color: '#4f46e5'}}>💼</div>
            <div className="stat-value mt-2" style={{color: '#4f46e5'}}>{positions.length}</div>
            <div className="stat-label">Tổng Chức Vụ</div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="stat-card">
            <div className="p-2">
              <div className="stat-label mb-2">Danh sách nhanh</div>
              <div className="d-flex flex-wrap gap-1">
                {positions.slice(0, 8).map((p, i) => (
                  <span key={p.PositionID} className="badge-status" style={{
                    background: `${posColors[i % posColors.length]}15`,
                    color: posColors[i % posColors.length], fontSize: 11
                  }}>
                    {p.PositionName}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="content-card">
        <div className="card-header-custom">
          <h5>💼 Quản Lý Chức Vụ ({filtered.length})</h5>
          <div className="d-flex gap-2">
            <input
              type="text" className="form-control form-control-sm"
              placeholder="🔍 Tìm kiếm..." style={{width: 200}}
              value={search} onChange={e => setSearch(e.target.value)}
            />
            <button className="btn btn-primary-custom btn-sm" onClick={openAdd}>+ Thêm Chức Vụ</button>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-custom">
            <thead>
              <tr>
                <th>Mã CV</th>
                <th>Tên Chức Vụ</th>
                <th className="text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3" className="text-center py-4 text-muted">⏳ Đang tải...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="3" className="text-center py-4 text-muted">Chưa có dữ liệu</td></tr>
              ) : (
                filtered.map((p, i) => (
                  <tr key={p.PositionID}>
                    <td><strong>#{p.PositionID}</strong></td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: `${posColors[i % posColors.length]}15`,
                          color: posColors[i % posColors.length],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 700, flexShrink: 0
                        }}>💼</span>
                        <span className="fw-semibold">{p.PositionName}</span>
                      </div>
                    </td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-outline-warning me-1" onClick={() => openEdit(p)} title="Sửa">✏️</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p.PositionID, p.PositionName)} title="Xoá">🗑️</button>
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
                <h5 className="modal-title">{editId ? '✏️ Sửa Chức Vụ' : '➕ Thêm Chức Vụ'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <label className="form-label">Tên Chức Vụ *</label>
                <input
                  className="form-control" autoFocus
                  value={formName} onChange={e => setFormName(e.target.value)}
                  placeholder="VD: Trưởng Phòng"
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

export default PositionMngt;
