import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';

function SalaryHistory() {
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const formatVND = (n) => n.toLocaleString('vi-VN') + ' ₫';

  useEffect(() => {
    fetch(`${API}/salaries`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setHistory(data);
        } else {
          setHistory([]);
        }
        setLoading(false);
      })
      .catch(() => { setHistory([]); setLoading(false); });
  }, []);

  const filtered = history.filter(h =>
    (h.FullName || '').toLowerCase().includes(search.toLowerCase()) ||
    (h.SalaryMonth || '').includes(search) ||
    String(h.EmployeeID).includes(search)
  );

  return (
    <div className="animate-fade-in">
      <div className="content-card">
        <div className="card-header-custom">
          <h5>📋 Lịch Sử Lương</h5>
          <div className="d-flex gap-2">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="🔍 Tìm theo tên, mã NV, tháng..."
              style={{width: 280}}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="btn btn-primary-custom btn-sm">📥 Xuất PDF</button>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-custom">
            <thead>
              <tr>
                <th>Tháng</th>
                <th>Mã NV</th>
                <th>Họ Tên</th>
                <th className="text-end">Lương Cơ Bản</th>
                <th className="text-end">Thực Lãnh</th>
                <th className="text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    ⏳ Đang tải dữ liệu từ MySQL...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    Chưa có dữ liệu lịch sử lương
                  </td>
                </tr>
              ) : (
                filtered.map((h, i) => (
                  <tr key={i}>
                    <td><span className="badge-status" style={{background: '#f0f9ff', color: '#0ea5e9'}}>{h.SalaryMonth}</span></td>
                    <td><strong>#{h.EmployeeID}</strong></td>
                    <td>{h.FullName || '---'}</td>
                    <td className="text-end">{formatVND(h.BaseSalary)}</td>
                    <td className="text-end fw-bold">{formatVND(h.NetSalary)}</td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-outline-primary">📄 Xem Phiếu</button>
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

export default SalaryHistory;
