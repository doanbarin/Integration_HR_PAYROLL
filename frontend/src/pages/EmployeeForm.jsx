import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

function EmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    FullName: '', DateOfBirth: '', Gender: 'Male',
    PhoneNumber: '', Email: '', HireDate: '',
    DepartmentID: '', PositionID: '', Status: 'Active'
  });
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`${API}/departments`).then(r => r.json()).then(setDepartments).catch(() => {});
    fetch(`${API}/positions`).then(r => r.json()).then(setPositions).catch(() => {});

    if (isEdit) {
      fetch(`${API}/employees/${id}`)
        .then(r => r.json())
        .then(data => {
          setForm({
            FullName: data.FullName || '',
            DateOfBirth: data.DateOfBirth ? data.DateOfBirth.split('T')[0] : '',
            Gender: data.Gender || 'Male',
            PhoneNumber: data.PhoneNumber || '',
            Email: data.Email || '',
            HireDate: data.HireDate ? data.HireDate.split('T')[0] : '',
            DepartmentID: data.DepartmentID || '',
            PositionID: data.PositionID || '',
            Status: data.Status || 'Active'
          });
        })
        .catch(() => {});
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    const url = isEdit ? `${API}/employees/${id}` : `${API}/employees`;
    const method = isEdit ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
      .then(r => r.json())
      .then(data => {
        setLoading(false);
        if (data.status === 'success') {
          alert(data.msg);
          navigate('/employees');
        } else {
          setMsg(data.msg || 'Có lỗi xảy ra');
        }
      })
      .catch(err => { setLoading(false); setMsg(String(err)); });
  };

  return (
    <div className="animate-fade-in">
      <div className="content-card">
        <div className="card-header-custom">
          <h5>{isEdit ? '✏️ Sửa Thông Tin Nhân Viên' : '➕ Thêm Nhân Viên Mới'}</h5>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/employees')}>
            ← Quay lại
          </button>
        </div>
        <div className="p-4">
          {msg && <div className="alert alert-danger py-2" style={{borderRadius: 10}}>{msg}</div>}

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Họ và Tên *</label>
                <input className="form-control" name="FullName" value={form.FullName}
                  onChange={handleChange} required placeholder="Nguyễn Văn A" />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email *</label>
                <input className="form-control" name="Email" type="email" value={form.Email}
                  onChange={handleChange} required placeholder="email@companyx.com" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Ngày Sinh</label>
                <input className="form-control" name="DateOfBirth" type="date" value={form.DateOfBirth}
                  onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Giới Tính</label>
                <select className="form-select" name="Gender" value={form.Gender} onChange={handleChange}>
                  <option value="Male">Nam</option>
                  <option value="Female">Nữ</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Số Điện Thoại</label>
                <input className="form-control" name="PhoneNumber" value={form.PhoneNumber}
                  onChange={handleChange} placeholder="0901234567" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Ngày Vào Làm</label>
                <input className="form-control" name="HireDate" type="date" value={form.HireDate}
                  onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Phòng Ban</label>
                <select className="form-select" name="DepartmentID" value={form.DepartmentID} onChange={handleChange}>
                  <option value="">-- Chọn --</option>
                  {departments.map(d => (
                    <option key={d.DepartmentID} value={d.DepartmentID}>{d.DepartmentName}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Chức Vụ</label>
                <select className="form-select" name="PositionID" value={form.PositionID} onChange={handleChange}>
                  <option value="">-- Chọn --</option>
                  {positions.map(p => (
                    <option key={p.PositionID} value={p.PositionID}>{p.PositionName}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Trạng Thái</label>
                <select className="form-select" name="Status" value={form.Status} onChange={handleChange}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="mt-4 d-flex gap-2">
              <button className="btn btn-primary-custom" type="submit" disabled={loading}>
                {loading ? '⏳ Đang lưu...' : (isEdit ? '💾 Cập Nhật' : '✅ Thêm Mới')}
              </button>
              <button className="btn btn-outline-secondary" type="button" onClick={() => navigate('/employees')}>
                Huỷ
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EmployeeForm;
