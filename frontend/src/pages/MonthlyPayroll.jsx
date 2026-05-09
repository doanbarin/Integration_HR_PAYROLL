import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';

function MonthlyPayroll() {
  const [month, setMonth] = useState('2024-09');
  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPayslip, setShowPayslip] = useState(null);

  const formatVND = (n) => n.toLocaleString('vi-VN') + ' ₫';

  useEffect(() => {
    loadPayroll(month);
  }, [month]);

  const loadPayroll = (m) => {
    setLoading(true);
    fetch(`${API}/salaries?month=${m}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPayroll(data);
        } else {
          setPayroll([]);
        }
        setLoading(false);
      })
      .catch(() => { setPayroll([]); setLoading(false); });
  };

  const totalNet = payroll.reduce((s, p) => s + (p.NetSalary || 0), 0);

  return (
    <div className="animate-fade-in">
      {/* Summary */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'rgba(79,70,229,0.1)', color: '#4f46e5'}}>💰</div>
            <div className="stat-value mt-2" style={{color: '#4f46e5', fontSize: 22}}>
              {totalNet > 0 ? formatVND(totalNet) : '---'}
            </div>
            <div className="stat-label">Tổng Chi Lương Tháng</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'rgba(16,185,129,0.1)', color: '#10b981'}}>👥</div>
            <div className="stat-value mt-2" style={{color: '#10b981'}}>{payroll.length}</div>
            <div className="stat-label">Nhân Viên Được Trả Lương</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'rgba(245,158,11,0.1)', color: '#f59e0b'}}>📅</div>
            <div className="stat-value mt-2" style={{color: '#f59e0b'}}>{month}</div>
            <div className="stat-label">Kỳ Lương</div>
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="content-card">
        <div className="card-header-custom">
          <h5>💰 Bảng Lương Tổng Hợp</h5>
          <div className="d-flex gap-2">
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
                  <td colSpan="8" className="text-center py-4 text-muted">
                    ⏳ Đang tải dữ liệu từ MySQL...
                  </td>
                </tr>
              ) : payroll.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">
                    Chưa có dữ liệu bảng lương tháng {month}
                  </td>
                </tr>
              ) : (
                payroll.map(p => (
                  <tr key={p.SalaryID}>
                    <td><strong>#{p.EmployeeID}</strong></td>
                    <td>{p.FullName || '---'}</td>
                    <td>{p.DepartmentName || '---'}</td>
                    <td className="text-end">{formatVND(p.BaseSalary)}</td>
                    <td className="text-end text-success">{formatVND(p.Bonus)}</td>
                    <td className="text-end text-danger">{formatVND(p.Deductions)}</td>
                    <td className="text-end fw-bold">{formatVND(p.NetSalary)}</td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-outline-primary"
                        onClick={() => setShowPayslip(p)}>
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
                  <h6 className="text-muted">COMPANY X — PHIẾU LƯƠNG THÁNG {month}</h6>
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

export default MonthlyPayroll;
