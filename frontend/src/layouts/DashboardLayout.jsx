import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';

const SIDEBAR_WIDTH = 270;

const menuItems = [
  { id: 'dashboard', path: '/', icon: '📊', label: 'Dashboard' },
  { id: 'users', path: '/users', icon: '🔐', label: 'Quản lý User', allowedRoles: ['Admin'] },
  {
    id: 'hr', icon: '👥', label: 'Nhân Sự',
    allowedRoles: ['Admin', 'HR Manager'],
    subItems: [
      { path: '/employees',   icon: '👥', label: 'Danh sách Nhân viên' },
      { path: '/departments', icon: '🏢', label: 'Phòng Ban' },
      { path: '/positions',   icon: '💼', label: 'Chức Vụ' },
    ],
  },
  {
    id: 'payroll', icon: '💰', label: 'Bảng Lương',
    allowedRoles: ['Admin', 'Payroll Manager'],
    subItems: [
      { path: '/payroll',        icon: '💰', label: 'Bảng Lương Tháng' },
      { path: '/salary-history', icon: '📋', label: 'Lịch Sử Lương' },
    ],
  },
  {
    id: 'attendance', icon: '📅', label: 'Chấm Công',
    allowedRoles: ['Admin', 'Payroll Manager'],
    subItems: [
      { path: '/attendance',   icon: '📅', label: 'Dữ Liệu Chấm Công' },
      { path: '/import-leave', icon: '📤', label: 'Import & Nghỉ Phép' },
    ],
  },
  { id: 'reports', path: '/reports', icon: '📈', label: 'Báo Cáo', allowedRoles: ['Admin', 'HR Manager', 'Payroll Manager'] },
  { id: 'alerts',  path: '/alerts',  icon: '🔔', label: 'Cảnh Báo',  allowedRoles: ['Admin', 'HR Manager', 'Payroll Manager'] },
  { id: 'my-profile', path: '/my-profile',    icon: '👤', label: 'Hồ Sơ Của Tôi',  allowedRoles: ['Employee'] },
  { id: 'my-salary',  path: '/salary-history', icon: '💵', label: 'Lương Của Tôi',   allowedRoles: ['Employee'] },
  { id: 'my-leave',   path: '/import-leave',   icon: '📝', label: 'Xin Nghỉ Phép',  allowedRoles: ['Employee'] },
];

const roleBadge = {
  'Admin':           { bg: '#fef2f2', color: '#dc2626', icon: '🔴', label: 'Admin' },
  'HR Manager':      { bg: '#f0fdf4', color: '#16a34a', icon: '🟢', label: 'HR Manager' },
  'Payroll Manager': { bg: '#eff6ff', color: '#2563eb', icon: '🔵', label: 'Payroll' },
  'Employee':        { bg: '#fefce8', color: '#ca8a04', icon: '🟡', label: 'Employee' },
};

const API = 'http://localhost:5000';

function DashboardLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Flyout sidebar
  const [flyout, setFlyout] = useState({ id: null, top: 0 });
  const closeTimer = useRef(null);

  // Dropdown panels
  const [showNotif, setShowNotif]     = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading]   = useState(false);
  const [showChangePwModal, setShowChangePwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ old: '', newPw: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const notifRef    = useRef(null);
  const settingsRef = useRef(null);

  const token = localStorage.getItem('token');
  const userInfo = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); }
    catch { return null; }
  })();
  const userRole     = userInfo?.Role || '';
  const userInitials = userInfo?.FullName
    ? userInfo.FullName.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase()
    : (userInfo?.Username?.[0]?.toUpperCase() || 'AD');
  const badge = roleBadge[userRole] || roleBadge['Employee'];

  const visibleMenus = menuItems.filter(item =>
    !item.allowedRoles || item.allowedRoles.includes(userRole)
  );

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch notifications (dùng audit logs)
  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      const res = await fetch(`${API}/api/logs?limit=8`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch { setNotifications([]); }
    finally { setNotifLoading(false); }
  };

  const handleBellClick = () => {
    const next = !showNotif;
    setShowNotif(next);
    setShowSettings(false);
    if (next) fetchNotifications();
  };

  const handleSettingsClick = () => {
    setShowSettings(s => !s);
    setShowNotif(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Đổi mật khẩu
  const handleChangePw = async () => {
    setPwError(''); setPwSuccess('');
    if (!pwForm.old || !pwForm.newPw || !pwForm.confirm) { setPwError('Vui lòng điền đầy đủ'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwError('Mật khẩu mới không khớp'); return; }
    if (pwForm.newPw.length < 6) { setPwError('Mật khẩu mới tối thiểu 6 ký tự'); return; }
    try {
      const res = await fetch(`${API}/api/users/${userInfo?.UserID}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ OldPassword: pwForm.old, NewPassword: pwForm.newPw })
      });
      const data = await res.json();
      if (res.ok) {
        setPwSuccess('Đổi mật khẩu thành công!');
        setPwForm({ old: '', newPw: '', confirm: '' });
        setTimeout(() => { setShowChangePwModal(false); setPwSuccess(''); }, 1500);
      } else {
        setPwError(data.msg || 'Lỗi không xác định');
      }
    } catch (e) { setPwError('Lỗi kết nối: ' + e.message); }
  };

  // Flyout sidebar
  const openFlyout = useCallback((menuId, e) => {
    clearTimeout(closeTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setFlyout({ id: menuId, top: rect.top });
  }, []);
  const closeFlyout   = useCallback(() => { closeTimer.current = setTimeout(() => setFlyout({ id: null, top: 0 }), 120); }, []);
  const cancelClose   = useCallback(() => { clearTimeout(closeTimer.current); }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/')               return { title: 'Dashboard', sub: 'Tổng quan hệ thống HR & Payroll' };
    if (path === '/users')          return { title: 'Quản Lý User', sub: 'Quản lý tài khoản, phân quyền' };
    if (path === '/my-profile')     return { title: 'Hồ Sơ Của Tôi', sub: 'Thông tin cá nhân & lương' };
    if (path.startsWith('/employees/add'))  return { title: 'Thêm Nhân Viên', sub: 'Tạo hồ sơ nhân viên mới' };
    if (path.startsWith('/employees/edit')) return { title: 'Sửa Nhân Viên', sub: 'Cập nhật thông tin nhân viên' };
    if (path.startsWith('/employees/'))     return { title: 'Hồ Sơ Nhân Viên', sub: 'Xem chi tiết' };
    if (path === '/employees')      return { title: 'Danh Sách Nhân Viên', sub: 'Quản lý toàn bộ nhân viên' };
    if (path === '/departments')    return { title: 'Phòng Ban', sub: 'Quản lý cơ cấu phòng ban' };
    if (path === '/positions')      return { title: 'Chức Vụ', sub: 'Quản lý chức danh, vị trí' };
    if (path === '/payroll')        return { title: 'Bảng Lương Tháng', sub: 'Tổng hợp lương tháng' };
    if (path === '/salary-history') return { title: userRole === 'Employee' ? 'Lương Của Tôi' : 'Lịch Sử Lương', sub: 'Tra cứu lịch sử trả lương' };
    if (path === '/attendance')     return { title: 'Dữ Liệu Chấm Công', sub: 'Thống kê ngày công' };
    if (path === '/import-leave')   return { title: userRole === 'Employee' ? 'Xin Nghỉ Phép' : 'Import & Nghỉ Phép', sub: '' };
    if (path === '/reports')        return { title: 'Trung Tâm Báo Cáo', sub: 'Báo cáo HR & Payroll' };
    if (path === '/alerts')         return { title: 'Cảnh Báo Hệ Thống', sub: '' };
    return { title: 'Dashboard', sub: '' };
  };

  const pageTitle = getPageTitle();
  const activeFlyoutItem = menuItems.find(m => m.id === flyout.id);

  const actionIconStyle = {
    bg:   { Login:'#eff6ff', LOGOUT:'#f1f5f9', CREATE_USER:'#f0fdf4', UPDATE_USER:'#fefce8', DELETE_USER:'#fef2f2', RESET_PASSWORD:'#faf5ff', CHANGE_PASSWORD:'#faf5ff' },
    icon: { LOGIN:'🔑', LOGOUT:'🚪', CREATE_USER:'➕', UPDATE_USER:'✏️', DELETE_USER:'🗑️', RESET_PASSWORD:'🔐', CHANGE_PASSWORD:'🔑' },
  };

  return (
    <div className="d-flex">
      {/* ============ SIDEBAR ============ */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">X</div>
          <div><h5>Company X</h5><small>HR &amp; Payroll System</small></div>
        </div>

        {/* User card */}
        <div style={{ margin:'12px 12px 8px', padding:'12px', background: badge.bg, borderRadius:10, border:`1px solid ${badge.color}22` }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:`linear-gradient(135deg, ${badge.color}, ${badge.color}88)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13 }}>
              {userInitials}
            </div>
            <div style={{ overflow:'hidden' }}>
              <div style={{ fontWeight:600, fontSize:13, color:'#1e293b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {userInfo?.FullName || userInfo?.Username || 'User'}
              </div>
              <div style={{ fontSize:11, color:badge.color, fontWeight:600 }}>{badge.icon} {badge.label}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <ul className="sidebar-nav">
          {visibleMenus.map((item) => (
            <li className="nav-item" key={item.id}
              onMouseEnter={item.subItems ? (e) => openFlyout(item.id, e) : undefined}
              onMouseLeave={item.subItems ? closeFlyout : undefined}
            >
              {item.subItems ? (
                <button className="nav-link collapsed-menu"
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', backgroundColor: flyout.id === item.id ? 'var(--sidebar-hover)' : 'transparent', color: flyout.id === item.id ? '#fff' : '#cbd5e1', border:'none', cursor:'pointer' }}
                  onClick={(e) => openFlyout(item.id, e)}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <span className="nav-icon">{item.icon}</span>{item.label}
                  </div>
                  <span style={{ fontSize:10, opacity:0.6 }}>▶</span>
                </button>
              ) : (
                <NavLink to={item.path} end={item.path === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  <span className="nav-icon">{item.icon}</span>{item.label}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </aside>

      {/* ============ FLYOUT PANEL (position:fixed, đè lên content) ============ */}
      {flyout.id && activeFlyoutItem && (
        <div onMouseEnter={cancelClose} onMouseLeave={closeFlyout}
          style={{ position:'fixed', top: flyout.top, left: SIDEBAR_WIDTH, zIndex:9999, minWidth:210, background:'#1e293b', borderRadius:'0 12px 12px 0', boxShadow:'6px 4px 24px rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.08)', borderLeft:'3px solid #4f46e5', paddingBottom:6, animation:'flyoutIn 0.15s ease-out' }}>
          <div style={{ padding:'10px 16px 8px', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid rgba(255,255,255,0.07)', marginBottom:4 }}>
            {activeFlyoutItem.icon} {activeFlyoutItem.label}
          </div>
          {activeFlyoutItem.subItems.map((sub) => (
            <NavLink key={sub.path} to={sub.path} end onClick={() => setFlyout({ id:null, top:0 })}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 18px', fontSize:13.5, borderRadius:0, color:'#cbd5e1' }}>
              <span style={{ fontSize:16 }}>{sub.icon}</span>{sub.label}
            </NavLink>
          ))}
        </div>
      )}

      {/* ============ MAIN CONTENT ============ */}
      <div className="main-content flex-grow-1">
        {/* TOP NAVBAR */}
        <div className="top-navbar">
          <div className="page-title">
            {pageTitle.title}
            <small>{pageTitle.sub}</small>
          </div>

          <div className="navbar-actions">
            {/* ===== AVATAR — click để mở settings dropdown ===== */}
            <div ref={settingsRef} style={{ position:'relative' }}>
              <div
                className="user-avatar"
                onClick={handleSettingsClick}
                title="Tài khoản"
                style={{ cursor:'pointer' }}
              >
                {userInitials}
              </div>

              {showSettings && (
                <div style={{ position:'absolute', top:'calc(100% + 10px)', right:0, width:240, background:'#fff', borderRadius:14, boxShadow:'0 12px 40px rgba(0,0,0,0.15)', border:'1px solid #e2e8f0', zIndex:9999, overflow:'hidden', animation:'dropdownIn 0.15s ease-out' }}>
                  {/* User info */}
                  <div style={{ padding:'14px 18px', background:'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderBottom:'1px solid #e2e8f0' }}>
                    <div style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>{userInfo?.FullName || userInfo?.Username}</div>
                    <div style={{ fontSize:11, color: badge.color, fontWeight:600, marginTop:2 }}>{badge.icon} {badge.label}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>@{userInfo?.Username}</div>
                  </div>

                  {/* Menu items */}
                  {[
                    { icon:'👤', label:'Hồ Sơ Cá Nhân', action: () => { setShowSettings(false); navigate('/my-profile'); } },
                    { icon:'🔑', label:'Đổi Mật Khẩu', action: () => { setShowSettings(false); setShowChangePwModal(true); } },
                    ...(userRole === 'Admin' ? [{ icon:'🔐', label:'Quản lý User', action: () => { setShowSettings(false); navigate('/users'); } }] : []),
                  ].map((item, i) => (
                    <button key={i} onClick={item.action}
                      style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'11px 18px', border:'none', background:'none', cursor:'pointer', fontSize:13.5, color:'#334155', textAlign:'left', borderBottom:'1px solid #f8fafc', transition:'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background='none'}
                    >
                      <span style={{ fontSize:16 }}>{item.icon}</span>{item.label}
                    </button>
                  ))}

                  {/* Đăng xuất */}
                  <button onClick={handleLogout}
                    style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'11px 18px', border:'none', background:'none', cursor:'pointer', fontSize:13.5, color:'#dc2626', fontWeight:600, textAlign:'left' }}
                    onMouseEnter={e => e.currentTarget.style.background='#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background='none'}
                  >
                    <span style={{ fontSize:16 }}>🚪</span> Đăng Xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div className="page-content">
          <Outlet />
        </div>
      </div>

      {/* ===== MODAL ĐỔI MẬT KHẨU ===== */}
      {showChangePwModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:'32px 36px', width:380, boxShadow:'0 24px 64px rgba(0,0,0,0.25)' }}>
            <h5 style={{ margin:'0 0 20px', fontWeight:700, fontSize:17 }}>🔑 Đổi Mật Khẩu</h5>

            {pwError   && <div style={{ background:'#fef2f2', color:'#dc2626', padding:'10px 14px', borderRadius:8, marginBottom:14, fontSize:13 }}>⚠️ {pwError}</div>}
            {pwSuccess && <div style={{ background:'#f0fdf4', color:'#16a34a', padding:'10px 14px', borderRadius:8, marginBottom:14, fontSize:13 }}>✅ {pwSuccess}</div>}

            {[
              { label:'Mật khẩu hiện tại', key:'old' },
              { label:'Mật khẩu mới', key:'newPw' },
              { label:'Xác nhận mật khẩu mới', key:'confirm' },
            ].map(({ label, key }) => (
              <div key={key} style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontWeight:600, fontSize:13, marginBottom:5, color:'#374151' }}>{label}</label>
                <input
                  type="password"
                  className="form-control"
                  value={pwForm[key]}
                  onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={label}
                />
              </div>
            ))}

            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={() => { setShowChangePwModal(false); setPwError(''); setPwSuccess(''); setPwForm({ old:'', newPw:'', confirm:'' }); }}
                style={{ flex:1, padding:'10px', borderRadius:10, border:'1.5px solid #e2e8f0', background:'#fff', color:'#475569', fontWeight:600, cursor:'pointer', fontSize:14 }}>
                Hủy
              </button>
              <button onClick={handleChangePw}
                style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#4f46e5,#6366f1)', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:14 }}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes flyoutIn   { from { opacity:0; transform:translateX(-6px); } to { opacity:1; transform:translateX(0); } }
        @keyframes dropdownIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

export default DashboardLayout;
