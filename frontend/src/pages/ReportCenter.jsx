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
    { key: 'hr', icon: '👥', title: 'Báo Cáo Nhân Sự', desc: 'Số lượng NV theo phòng ban/trạng thái', role: 'HR Manager' },
    { key: 'payroll', icon: '💰', title: 'Báo Cáo Lương', desc: 'Tổng lương, lương trung bình', role: 'Payroll Manager' },
    { key: 'attendance', icon: '📅', title: 'Báo Cáo Chấm Công', desc: 'Top nghỉ nhiều', role: 'Admin' },
    { key: 'dividend', icon: '📊', title: 'Báo Cáo Cổ Tức', desc: 'Tổng cổ tức theo nhân viên', role: 'Admin' },
  ];

  // HR report data
  const empByDept = {};
  employees.forEach(e => {
    const d = e.Department || 'Chưa phân bổ';
    empByDept[d] = (empByDept[d] || 0) + 1;
  });

  const ACTIVE_STATUSES = ['Đang làm việc', 'Thử việc', 'Thực tập', 'Nghỉ phép'];
  const activeCount = employees.filter(e => ACTIVE_STATUSES.includes(e.Status)).length;
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
      const headers = ['Mã NV', 'Họ Tên', 'Phòng Ban', 'Chức Vụ', 'Trạng Thái'];
      const rows = employees.map(e => [
        e.EmployeeID,
        e.FullName || '',
        e.Department || 'Chưa phân bổ',
        e.Position || '',
        e.Status || 'Active'
      ]);
      const summary = [
        [],
        ['TỔNG KẾT'],
        ['Tổng nhân viên', employees.length],
        ['Đang làm việc', activeCount],
        ['Nghỉ việc', inactiveCount],
        [],
        ['NHÂN VIÊN THEO PHÒNG BAN'],
        ...Object.entries(empByDept).map(([dept, count]) => [dept, count])
      ];
      return { headers, rows, summary, title: 'Báo Cáo Nhân Sự', date: today };
    }
    if (activeReport === 'payroll') {
      const headers = ['Mã NV', 'Họ Tên', 'Phòng Ban', 'Tháng', 'Lương Cơ Bản', 'Phụ Cấp', 'Khấu Trừ', 'Thực Lĩnh'];
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
        ['TỔNG KẾT'],
        ['Tổng chi lương', totalSalary],
        ['Lương trung bình', avgSalary],
        ['Số phiếu lương', salaries.length],
        [],
        ['LƯƠNG THEO PHÒNG BAN'],
        ...Object.entries(salaryByDept).map(([dept, total]) => [dept, total])
      ];
      return { headers, rows, summary, title: 'Báo Cáo Lương', date: today };
    }
    if (activeReport === 'attendance') {
      const headers = ['Mã NV', 'Họ Tên', 'Tháng', 'Ngày Công', 'Ngày Vắng', 'Ngày Nghỉ'];
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
        ['TỔNG KẾT'],
        ['Tổng ngày công', totalWorkDays],
        ['Tổng ngày vắng', totalAbsent],
        ['Tổng ngày nghỉ', totalLeave],
        ['Tỷ lệ nghỉ', leaveRate + '%'],
        [],
        ['TOP NHÂN VIÊN NGHI NHIỀU'],
        ['Mã NV', 'Họ Tên', 'Tổng Ngày Nghỉ/Vắng'],
        ...topAbsent.map(e => [e.id, e.name, e.total])
      ];
      return { headers, rows, summary, title: 'Báo Cáo Chấm Công', date: today };
    }
    if (activeReport === 'dividend') {
      const headers = ['Mã NV', 'Họ Tên', 'Phòng Ban', 'Ngày Nhận', 'Số Tiền (VND)'];
      const rows = dividends.map(d => [
        d.EmployeeID,
        d.FullName || '',
        d.DepartmentName || '',
        d.DividendDate || '',
        d.DividendAmount || 0
      ]);
      const summary = [
        [],
        ['TỔNG KẾT'],
        ['Tổng tiền cổ tức', totalDividend],
        ['Trung bình', avgDividend],
        ['Số lượt nhận', dividends.length],
        [],
        ['CỔ TỨC THEO PHÒNG BAN'],
        ...Object.entries(divByDept).map(([dept, total]) => [dept, total])
      ];
      return { headers, rows, summary, title: 'Báo Cáo Cổ Tức', date: today };
    }
    return null;
  };

  // Strip Vietnamese diacritics so jsPDF default font renders correctly
  const sanitizeForPDF = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') return val;
    return String(val)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove combining diacritics
      .replace(/đ/g, 'd').replace(/Đ/g, 'D'); // handle đ/Đ (not covered by NFD)
  };

  const handleExportExcel = () => {
    const data = getReportData();
    if (!data) {
      alert('Báo cáo này chưa có dữ liệu để xuất.');
      return;
    }
    const { headers, rows, summary, title } = data;

    const wsData = [
      [title.toUpperCase()],
      ['Ngày xuất: ' + data.date],
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

  const handleExportPDF = async () => {
    const data = getReportData();
    if (!data) {
      alert('Bao cao nay chua co du lieu de xuat.');
      return;
    }
    const { headers, rows, title } = data;
    const doc = new jsPDF({ orientation: headers.length > 6 ? 'landscape' : 'portrait' });

    // Try to load Roboto font (supports Vietnamese) from CDN
    let fontName = 'helvetica';
    let tableRows = rows.map(row => row.map(cell => sanitizeForPDF(cell)));
    try {
      const ttfRes = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf');
      const ttfBoldRes = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf');
      if (ttfRes.ok && ttfBoldRes.ok) {
        const toBase64 = async (res) => {
          const buf = await res.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = '';
          bytes.forEach(b => { binary += String.fromCharCode(b); });
          return btoa(binary);
        };
        const [regB64, boldB64] = await Promise.all([toBase64(ttfRes), toBase64(ttfBoldRes)]);
        doc.addFileToVFS('Roboto-Regular.ttf', regB64);
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        doc.addFileToVFS('Roboto-Bold.ttf', boldB64);
        doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
        doc.setFont('Roboto', 'normal');
        fontName = 'Roboto';
        tableRows = rows; // use original Vietnamese text
      }
    } catch (_) {
      // CDN unavailable → fall back to sanitized ASCII
    }

    // Title
    doc.setFont(fontName, 'bold');
    doc.setFontSize(16);
    doc.text(title.toUpperCase(), 14, 20);
    doc.setFont(fontName, 'normal');
    doc.setFontSize(10);
    doc.text('Ngày xuất: ' + data.date, 14, 28);

    // Main table
    autoTable(doc, {
      head: [headers],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 9, cellPadding: 3, font: fontName },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 },
    });

    // Summary section
    const tableEndY = (doc.lastAutoTable && doc.lastAutoTable.finalY)
      ? doc.lastAutoTable.finalY + 10
      : 50;
    doc.setFont(fontName, 'bold');
    doc.setFontSize(11);
    doc.text('TỔNG KẾT', 14, tableEndY);
    doc.setFont(fontName, 'normal');

    if (activeReport === 'hr') {
      doc.setFontSize(9);
      doc.text('Tổng nhân viên: ' + employees.length, 14, tableEndY + 7);
      doc.text('Đang làm việc: ' + activeCount, 14, tableEndY + 13);
      doc.text('Nghỉ việc: ' + inactiveCount, 14, tableEndY + 19);
    } else if (activeReport === 'payroll') {
      doc.setFontSize(9);
      doc.text('Tổng chi lương: ' + Number(totalSalary).toLocaleString('vi-VN') + ' VND', 14, tableEndY + 7);
      doc.text('Lương trung bình: ' + Number(avgSalary).toLocaleString('vi-VN') + ' VND', 14, tableEndY + 13);
      doc.text('Số phiếu lương: ' + salaries.length, 14, tableEndY + 19);
    } else if (activeReport === 'attendance') {
      doc.setFontSize(9);
      doc.text('Tổng ngày công: ' + totalWorkDays, 14, tableEndY + 7);
      doc.text('Tổng ngày vắng: ' + totalAbsent, 14, tableEndY + 13);
      doc.text('Tổng ngày nghỉ: ' + totalLeave, 14, tableEndY + 19);
      doc.text('Tỷ lệ nghỉ: ' + leaveRate + '%', 14, tableEndY + 25);
    } else if (activeReport === 'dividend') {
      doc.setFontSize(9);
      doc.text('Tổng tiền cổ tức: ' + Number(totalDividend).toLocaleString('vi-VN') + ' VND', 14, tableEndY + 7);
      doc.text('Trung bình: ' + Number(avgDividend).toLocaleString('vi-VN') + ' VND', 14, tableEndY + 13);
      doc.text('Số lượt nhận: ' + dividends.length, 14, tableEndY + 19);
      let yOffset = tableEndY + 30;
      doc.setFont(fontName, 'bold');
      doc.setFontSize(10);
      doc.text('Cổ tức theo phòng ban:', 14, yOffset);
      doc.setFont(fontName, 'normal');
      yOffset += 7;
      doc.setFontSize(9);
      Object.entries(divByDept).forEach(([dept, total]) => {
        const deptLabel = fontName === 'Roboto' ? dept : sanitizeForPDF(dept);
        doc.text(`${deptLabel}: ${Number(total).toLocaleString('vi-VN')} VND`, 14, yOffset);
        yOffset += 6;
      });
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
            </div>
          </div>
        ))}
      </div>

      {/* Report Content */}
      <div className="content-card">
        <div className="card-header-custom">
          <h5>📈 {reports.find(r => r.key === activeReport)?.title}</h5>
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm d-flex align-items-center gap-2"
              style={{ background: '#217346', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, padding: '7px 16px', fontSize: 13, boxShadow: '0 2px 8px rgba(33,115,70,0.18)' }}
              onClick={handleExportExcel}
            >
              {/* Excel icon */}
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="24" rx="4" fill="#fff" fillOpacity="0.15" />
                <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" fill="white" fillOpacity="0.9" />
                <path d="M14 2v6h6" fill="white" fillOpacity="0.5" />
                <text x="5" y="19" fontSize="8" fontWeight="bold" fill="#217346">XLS</text>
              </svg>
              Xuất Excel
            </button>
            <button
              className="btn btn-sm d-flex align-items-center gap-2"
              style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, padding: '7px 16px', fontSize: 13, boxShadow: '0 2px 8px rgba(229,57,53,0.18)' }}
              onClick={handleExportPDF}
            >
              {/* PDF icon */}
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="24" rx="4" fill="#fff" fillOpacity="0.15" />
                <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" fill="white" fillOpacity="0.9" />
                <path d="M14 2v6h6" fill="white" fillOpacity="0.5" />
                <text x="5" y="19" fontSize="8" fontWeight="bold" fill="#e53935">PDF</text>
              </svg>
              Xuất PDF
            </button>
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
