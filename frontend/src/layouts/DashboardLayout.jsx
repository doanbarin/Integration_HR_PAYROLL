import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';

const menuSections = [
  {
    title: 'TỔNG QUAN',
    items: [
      { path: '/', icon: '📊', label: 'Dashboard' },
    ]
  },
  {
    title: 'HỆ THỐNG',
    items: [
      { path: '/users', icon: '🔐', label: 'Quản lý User' },
    ]
  },
  {
    title: 'NHÂN SỰ (HR)',
    items: [
      { path: '/employees', icon: '👥', label: 'Danh sách Nhân viên' },
      { path: '/departments', icon: '🏢', label: 'Phòng Ban' },
      { path: '/positions', icon: '💼', label: 'Chức Vụ' },
    ]
  },
  {
    title: 'BẢNG LƯƠNG',
    items: [
      { path: '/payroll', icon: '💰', label: 'Bảng Lương Tháng' },
      { path: '/salary-history', icon: '📋', label: 'Lịch Sử Lương' },
    ]
  },
  {
    title: 'CHẤM CÔNG',
    items: [
      { path: '/attendance', icon: '📅', label: 'Dữ Liệu Chấm Công' },
      { path: '/import-leave', icon: '📤', label: 'Import & Nghỉ Phép' },
    ]
  },
  {
    title: 'BÁO CÁO',
    items: [
      { path: '/reports', icon: '📈', label: 'Trung Tâm Báo Cáo' },
    ]
  },
  {
    title: 'CẢNH BÁO',
    items: [
      { path: '/alerts', icon: '🔔', label: 'Cảnh Báo Hệ Thống' },
    ]
  }
];

function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [alerts] = useState(3);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return { title: 'Dashboard', sub: 'Tổng quan hệ thống HR & Payroll' };
    if (path === '/users') return { title: 'Quản Lý User', sub: 'Quản lý tài khoản, phân quyền' };
    if (path.startsWith('/employees/add')) return { title: 'Thêm Nhân Viên', sub: 'Tạo hồ sơ nhân viên mới' };
    if (path.startsWith('/employees/edit')) return { title: 'Sửa Nhân Viên', sub: 'Cập nhật thông tin nhân viên' };
    if (path.startsWith('/employees/')) return { title: 'Hồ Sơ Nhân Viên', sub: 'Xem chi tiết thông tin' };
    if (path === '/employees') return { title: 'Danh Sách Nhân Viên', sub: 'Quản lý toàn bộ nhân viên' };
    if (path === '/departments') return { title: 'Phòng Ban', sub: 'Quản lý cơ cấu phòng ban' };
    if (path === '/positions') return { title: 'Chức Vụ', sub: 'Quản lý chức danh, vị trí' };
    if (path === '/payroll') return { title: 'Bảng Lương Tháng', sub: 'Tổng hợp lương tháng' };
    if (path === '/salary-history') return { title: 'Lịch Sử Lương', sub: 'Tra cứu lịch sử trả lương' };
    if (path === '/attendance') return { title: 'Dữ Liệu Chấm Công', sub: 'Thống kê ngày công' };
    if (path === '/import-leave') return { title: 'Import & Nghỉ Phép', sub: 'Nhập chấm công & xin nghỉ' };
    if (path === '/reports') return { title: 'Trung Tâm Báo Cáo', sub: 'Báo cáo HR & Payroll' };
    if (path === '/alerts') return { title: 'Cảnh Báo Hệ Thống', sub: 'Sinh nhật, nghỉ quá ngày, bất thường lương' };
    return { title: 'Dashboard', sub: '' };
  };

  const pageTitle = getPageTitle();

  return (
    <div className="d-flex">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">X</div>
          <div>
            <h5>Company X</h5>
            <small>HR & Payroll System</small>
          </div>
        </div>

        {menuSections.map((section, i) => (
          <div className="sidebar-section" key={i}>
            <div className="sidebar-section-title">{section.title}</div>
            <ul className="sidebar-nav">
              {section.items.map((item) => (
                <li className="nav-item" key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>

      {/* MAIN */}
      <div className="main-content flex-grow-1">
        {/* TOP NAVBAR */}
        <div className="top-navbar">
          <div className="page-title">
            {pageTitle.title}
            <small>{pageTitle.sub}</small>
          </div>
          <div className="navbar-actions">
            <button className="btn-icon" title="Thông báo">
              🔔
              {alerts > 0 && <span className="notification-badge">{alerts}</span>}
            </button>
            <button className="btn-icon" title="Cài đặt">⚙️</button>
            <div className="user-avatar" onClick={handleLogout} title="Đăng xuất">
              AD
            </div>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
