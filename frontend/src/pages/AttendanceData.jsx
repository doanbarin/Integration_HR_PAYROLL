import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';

function AttendanceData() {
  const [month, setMonth] = useState('2024-09');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const filtered = data.filter(d =>
    (d.FullName || '').toLowerCase().includes(search.toLowerCase()) ||
    String(d.EmployeeID).includes(search)
  );

  const totalPresent = filtered.reduce((s, d) => s + (d.WorkDays || 0), 0);
  const totalAbsent = filtered.reduce((s, d) => s + (d.AbsentDays || 0), 0);
  const totalLeave = filtered.reduce((s, d) => s + (d.LeaveDays || 0), 0);
  const totalAll = totalPresent + totalAbsent + totalLeave || 1;
  const attendanceRate = ((totalPresent / totalAll) * 100).toFixed(1);

  // Top nghỉ nhiều
  const sortedByAbsent = [...filtered].sort((a, b) => (b.AbsentDays + b.LeaveDays) - (a.AbsentDays + a.LeaveDays));

  return (
    <div className="animate-fade-in">
      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        {[
          { icon: '👥', value: filtered.length, label: 'Tổng NV', color: '#4f46e5', bg: 'rgba(79,70,229,0.1)' },
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

      {/* Attendance Summary Chart */}
      <div className="row g-3 mb-4">
        <div className="col-lg-4">
          <div className="content-card">
            <div className="card-header-custom"><h5>📊 Tỷ Lệ Chấm Công</h5></div>
            <div className="p-3 text-center">
              <div style={{
                width: 120, height: 120, borderRadius: '50%', margin: '0 auto',
                background: `conic-gradient(
                  #10b981 0deg ${(totalPresent/totalAll)*360}deg,
                  #f59e0b ${(totalPresent/totalAll)*360}deg ${((totalPresent+totalLeave)/totalAll)*360}deg,
                  #ef4444 ${((totalPresent+totalLeave)/totalAll)*360}deg 360deg
                )`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%', background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 16, color: '#10b981'
                }}>
                  {attendanceRate}%
                </div>
              </div>
              <div className="mt-3" style={{fontSize: 12}}>
                <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
                  <span style={{width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0}} />
                  <span>Đi làm: {totalPresent} ngày</span>
                </div>
                <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
                  <span style={{width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0}} />
                  <span>Nghỉ phép: {totalLeave} ngày</span>
                </div>
                <div className="d-flex align-items-center justify-content-center gap-2">
                  <span style={{width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0}} />
                  <span>Vắng: {totalAbsent} ngày</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="content-card">
            <div className="card-header-custom"><h5>⚠️ Top Nhân Viên Nghỉ Nhiều</h5></div>
            <div className="p-3">
              {sortedByAbsent.length === 0 ? (
                <p className="text-center text-muted py-3">Chưa có dữ liệu</p>
              ) : (
                sortedByAbsent.slice(0, 5).map((d, i) => {
                  const totalOff = (d.AbsentDays || 0) + (d.LeaveDays || 0);
                  const isWarning = totalOff > 2;
                  return (
                    <div key={d.AttendanceID} className="d-flex align-items-center gap-3 mb-2 p-2" style={{
                      background: isWarning ? 'rgba(239,68,68,0.05)' : '#f8fafc',
                      borderRadius: 10,
                      borderLeft: isWarning ? '3px solid #ef4444' : '3px solid #e2e8f0'
                    }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: isWarning ? 'rgba(239,68,68,0.1)' : 'rgba(79,70,229,0.1)',
                        color: isWarning ? '#ef4444' : '#4f46e5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700
                      }}>#{i + 1}</span>
                      <div className="flex-grow-1">
                        <strong style={{fontSize: 13}}>{d.FullName || `NV #${d.EmployeeID}`}</strong>
                        <div style={{fontSize: 11, color: '#94a3b8'}}>
                          Vắng: {d.AbsentDays} • Nghỉ phép: {d.LeaveDays}
                        </div>
                      </div>
                      <span className="badge-status" style={{
                        background: isWarning ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                        color: isWarning ? '#ef4444' : '#10b981',
                        fontSize: 11
                      }}>
                        {isWarning ? '⚠️ Cảnh báo' : '✅ Bình thường'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="content-card">
        <div className="card-header-custom">
          <h5>📅 Dữ Liệu Chấm Công ({filtered.length})</h5>
          <div className="d-flex gap-2">
            <input
              type="text" className="form-control form-control-sm"
              placeholder="🔍 Tìm theo tên, mã NV..." style={{width: 220}}
              value={search} onChange={e => setSearch(e.target.value)}
            />
            <input type="month" className="form-control form-control-sm" style={{width: 180}}
              value={month} onChange={e => setMonth(e.target.value)} />
          </div>
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
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-4 text-muted">Chưa có dữ liệu chấm công tháng {month}</td></tr>
              ) : (
                filtered.map(d => {
                  const isHighlight = (d.AbsentDays || 0) > 2;
                  return (
                    <tr key={d.AttendanceID} style={{
                      background: isHighlight ? 'rgba(239,68,68,0.04)' : 'transparent'
                    }}>
                      <td><strong>#{d.EmployeeID}</strong></td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {isHighlight && <span style={{color: '#ef4444', fontSize: 12}}>⚠️</span>}
                          {d.FullName || '---'}
                        </div>
                      </td>
                      <td>{d.AttendanceMonth}</td>
                      <td className="text-center">
                        <span className="badge-status" style={{background: 'rgba(16,185,129,0.1)', color: '#10b981'}}>
                          {d.WorkDays}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="badge-status" style={{
                          background: d.AbsentDays > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                          color: d.AbsentDays > 0 ? '#ef4444' : '#10b981'
                        }}>
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
                          <span className="badge-status" style={{background: 'rgba(239,68,68,0.1)', color: '#ef4444'}}>⚠️ Cảnh báo</span>
                        ) : (
                          <span className="badge-status" style={{background: 'rgba(245,158,11,0.1)', color: '#f59e0b'}}>Có nghỉ</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AttendanceData;
