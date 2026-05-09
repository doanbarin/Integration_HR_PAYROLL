import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    // Demo login - chấp nhận bất kỳ thông tin nào
    setTimeout(() => {
      if (form.username && form.password) {
        localStorage.setItem('token', 'demo-token');
        localStorage.setItem('user', JSON.stringify({
          username: form.username,
          role: 'Admin'
        }));
        navigate('/');
      } else {
        setError('Vui lòng nhập đầy đủ thông tin');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="login-page">
      <div className="login-card animate-fade-in">
        <div className="login-logo">X</div>
        <h3>Company X</h3>
        <p>Đăng nhập vào hệ thống HR & Payroll</p>

        {error && (
          <div className="alert alert-danger py-2 text-center" style={{borderRadius: 10, fontSize: 13}}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Tên đăng nhập</label>
            <input
              type="text"
              className="form-control"
              name="username"
              placeholder="Nhập username..."
              value={form.username}
              onChange={handleChange}
              autoFocus
            />
          </div>
          <div className="mb-4">
            <label className="form-label">Mật khẩu</label>
            <input
              type="password"
              className="form-control"
              name="password"
              placeholder="Nhập password..."
              value={form.password}
              onChange={handleChange}
            />
          </div>
          <button className="btn btn-login" type="submit" disabled={loading}>
            {loading ? '⏳ Đang xử lý...' : '🔓 Đăng Nhập'}
          </button>
        </form>

        <div className="text-center mt-4">
          <small style={{color: '#64748b', fontSize: 12}}>
            © 2026 Company X — Integrated HR & Payroll System
          </small>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
