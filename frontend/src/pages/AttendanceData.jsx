import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';

function AttendanceData() {
  const [month, setMonth] = useState('2024-09');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendance(month);
  }, [month]);

  const loadAttendance = (m) => {
    setLoading(true);
    fetch(`${API}/attendance?month=${m}`)
      .then(r => r.json())
      .then(result => {
        if (Array.isArray(result)) {
          setData(result);
        } else {
          setData([]);
        }
        setLoading(false);
      })
      .catch(() => { setData([]); setLoading(false); });
  };

  const totalPresent = data.reduce((s, d) => s + (d.WorkDays || 0), 0);
  const totalAbsent = data.reduce((s, d) => s + (d.AbsentDays || 0), 0);
  const totalLeave = data.reduce((s, d) => s + (d.LeaveDays || 0), 0);

  return (
    <div className="animate-fade-in">
      <div className="row g-3 mb-4">
        {[
          { icon: '👥', value: data.length, label: 'Tổng NV', color: '#4f46e5', bg: 'rgba(79,70,229,0.1)' },
          { icon: '✅', value: totalPresent, label: 'Tổng Ngày Công', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { icon: '❌', value: totalAbsent, label: 'Tổng Ngày Vắng', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
          { icon: '📋', value: totalLeave, label: 'Tổng Ngày Nghỉ', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        ].map((c, i) => (
          <div className="col-md-3" key={i}>
            <div className="stat-card">
              <div className="stat-icon" style={{background: c.bg, color: c.color}}>{c.icon}</div>
              <div className="stat-value mt-2" style={{color: c.color}}>{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="content-card">
        <div className="card-header-custom">
          <h5>📅 Dữ Liệu Chấm Công</h5>
          <input type="month" className="form-control form-control-sm" style={{width: 180}}
            value={month} onChange={e => setMonth(e.target.value)} />
        </div>
        <div className="table-responsive">
          <table className="table table-custom">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ Tên</th>
                <th>Tháng</th>
                <th className="text-center">Ngày Công</th>
                <th className="text-center">Ngày Vắng</th>
                <th className="text-center">Ngày Nghỉ</th>
                <th className="text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-4 text-muted">⏳ Đang tải dữ liệu từ MySQL...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-4 text-muted">Chưa có dữ liệu chấm công tháng {month}</td></tr>
              ) : (
                data.map(d => (
                  <tr key={d.AttendanceID}>
                    <td><strong>#{d.EmployeeID}</strong></td>
                    <td>{d.FullName || '---'}</td>
                    <td>{d.AttendanceMonth}</td>
                    <td className="text-center">
                      <span className="badge-status" style={{background: 'rgba(16,185,129,0.1)', color: '#10b981'}}>
                        {d.WorkDays}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="badge-status" style={{background: d.AbsentDays > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: d.AbsentDays > 0 ? '#ef4444' : '#10b981'}}>
                        {d.AbsentDays}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="badge-status" style={{background: 'rgba(245,158,11,0.1)', color: '#f59e0b'}}>
                        {d.LeaveDays}
                      </span>
                    </td>
                    <td className="text-center">
                      {d.AbsentDays === 0 && d.LeaveDays === 0 ? (
                        <span className="badge-status" style={{background: 'rgba(16,185,129,0.1)', color: '#10b981'}}>Đầy đủ</span>
                      ) : d.AbsentDays > 2 ? (
                        <span className="badge-status" style={{background: 'rgba(239,68,68,0.1)', color: '#ef4444'}}>Cảnh báo</span>
                      ) : (
                        <span className="badge-status" style={{background: 'rgba(245,158,11,0.1)', color: '#f59e0b'}}>Có nghỉ</span>
                      )}
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

export default AttendanceData;
