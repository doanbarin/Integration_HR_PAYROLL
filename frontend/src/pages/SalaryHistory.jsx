import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';

function SalaryHistory() {
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEmp, setFilterEmp] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [showPayslip, setShowPayslip] = useState(null);
  const formatVND = (n) => Number(n).toLocaleString('vi-VN') + ' ₫';

  useEffect(() => {
    Promise.all([
      fetch(`${API}/salaries`).then(r => r.json()).catch(() => []),
      fetch(`${API}/employees`).then(r => r.json()).catch(() => []),
    ]).then(([sal, emp]) => {
      if (Array.isArray(sal)) setHistory(sal);
      if (Array.isArray(emp)) setEmployees(emp);
      setLoading(false);
    });
  }, []);

  const filtered = history.filter(h => {
    const matchSearch =
      (h.FullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (h.SalaryMonth || '').includes(search) ||
      String(h.EmployeeID).includes(search);
    const matchEmp = !filterEmp || String(h.EmployeeID) === filterEmp;
    const matchDept = !filterDept || (h.DepartmentName || '') === filterDept;
    return matchSearch && matchEmp && matchDept;
  });

  // Summary
  const totalSalary = filtered.reduce((s, h) => s + (h.NetSalary || 0), 0);
  const avgSalary = filtered.length > 0 ? Math.round(totalSalary / filtered.length) : 0;

  // Salary chart by month
  const salaryByMonth = {};
  filtered.forEach(s => {
    const m = (s.SalaryMonth || '').substring(0, 7);
    if (m) salaryByMonth[m] = (salaryByMonth[m] || 0) + (s.NetSalary || 0);
  });
  const chartEntries = Object.entries(salaryByMonth).sort();
  const maxSalary = Math.max(...Object.values(salaryByMonth), 1);
  const chartColors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];

  // Unique departments and employees for filter
  const uniqueEmps = [...new Map(history.map(h => [h.EmployeeID, { id: h.EmployeeID, name: h.FullName }])).values()];
  const uniqueDepts = [...new Set(history.map(h => h.DepartmentName).filter(Boolean))];

  return (
    <div className="animate-fade-in">
      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'rgba(79,70,229,0.1)', color: '#4f46e5'}}>💰</div>
            <div className="stat-value mt-2" style={{color: '#4f46e5', fontSize: totalSalary > 999999999 ? 18 : 22}}>
              {totalSalary > 0 ? formatVND(totalSalary) : '---'}
            </div>
            <div className="stat-label">Tổng Chi Lương</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'rgba(14,165,233,0.1)', color: '#0ea5e9'}}>📊</div>
            <div className="stat-value mt-2" style={{color: '#0ea5e9', fontSize: avgSalary > 99999999 ? 18 : 22}}>
              {avgSalary > 0 ? formatVND(avgSalary) : '---'}
            </div>
            <div className="stat-label">Lương Trung Bình</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'rgba(16,185,129,0.1)', color: '#10b981'}}>📋</div>
            <div className="stat-value mt-2" style={{color: '#10b981'}}>{filtered.length}</div>
            <div className="stat-label">Phiếu Lương</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'rgba(245,158,11,0.1)', color: '#f59e0b'}}>📅</div>
            <div className="stat-value mt-2" style={{color: '#f59e0b'}}>{chartEntries.length}</div>
            <div className="stat-label">Kỳ Lương</div>
          </div>
        </div>
      </div>

      {/* Salary Chart */}
      {chartEntries.length > 0 && (
        <div className="content-card mb-4">
          <div className="card-header-custom"><h5>📈 Biểu Đồ Lương Theo Thời Gian</h5></div>
          <div className="p-3">
            <div style={{display: 'flex', alignItems: 'flex-end', gap: 8, height: 200, padding: '0 10px'}}>
              {chartEntries.map(([month, total], i) => (
                <div key={month} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
                  <span style={{fontSize: 9, color: '#64748b', fontWeight: 600}}>
                    {formatVND(total).replace(' ₫', '')}
                  </span>
                  <div style={{
                    width: '100%', maxWidth: 60,
                    height: `${Math.max(20, (total / maxSalary) * 160)}px`,
                    background: `linear-gradient(180deg, ${chartColors[i % chartColors.length]} 0%, ${chartColors[i % chartColors.length]}88 100%)`,
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.5s ease'
                  }} />
                  <span style={{fontSize: 10, color: '#94a3b8', fontWeight: 500}}>{month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="content-card">
        <div className="card-header-custom">
          <h5>📋 Lịch Sử Lương ({filtered.length})</h5>
          <div className="d-flex gap-2 flex-wrap">
            <input
              type="text" className="form-control form-control-sm"
              placeholder="🔍 Tìm theo tên, mã NV, tháng..."
              style={{width: 240}}
              value={search} onChange={e => setSearch(e.target.value)}
            />
            <select className="form-select form-select-sm" style={{width: 160}}
              value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
              <option value="">Tất cả NV</option>
              {uniqueEmps.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name || `NV #${emp.id}`}</option>
              ))}
            </select>
            <select className="form-select form-select-sm" style={{width: 160}}
              value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="">Tất cả PB</option>
              {uniqueDepts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
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
                <th>Phòng Ban</th>
                <th className="text-end">Lương Cơ Bản</th>
                <th className="text-end">Phụ Cấp</th>
                <th className="text-end">Khấu Trừ</th>
                <th className="text-end">Thực Lãnh</th>
                <th className="text-center">Phiếu Lương</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-muted">⏳ Đang tải dữ liệu từ MySQL...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-muted">Chưa có dữ liệu lịch sử lương</td>
                </tr>
              ) : (
                filtered.map((h, i) => (
                  <tr key={i}>
                    <td>
                      <span className="badge-status" style={{background: '#f0f9ff', color: '#0ea5e9'}}>
                        {(h.SalaryMonth || '').substring(0, 7)}
                      </span>
                    </td>
                    <td><strong>#{h.EmployeeID}</strong></td>
                    <td>{h.FullName || '---'}</td>
                    <td>{h.DepartmentName || '---'}</td>
                    <td className="text-end">{formatVND(h.BaseSalary)}</td>
                    <td className="text-end text-success">{formatVND(h.Bonus)}</td>
                    <td className="text-end text-danger">{formatVND(h.Deductions)}</td>
                    <td className="text-end fw-bold">{formatVND(h.NetSalary)}</td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => setShowPayslip(h)}>
                        📄 Xem
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip Modal */}
      {showPayslip && (
        <div className="modal d-block" style={{background: 'rgba(0,0,0,0.5)'}} onClick={() => setShowPayslip(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">📄 Phiếu Lương — {showPayslip.FullName}</h5>
                <button className="btn-close" onClick={() => setShowPayslip(null)}></button>
              </div>
              <div className="modal-body">
                <div className="text-center mb-3">
                  <h6 className="text-muted">COMPANY X — PHIẾU LƯƠNG THÁNG {(showPayslip.SalaryMonth || '').substring(0, 7)}</h6>
                </div>
                <table className="table table-sm">
                  <tbody>
                    <tr><td>Mã nhân viên</td><td className="text-end fw-bold">#{showPayslip.EmployeeID}</td></tr>
                    <tr><td>Họ tên</td><td className="text-end fw-bold">{showPayslip.FullName}</td></tr>
                    <tr><td>Phòng ban</td><td className="text-end">{showPayslip.DepartmentName || '---'}</td></tr>
                    <tr><td>Lương cơ bản</td><td className="text-end">{formatVND(showPayslip.BaseSalary)}</td></tr>
                    <tr><td>Phụ cấp</td><td className="text-end text-success">+{formatVND(showPayslip.Bonus)}</td></tr>
                    <tr><td>Khấu trừ</td><td className="text-end text-danger">-{formatVND(showPayslip.Deductions)}</td></tr>
                    <tr style={{borderTop: '2px solid #000'}}>
                      <td><strong>THỰC LÃNH</strong></td>
                      <td className="text-end fw-bold" style={{color: '#4f46e5', fontSize: 18}}>
                        {formatVND(showPayslip.NetSalary)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowPayslip(null)}>Đóng</button>
                <button className="btn btn-primary-custom btn-sm">📥 Xuất PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalaryHistory;
