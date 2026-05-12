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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Gọi API đăng nhập từ backend
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Username: form.username,
          Password: form.password
        })
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        // Lưu token và user info vào localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Điều hướng về trang home
        navigate('/');
      } else {
        setError(data.msg || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối đến server: ' + err.message);
    } finally {
      setLoading(false);
    }
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
              disabled={loading}
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
              disabled={loading}
            />
          </div>
          <button className="btn btn-login" type="submit" disabled={loading}>
            {loading ? '⏳ Đang xử lý...' : '🔓 Đăng Nhập'}
          </button>
        </form>

        <div className="text-center mt-4">
          <small style={{color: '#64748b', fontSize: 12}}>
            © 2026 Company X — Integrated HR & Payroll System<br/>
            <span style={{color: '#aaa', fontSize: 11}}>Tài khoản demo: admin_thong / 123456</span>
          </small>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
