import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * PrivateRoute - Bảo vệ route theo:
 * 1. Xác thực: Phải có token (đã đăng nhập)
 * 2. Phân quyền: Role phải nằm trong allowedRoles (nếu được chỉ định)
 *
 * allowedRoles: mảng role được phép, ví dụ ['Admin', 'HR Manager']
 * Nếu không truyền allowedRoles → chỉ kiểm tra token (mọi role đều vào được)
 */
function PrivateRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');

  // Chưa đăng nhập → về trang login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Lấy thông tin user từ localStorage
  const userInfo = (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();

  const userRole = userInfo?.Role;

  // Nếu có allowedRoles → kiểm tra quyền
  if (allowedRoles && allowedRoles.length > 0) {
    if (!userRole || !allowedRoles.includes(userRole)) {
      // Không có quyền → về trang Unauthorized
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}

export default PrivateRoute;
