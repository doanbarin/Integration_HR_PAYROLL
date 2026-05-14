import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API = 'http://localhost:5000/api';

function ReportCenter() {
  const [activeReport, setActiveReport] = useState('hr');
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [dividends, setDividends] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatVND = (n) => Number(n).toLocaleString('vi-VN') + ' ₫';
  const deptColors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];

  useEffect(() => {
    Promise.all([
      fetch(`${API}/employees`).then(r => r.json()).catch(() => []),
      fetch(`${API}/departments`).then(r => r.json()).catch(() => []),
      fetch(`${API}/salaries`).then(r => r.json()).catch(() => []),
      fetch(`${API}/attendance`).then(r => r.json()).catch(() => []),
      fetch(`${API}/dividends`).then(r => r.json()).catch(() => []),
    ]).then(([emp, dept, sal, att, div]) => {
      // Deduplicate to avoid duplicate rows from SQL JOINs
      if (Array.isArray(emp)) {
        const seen = new Set();
        setEmployees(emp.filter(e => {
          const key = e.EmployeeID;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }));
      }
      if (Array.isArray(dept)) setDepartments(dept);
      if (Array.isArray(sal)) {
        const seen = new Set();
        setSalaries(sal.filter(s => {
          const key = `${s.EmployeeID}_${s.SalaryMonth}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }));
      }
      if (Array.isArray(att)) {
        const seen = new Set();
        setAttendance(att.filter(a => {
          const key = `${a.EmployeeID}_${a.AttendanceMonth}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }));
      }
      if (Array.isArray(div)) {
        const seen = new Set();
        setDividends(div.filter(d => {
          const key = d.DividendID;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }));
      }
      setLoading(false);
    });
  }, []);

  const reports = [
    { key: 'hr', icon: '👥', title: 'Báo Cáo Nhân Sự', desc: 'Số lượng NV, theo phòng ban, trạng thái', role: 'HR Manager' },
    { key: 'payroll', icon: '💰', title: 'Báo Cáo Lương', desc: 'Tổng lương, lương trung bình, theo PB', role: 'Payroll Manager' },
    { key: 'attendance', icon: '📅', title: 'Báo Cáo Chấm Công', desc: 'Tỷ lệ nghỉ, top nghỉ nhiều', role: 'Admin' },
    { key: 'dividend', icon: '📊', title: 'Báo Cáo Cổ Tức', desc: 'Tổng cổ tức, theo nhân viên', role: 'Admin' },
  ];

  // HR report data
  const empByDept = {};
  employees.forEach(e => {
    const d = e.Department || 'Chưa phân bổ';
    empByDept[d] = (empByDept[d] || 0) + 1;
  });
  const activeCount = employees.filter(e => (e.Status || 'Active') === 'Active').length;
  const inactiveCount = employees.length - activeCount;

  // Payroll report data
  const totalSalary = salaries.reduce((s, r) => s + (r.NetSalary || 0), 0);
  const avgSalary = salaries.length > 0 ? Math.round(totalSalary / salaries.length) : 0;
  const salaryByDept = {};
  salaries.forEach(s => {
    const d = s.DepartmentName || 'Khác';
    salaryByDept[d] = (salaryByDept[d] || 0) + (s.NetSalary || 0);
  });
  const maxDeptSalary = Math.max(...Object.values(salaryByDept), 1);

  // Attendance report data
  const totalWorkDays = attendance.reduce((s, a) => s + (a.WorkDays || 0), 0);
  const totalAbsent = attendance.reduce((s, a) => s + (a.AbsentDays || 0), 0);
  const totalLeave = attendance.reduce((s, a) => s + (a.LeaveDays || 0), 0);
  const leaveRate = totalWorkDays + totalAbsent + totalLeave > 0
    ? ((totalAbsent + totalLeave) / (totalWorkDays + totalAbsent + totalLeave) * 100).toFixed(1)
    : 0;

  // Top absent employees
  const absentByEmp = {};
  attendance.forEach(a => {
    const key = a.EmployeeID;
    if (!absentByEmp[key]) absentByEmp[key] = { id: key, name: a.FullName || `NV #${key}`, total: 0 };
    absentByEmp[key].total += (a.AbsentDays || 0) + (a.LeaveDays || 0);
  });
  const topAbsent = Object.values(absentByEmp).sort((a, b) => b.total - a.total).slice(0, 5);

  // Dividend report data
  const totalDividend = dividends.reduce((s, d) => s + (d.DividendAmount || 0), 0);
  const avgDividend = dividends.length > 0 ? Math.round(totalDividend / dividends.length) : 0;
  
  const divByDept = {};
  dividends.forEach(d => {
    const deptName = d.DepartmentName || 'Khác';
    divByDept[deptName] = (divByDept[deptName] || 0) + (d.DividendAmount || 0);
  });
  const maxDivDept = Math.max(...Object.values(divByDept), 1);

  // ===== EXPORT HELPERS =====

  const getReportData = () => {
    const today = new Date().toLocaleDateString('vi-VN');
    if (activeReport === 'hr') {
      const headers = ['Ma NV', 'Ho Ten', 'Phong Ban', 'Chuc Vu', 'Trang Thai'];
      const rows = employees.map(e => [
        e.EmployeeID,
        e.FullName || '',
        e.Department || 'Chua phan bo',
        e.Position || '',
        e.Status || 'Active'
      ]);
      // Summary rows
      const summary = [
        [],
        ['TONG KET'],
        ['Tong nhan vien', employees.length],
        ['Dang lam viec', activeCount],
        ['Nghi viec', inactiveCount],
        [],
        ['NHAN VIEN THEO PHONG BAN'],
        ...Object.entries(empByDept).map(([dept, count]) => [dept, count])
      ];
      return { headers, rows, summary, title: 'Bao Cao Nhan Su', date: today };
    }
    if (activeReport === 'payroll') {
      const headers = ['Ma NV', 'Ho Ten', 'Phong Ban', 'Thang', 'Luong Co Ban', 'Phu Cap', 'Khau Tru', 'Thuc Lanh'];
      const rows = salaries.map(s => [
        s.EmployeeID,
        s.FullName || '',
        s.DepartmentName || '',
        String(s.SalaryMonth || '').substring(0, 7),
        s.BaseSalary || 0,
        s.Bonus || 0,
        s.Deductions || 0,
        s.NetSalary || 0
      ]);
      const summary = [
        [],
        ['TONG KET'],
        ['Tong chi luong', totalSalary],
        ['Luong trung binh', avgSalary],
        ['So phieu luong', salaries.length],
        [],
        ['LUONG THEO PHONG BAN'],
        ...Object.entries(salaryByDept).map(([dept, total]) => [dept, total])
      ];
      return { headers, rows, summary, title: 'Bao Cao Luong', date: today };
    }
    if (activeReport === 'attendance') {
      const headers = ['Ma NV', 'Ho Ten', 'Thang', 'Ngay Cong', 'Ngay Vang', 'Ngay Nghi'];
      const rows = attendance.map(a => [
        a.EmployeeID,
        a.FullName || '',
        String(a.AttendanceMonth || '').substring(0, 7),
        a.WorkDays || 0,
        a.AbsentDays || 0,
        a.LeaveDays || 0
      ]);
      const summary = [
        [],
        ['TONG KET'],
        ['Tong ngay cong', totalWorkDays],
        ['Tong ngay vang', totalAbsent],
        ['Tong ngay nghi', totalLeave],
        ['Ty le nghi', leaveRate + '%'],
        [],
        ['TOP NHAN VIEN NGHI NHIEU'],
        ['Ma NV', 'Ho Ten', 'Tong Ngay Nghi/Vang'],
        ...topAbsent.map(e => [e.id, e.name, e.total])
      ];
      return { headers, rows, summary, title: 'Bao Cao Cham Cong', date: today };
    }
    if (activeReport === 'dividend') {
      const headers = ['Ma NV', 'Ho Ten', 'Phong Ban', 'Ngay Nhan', 'So Tien (VND)'];
      const rows = dividends.map(d => [
        d.EmployeeID,
        d.FullName || '',
        d.DepartmentName || '',
        d.DividendDate || '',
        d.DividendAmount || 0
      ]);
      const summary = [
        [],
        ['TONG KET'],
        ['Tong tien co tuc', totalDividend],
        ['Trung binh', avgDividend],
        ['So luot nhan', dividends.length],
        [],
        ['CO TUC THEO PHONG BAN'],
        ...Object.entries(divByDept).map(([dept, total]) => [dept, total])
      ];
      return { headers, rows, summary, title: 'Bao Cao Co Tuc', date: today };
    }
    return null;
  };

  const handleExportExcel = () => {
    const data = getReportData();
    if (!data) {
      alert('Bao cao nay chua co du lieu de xuat.');
      return;
    }
    const { headers, rows, summary, title } = data;

    const wsData = [
      [title.toUpperCase()],
      ['Ngay xuat: ' + data.date],
      [],
      headers,
      ...rows,
      ...summary
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = headers.map((_, i) => ({ wch: i === 1 ? 25 : 18 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title);
    XLSX.writeFile(wb, `${title.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportPDF = () => {
    const data = getReportData();
    if (!data) {
      alert('Bao cao nay chua co du lieu de xuat.');
      return;
    }
    const { headers, rows, title } = data;

    const doc = new jsPDF({ orientation: headers.length > 6 ? 'landscape' : 'portrait' });

    // Title
    doc.setFontSize(16);
    doc.text(title.toUpperCase(), 14, 20);

    doc.setFontSize(10);
    doc.text('Ngay xuat: ' + data.date, 14, 28);

    // Main table
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 35,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 },
    });

    // Summary section
    const tableEndY = (doc.lastAutoTable && doc.lastAutoTable.finalY)
      ? doc.lastAutoTable.finalY + 10
      : 50;
    doc.setFontSize(11);
    doc.text('TONG KET', 14, tableEndY);

    if (activeReport === 'hr') {
      doc.setFontSize(9);
      doc.text('Tong nhan vien: ' + employees.length, 14, tableEndY + 7);
      doc.text('Dang lam viec: ' + activeCount, 14, tableEndY + 13);
      doc.text('Nghi viec: ' + inactiveCount, 14, tableEndY + 19);
    } else if (activeReport === 'payroll') {
      doc.setFontSize(9);
      doc.text('Tong chi luong: ' + Number(totalSalary).toLocaleString('vi-VN') + ' VND', 14, tableEndY + 7);
      doc.text('Luong trung binh: ' + Number(avgSalary).toLocaleString('vi-VN') + ' VND', 14, tableEndY + 13);
      doc.text('So phieu luong: ' + salaries.length, 14, tableEndY + 19);
    } else if (activeReport === 'attendance') {
      doc.setFontSize(9);
      doc.text('Tong ngay cong: ' + totalWorkDays, 14, tableEndY + 7);
      doc.text('Tong ngay vang: ' + totalAbsent, 14, tableEndY + 13);
      doc.text('Tong ngay nghi: ' + totalLeave, 14, tableEndY + 19);
      doc.text('Ty le nghi: ' + leaveRate + '%', 14, tableEndY + 25);
    } else if (activeReport === 'dividend') {
      doc.setFontSize(9);
      doc.text('Tong tien co tuc: ' + Number(totalDividend).toLocaleString('vi-VN') + ' VND', 14, tableEndY + 7);
      doc.text('Trung binh: ' + Number(avgDividend).toLocaleString('vi-VN') + ' VND', 14, tableEndY + 13);
      doc.text('So luot nhan: ' + dividends.length, 14, tableEndY + 19);
    }

    doc.save(`${title.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) return <div className="text-center py-5 text-muted">⏳ Đang tải dữ liệu báo cáo...</div>;

  return (
    <div className="animate-fade-in">
      {/* Report Type Cards */}
      <div className="row g-3 mb-4">
        {reports.map(r => (
          <div className="col-md-6 col-xl-3" key={r.key}>
            <div className="stat-card" style={{
              cursor: 'pointer',
              border: activeReport === r.key ? '2px solid var(--primary)' : '1px solid var(--border-color)'
            }} onClick={() => setActiveReport(r.key)}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{r.icon}</div>
              <h6 style={{ fontWeight: 700, fontSize: 14 }}>{r.title}</h6>
              <p className="text-muted mb-1" style={{ fontSize: 12 }}>{r.desc}</p>
              <span className="badge-status" style={{ background: 'rgba(79,70,229,0.1)', color: '#4f46e5', fontSize: 10 }}>{r.role}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Report Content */}
      <div className="content-card">
        <div className="card-header-custom">
          <h5>📈 {reports.find(r => r.key === activeReport)?.title}</h5>
          <div className="d-flex gap-2">
            <button className="btn btn-primary-custom btn-sm" onClick={handleExportExcel}>📥 Xuất Excel</button>
            <button className="btn btn-outline-secondary btn-sm" onClick={handleExportPDF}>📄 Xuất PDF</button>
          </div>
        </div>
        <div className="p-4">
          {/* HR Report */}
          {activeReport === 'hr' && (
            <div>
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{ color: '#4f46e5' }}>{employees.length}</div>
                    <div className="stat-label">Tổng Nhân Viên</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{ color: '#10b981' }}>{activeCount}</div>
                    <div className="stat-label">Đang Làm Việc</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{ color: '#ef4444' }}>{inactiveCount}</div>
                    <div className="stat-label">Nghỉ Việc</div>
                  </div>
                </div>
              </div>
              <h6 className="mb-3 fw-bold">Nhân Viên Theo Phòng Ban</h6>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, padding: '0 10px' }}>
                {Object.entries(empByDept).map(([dept, count], i) => {
                  const maxCount = Math.max(...Object.values(empByDept), 1);
                  return (
                    <div key={dept} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: deptColors[i % deptColors.length] }}>{count}</span>
                      <div style={{
                        width: '100%', maxWidth: 50,
                        height: `${(count / maxCount) * 150}px`,
                        background: deptColors[i % deptColors.length],
                        borderRadius: '6px 6px 0 0', minHeight: 20
                      }} />
                      <span style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.2, maxWidth: 70, overflow: 'hidden' }}>
                        {dept.replace('Phòng ', '')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payroll Report */}
          {activeReport === 'payroll' && (
            <div>
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{ color: '#10b981', fontSize: 20 }}>{formatVND(totalSalary)}</div>
                    <div className="stat-label">Tổng Chi Lương</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{ color: '#0ea5e9', fontSize: 20 }}>{formatVND(avgSalary)}</div>
                    <div className="stat-label">Lương Trung Bình</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{ color: '#4f46e5' }}>{salaries.length}</div>
                    <div className="stat-label">Phiếu Lương</div>
                  </div>
                </div>
              </div>
              <h6 className="mb-3 fw-bold">Lương Theo Phòng Ban</h6>
              {Object.entries(salaryByDept).map(([dept, total], i) => (
                <div key={dept} className="mb-3">
                  <div className="d-flex justify-content-between mb-1" style={{ fontSize: 12 }}>
                    <span className="fw-semibold">{dept}</span>
                    <span style={{ color: '#64748b' }}>{formatVND(total)}</span>
                  </div>
                  <div style={{ height: 10, background: '#f1f5f9', borderRadius: 5 }}>
                    <div style={{
                      height: '100%', borderRadius: 5,
                      width: `${(total / maxDeptSalary) * 100}%`,
                      background: `linear-gradient(90deg, ${deptColors[i % deptColors.length]}, ${deptColors[i % deptColors.length]}88)`
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Attendance Report */}
          {activeReport === 'attendance' && (
            <div>
              <div className="row g-3 mb-4">
                <div className="col-md-3">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{ color: '#10b981' }}>{totalWorkDays}</div>
                    <div className="stat-label">Tổng Ngày Công</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{ color: '#ef4444' }}>{totalAbsent}</div>
                    <div className="stat-label">Tổng Ngày Vắng</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{ color: '#f59e0b' }}>{totalLeave}</div>
                    <div className="stat-label">Tổng Ngày Nghỉ</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{ color: '#4f46e5' }}>{leaveRate}%</div>
                    <div className="stat-label">Tỷ Lệ Nghỉ</div>
                  </div>
                </div>
              </div>
              <h6 className="mb-3 fw-bold">🔴 Top Nhân Viên Nghỉ Nhiều</h6>
              <table className="table table-custom">
                <thead>
                  <tr>
                    <th>Hạng</th><th>Mã NV</th><th>Họ Tên</th>
                    <th className="text-center">Tổng Ngày Nghỉ/Vắng</th>
                    <th>Mức Độ</th>
                  </tr>
                </thead>
                <tbody>
                  {topAbsent.length === 0 ? (
                    <tr><td colSpan="5" className="text-center text-muted py-3">Chưa có dữ liệu</td></tr>
                  ) : (
                    topAbsent.map((e, i) => (
                      <tr key={e.id}>
                        <td><strong>#{i + 1}</strong></td>
                        <td>#{e.id}</td>
                        <td>{e.name}</td>
                        <td className="text-center fw-bold">{e.total}</td>
                        <td>
                          <span className="badge-status" style={{
                            background: e.total > 4 ? '#fef2f2' : e.total > 2 ? '#fefce8' : '#f0fdf4',
                            color: e.total > 4 ? '#dc2626' : e.total > 2 ? '#ca8a04' : '#16a34a'
                          }}>
                            {e.total > 4 ? '⚠️ Cảnh báo' : e.total > 2 ? '⚡ Lưu ý' : '✅ Bình thường'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Dividend Report */}
          {activeReport === 'dividend' && (
            <div>
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{ color: '#8b5cf6' }}>{formatVND(totalDividend)}</div>
                    <div className="stat-label">Tổng Tiền Cổ Tức</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{ color: '#06b6d4' }}>{formatVND(avgDividend)}</div>
                    <div className="stat-label">Trung Bình/Lượt</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="stat-card text-center">
                    <div className="stat-value" style={{ color: '#10b981' }}>{dividends.length}</div>
                    <div className="stat-label">Số Lượt Nhận</div>
                  </div>
                </div>
              </div>

              <div className="row g-4">
                <div className="col-lg-6">
                  <h6 className="mb-3 fw-bold">📉 Phân Bổ Cổ Tức Theo Phòng Ban</h6>
                  <div className="bg-light p-3 rounded" style={{ border: '1px solid #e2e8f0' }}>
                    {Object.entries(divByDept).map(([dept, total], i) => (
                      <div key={dept} className="mb-3">
                        <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.85rem' }}>
                          <span className="fw-medium text-dark">{dept}</span>
                          <span className="text-muted">{formatVND(total)}</span>
                        </div>
                        <div className="progress" style={{ height: 6 }}>
                          <div
                            className="progress-bar"
                            style={{
                              width: `${(total / maxDivDept) * 100}%`,
                              background: deptColors[i % deptColors.length]
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-lg-6">
                  <h6 className="mb-3 fw-bold">📋 Danh Sách Nhận Cổ Tức Mới Nhất</h6>
                  <div className="table-responsive">
                    <table className="table table-custom">
                      <thead>
                        <tr>
                          <th>Mã NV</th>
                          <th>Họ Tên</th>
                          <th>Phòng Ban</th>
                          <th>Ngày</th>
                          <th className="text-end">Số Tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dividends.slice(0, 10).map((d) => (
                          <tr key={d.DividendID}>
                            <td>#{d.EmployeeID}</td>
                            <td><span className="fw-medium text-dark">{d.FullName || 'N/A'}</span></td>
                            <td><span className="badge-dept">{d.DepartmentName || 'Khác'}</span></td>
                            <td>{d.DividendDate}</td>
                            <td className="text-end fw-bold" style={{ color: '#059669' }}>
                              {formatVND(d.DividendAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReportCenter;
