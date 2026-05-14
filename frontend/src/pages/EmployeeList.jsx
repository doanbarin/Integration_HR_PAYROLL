import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmployees();
    fetch(`${API}/departments`).then(r => r.json()).then(setDepartments).catch(() => {});
  }, []);

  const fetchEmployees = () => {
    setLoading(true);
    fetch(`${API}/employees`)
      .then(res => res.json())
      .then(data => { setEmployees(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const handleDelete = (id, name) => {
    if (!window.confirm(`Xác nhận xoá nhân viên "${name}" (ID: ${id})?`)) return;
    fetch(`${API}/employees/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          alert('Xoá thành công!');
          fetchEmployees();
        } else {
          alert('Lỗi: ' + data.msg);
        }
      })
      .catch(err => alert('Lỗi: ' + err));
  };

  const filtered = employees.filter(e => {
    const searchValue = search.trim().toLowerCase();
    const fullName = (e.FullName || '').toLowerCase();
    const department = (e.Department || '').toLowerCase();
    const position = (e.Position || '').toLowerCase();
    const employeeID = String(e.EmployeeID);
    // Tìm kiếm theo tên, phòng ban, chức vụ hoặc mã nhân viên
    const matchSearch =
      fullName.includes(searchValue) || 
      department.includes(searchValue) ||
      position.includes(searchValue) ||
      employeeID.includes(searchValue) ||
      (/^[a-z][^a-z]*$/i.test(searchValue) && // nếu searchValue là một từ đơn (không chứa chữ cái nào khác), so sánh với tên đầu tiên
        fullName.split(' ')[0].startsWith(searchValue[0]));
      // Lọc theo phòng ban và trạng thái
    const matchDept = !filterDept || e.Department === filterDept;
    const matchStatus = !filterStatus || e.Status === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  const sortedEmployees = [...filtered].sort((a, b) =>
    Number(a.EmployeeID) - Number(b.EmployeeID)
  );// Sắp xếp theo EmployeeID tăng dần

  const statusStyle = (status) => ({
    background: status === 'Active' ? '#f0fdf4' : '#fef2f2',
    color: status === 'Active' ? '#16a34a' : '#dc2626'
  });

  return (
    <div className="animate-fade-in">
      <div className="content-card">
        <div className="card-header-custom">
          <h5>👥 Danh Sách Nhân Viên ({filtered.length})</h5>
          <div className="d-flex gap-2 flex-wrap">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="🔍 Tìm theo tên, phòng ban, chức vụ..."
              style={{width: 260}}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="form-select form-select-sm" style={{width: 160}}
              value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="">Tất cả phòng ban</option>
              {departments.map(d => (
                <option key={d.DepartmentID} value={d.DepartmentName}>{d.DepartmentName}</option>
              ))}
            </select>
            <select className="form-select form-select-sm" style={{width: 130}}
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <Link to="/employees/add" className="btn btn-primary-custom btn-sm">
              + Thêm Nhân Viên
            </Link>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-custom">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ Tên</th>
                <th>Phòng Ban</th>
                <th>Chức Vụ</th>
                <th>Trạng Thái</th>
                <th className="text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">⏳ Đang tải dữ liệu...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">Không tìm thấy nhân viên nào</td>
                </tr>
              ) : (
                sortedEmployees.map(emp => (// Sử dụng sortedEmployees để hiển thị danh sách đã được sắp xếp
                  <tr key={emp.EmployeeID}>
                    <td><strong>#{emp.EmployeeID}</strong></td>
                    <td>
                      <Link to={`/employees/${emp.EmployeeID}`} className="text-decoration-none fw-semibold">
                        {emp.FullName}
                      </Link>
                    </td>
                    <td>{emp.Department || '—'}</td>
                    <td>{emp.Position || '—'}</td>
                    <td>
                      <span className="badge-status" style={statusStyle(emp.Status || 'Active')}>
                        ● {emp.Status || 'Active'}
                      </span>
                    </td>
                    <td className="text-center">
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => navigate(`/employees/${emp.EmployeeID}`)}
                        title="Xem chi tiết"
                      >👁️</button>
                      <button
                        className="btn btn-sm btn-outline-warning me-1"
                        onClick={() => navigate(`/employees/edit/${emp.EmployeeID}`)}
                        title="Sửa"
                      >✏️</button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(emp.EmployeeID, emp.FullName)}
                        title="Xoá"
                      >🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default EmployeeList;
