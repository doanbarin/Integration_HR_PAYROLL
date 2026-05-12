import React from 'react';
import { useNavigate } from 'react-router-dom';

function UnauthorizedPage() {
  const navigate = useNavigate();

  const userInfo = (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  })();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif"
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '24px',
        padding: '56px 48px',
        maxWidth: '480px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 32px 80px rgba(0,0,0,0.35)'
      }}>
        {/* Icon */}
        <div style={{
          width: 80, height: 80,
          background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 36
        }}>
          🚫
        </div>

        <h2 style={{ color: '#1e293b', fontWeight: 700, marginBottom: 8, fontSize: 26 }}>
          Không có quyền truy cập
        </h2>
        <p style={{ color: '#64748b', marginBottom: 8, lineHeight: 1.6 }}>
          Tài khoản <strong style={{ color: '#4f46e5' }}>
            {userInfo?.Username || 'của bạn'}
          </strong> với quyền hạn{' '}
          <strong style={{ color: '#dc2626' }}>
            {userInfo?.Role || 'không xác định'}
          </strong>{' '}
          không được phép truy cập trang này.
        </p>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 32 }}>
          Vui lòng liên hệ Admin nếu bạn cần quyền truy cập.
        </p>

        {/* Bảng quyền hạn */}
        <div style={{
          background: '#f8fafc',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 32,
          textAlign: 'left',
          fontSize: 13,
          lineHeight: '2'
        }}>
          <div><strong>🔴 Admin</strong> — Toàn quyền hệ thống</div>
          <div><strong>🟢 HR Manager</strong> — Quản lý nhân sự</div>
          <div><strong>🔵 Payroll Manager</strong> — Quản lý lương & chấm công</div>
          <div><strong>🟡 Employee</strong> — Xem hồ sơ & lương cá nhân</div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '10px 24px',
              borderRadius: 10,
              border: '1.5px solid #e2e8f0',
              background: '#fff',
              color: '#475569',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            ← Quay lại
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '10px 24px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              boxShadow: '0 4px 14px rgba(79,70,229,0.4)'
            }}
          >
            🏠 Về Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
