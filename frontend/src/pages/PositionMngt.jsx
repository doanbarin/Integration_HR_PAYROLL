import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';

function PositionMngt() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/positions`)
      .then(r => r.json())
      .then(data => { setPositions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="content-card">
        <div className="card-header-custom">
          <h5>💼 Quản Lý Chức Vụ</h5>
          <button className="btn btn-primary-custom btn-sm">+ Thêm Chức Vụ</button>
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
              ) : positions.length === 0 ? (
                <tr><td colSpan="3" className="text-center py-4 text-muted">Chưa có dữ liệu</td></tr>
              ) : (
                positions.map(p => (
                  <tr key={p.PositionID}>
                    <td><strong>#{p.PositionID}</strong></td>
                    <td>{p.PositionName}</td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-outline-warning me-1">✏️</button>
                      <button className="btn btn-sm btn-outline-danger">🗑️</button>
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

export default PositionMngt;
