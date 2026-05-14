from flask import Blueprint, jsonify, request
from config import get_sqlserver_connection, get_mysql_connection, get_taikhoan_connection
import bcrypt
import jwt
import string
import random
from datetime import datetime, timedelta
from functools import wraps

router = Blueprint("router", __name__)

# ===== BRUTE-FORCE PROTECTION =====
# { username: {"count": int, "locked_until": datetime or None} }
_failed_attempts = {}
LOCKOUT_MAX_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15

def _record_failed_attempt(username):
    """Record a failed login attempt; return (is_now_locked, seconds_remaining).

    Lock behaviour:
      - Attempts 1-5  → counter increments, returns (False, 0)  → caller returns 401
      - Attempt 5 sets locked_until so the NEXT (6th) request hits _is_locked_out → 429
    """
    now = datetime.utcnow()
    entry = _failed_attempts.setdefault(username, {"count": 0, "locked_until": None})
    entry["count"] += 1
    if entry["count"] >= LOCKOUT_MAX_ATTEMPTS:
        # Lock starts NOW; the 6th request will be caught by _is_locked_out()
        entry["locked_until"] = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
        entry["count"] = 0  # reset counter so next window is clean
        # Return False here: this (the 5th) attempt still gets a 401
        # The *next* attempt will be blocked by _is_locked_out() → 429
        return False, 0
    return False, 0

def _is_locked_out(username):
    """Return (locked: bool, seconds_remaining: int)."""
    entry = _failed_attempts.get(username)
    if not entry or not entry.get("locked_until"):
        return False, 0
    now = datetime.utcnow()
    if now < entry["locked_until"]:
        remaining = int((entry["locked_until"] - now).total_seconds())
        return True, remaining
    # Lock expired — clear it
    entry["locked_until"] = None
    entry["count"] = 0
    return False, 0

def _clear_failed_attempts(username):
    """Clear failed attempts after a successful login."""
    if username in _failed_attempts:
        _failed_attempts[username] = {"count": 0, "locked_until": None}

# ===== HELPER: Tạo mật khẩu tạm =====
def generate_temp_password(length=12):
    """Tạo mật khẩu tạm gồm 12 ký tự: chữ hoa, chữ thường, số, ký tự đặc biệt"""
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(random.choice(chars) for _ in range(length))

# ===== HELPER: Tạo JWT Token =====
def create_token(user_id, username, role, app_secret_key, employee_id=None):
    """Tạo JWT token cho user"""
    payload = {
        'UserID': user_id,
        'Username': username,
        'Role': role,
        'EmployeeID': employee_id,
        'exp': datetime.utcnow() + timedelta(hours=24),
        'iat': datetime.utcnow()
    }
    token = jwt.encode(payload, app_secret_key, algorithm='HS256')
    return token

# ===== HELPER: Ghi log actions =====
def log_action(user_id, action, endpoint, result_status, source_ip):
    """Ghi log hành động vào table Logs"""
    try:
        conn = get_taikhoan_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO Logs (UserID, Action, Endpoint, ResultStatus, SourceIP)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, action, endpoint, result_status, source_ip))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Lỗi ghi log: {str(e)}")

# ===== AUTHENTICATION APIs =====

@router.route("/api/auth/login", methods=["POST"])
def login():
    """Đăng nhập - kiểm tra Username và PasswordHash"""
    data = request.get_json()
    username = data.get("Username", "").strip()
    password = data.get("Password", "").strip()
    source_ip = request.remote_addr

    if not username or not password:
        return jsonify({"status": "error", "msg": "Username và Password không được trống"}), 400

    # ===== INPUT VALIDATION: Ngăn SQL Injection =====
    # Loại bỏ các ký tự đặc biệt nguy hiểm: -- ; ' " /* */
    dangerous_chars = ['--', ';', "'", '"', '/*', '*/']
    for char in dangerous_chars:
        if char in username or char in password:
            log_action(username, "LOGIN_INJECTION_ATTEMPT", "/api/auth/login", "Failure", source_ip)
            return jsonify({"status": "error", "msg": "Username hoặc Password chứa ký tự không hợp lệ"}), 401

    # ===== BRUTE-FORCE CHECK =====
    locked, remaining = _is_locked_out(username)
    if locked:
        log_action(username, "LOGIN_BRUTE_FORCE_BLOCKED", "/api/auth/login", "Failure", source_ip)
        return jsonify({
            "status": "error",
            "msg": f"Tài khoản bị tạm khóa do đăng nhập sai nhiều lần. Thử lại sau {remaining} giây."
        }), 429

    try:
        conn = get_taikhoan_connection()
        cur = conn.cursor()

        # Tìm user theo Username (parameterized query - safe)
        cur.execute("""
            SELECT UserID, Username, PasswordHash, FullName, Role, IsActive, EmployeeID
            FROM TaiKhoan
            WHERE Username = ?
        """, (username,))
        user = cur.fetchone()

        if not user:
            _record_failed_attempt(username)
            log_action(username, "LOGIN_FAILED", "/api/auth/login", "Failure", source_ip)
            cur.close()
            conn.close()
            return jsonify({"status": "error", "msg": "Tài khoản không tồn tại"}), 401

        user_id, db_username, password_hash, full_name, role, is_active, employee_id = (
            user[0], user[1], user[2], user[3], user[4], user[5], user[6]
        )

        # Kiểm tra tài khoản còn hoạt động
        if not is_active:
            log_action(username, "LOGIN_BLOCKED", "/api/auth/login", "Forbidden", source_ip)
            cur.close()
            conn.close()
            return jsonify({"status": "error", "msg": "Tài khoản đã bị vô hiệu hóa"}), 403

        # Kiểm tra password (bcrypt.checkpw() đã an toàn, không bị SQL injection)
        if not bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8')):
            _record_failed_attempt(username)
            log_action(username, "LOGIN_FAILED", "/api/auth/login", "Failure", source_ip)
            cur.close()
            conn.close()
            return jsonify({"status": "error", "msg": "Mật khẩu không chính xác"}), 401

        # Đăng nhập thành công — xóa failed attempts
        _clear_failed_attempts(username)

        # Tạo JWT token
        from app import app
        token = create_token(user_id, db_username, role, app.config['SECRET_KEY'], employee_id)

        # Ghi log thành công
        log_action(username, "LOGIN", "/api/auth/login", "Success", source_ip)

        cur.close()
        conn.close()

        return jsonify({
            "status": "success",
            "msg": "Đăng nhập thành công",
            "token": token,
            "user": {
                "UserID": user_id,
                "Username": db_username,
                "FullName": full_name,
                "Role": role,
                "EmployeeID": employee_id
            }
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500

@router.route("/api/auth/logout", methods=["POST"])
def logout():
    """Đăng xuất - ghi log action"""
    try:
        username = request.get_json().get("Username", "Unknown")
        source_ip = request.remote_addr
        log_action(username, "LOGOUT", "/api/auth/logout", "Success", source_ip)
        return jsonify({"status": "success", "msg": "Đăng xuất thành công"}), 200
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500

@router.route("/api/auth/verify", methods=["GET"])
def verify_token():
    """Kiểm tra tính hợp lệ của token"""
    token = None
    if 'Authorization' in request.headers:
        auth_header = request.headers['Authorization']
        try:
            token = auth_header.split(" ")[1]
        except IndexError:
            return jsonify({"status": "error", "msg": "Invalid token format"}), 401
    
    if not token:
        return jsonify({"status": "error", "msg": "Token missing"}), 401
    
    try:
        from app import app
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return jsonify({"status": "success", "user": data}), 200
    except jwt.ExpiredSignatureError:
        return jsonify({"status": "error", "msg": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"status": "error", "msg": "Invalid token"}), 401

@router.route("/api/auth/my-profile", methods=["GET"])
def my_profile():
    """Lấy hồ sơ nhân viên của user đang đăng nhập (dùng cho Employee role)"""
    # Đọc token từ header
    token = None
    if 'Authorization' in request.headers:
        try:
            token = request.headers['Authorization'].split(" ")[1]
        except IndexError:
            return jsonify({"status": "error", "msg": "Invalid token"}), 401
    if not token:
        return jsonify({"status": "error", "msg": "Token missing"}), 401
    try:
        from app import app
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        employee_id = payload.get('EmployeeID')
        username  = payload.get('Username', '')
        
        if not employee_id:
            return jsonify({
                "status": "error",
                "msg": f"Tài khoản '{username}' chưa được liên kết với nhân viên nào. Vui lòng liên hệ Admin."
            }), 404
            
    except Exception:
        return jsonify({"status": "error", "msg": "Invalid token"}), 401

    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        # Tìm employee khớp EmployeeID
        cur.execute("""
            SELECT e.EmployeeID, e.FullName, e.Email, e.DateOfBirth,
                   e.Gender, e.PhoneNumber, e.HireDate, e.Status,
                   d.DepartmentID, d.DepartmentName, p.PositionID, p.PositionName
            FROM Employees e
            LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID
            LEFT JOIN Positions   p ON e.PositionID   = p.PositionID
            WHERE e.EmployeeID = ?
        """, (employee_id,))
        r = cur.fetchone()
        cur.close()
        sql.close()
        if not r:
            return jsonify({
                "status": "error",
                "msg": f"Hồ sơ nhân viên (Mã: {employee_id}) không còn tồn tại hoặc đã bị xóa."
            }), 404
        return jsonify({
            "EmployeeID":   r[0],
            "FullName":     r[1],
            "Email":        r[2],
            "DateOfBirth":  str(r[3]) if r[3] else None,
            "Gender":       r[4],
            "PhoneNumber":  r[5],
            "HireDate":     str(r[6]) if r[6] else None,
            "Status":       r[7],
            "DepartmentID":   r[8],
            "DepartmentName": r[9],
            "PositionID":     r[10],
            "PositionName":   r[11],
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500

# ===== USER MANAGEMENT APIs (Chỉ Admin) =====

@router.route("/api/users", methods=["GET"])
def get_all_users():
    """Lấy danh sách tất cả users (chỉ Admin)"""
    try:
        conn = get_taikhoan_connection()
        cur = conn.cursor()
        # Thử lấy TempPasswordPlain nếu cột tồn tại
        try:
            cur.execute("""
                SELECT UserID, Username, FullName, Role, IsActive, CreatedAt, TempPasswordPlain, EmployeeID
                FROM TaiKhoan
                ORDER BY UserID
            """)
            has_temp_col = True
        except Exception:
            cur.execute("""
                SELECT UserID, Username, FullName, Role, IsActive, CreatedAt, NULL AS TempPasswordPlain, EmployeeID
                FROM TaiKhoan
                ORDER BY UserID
            """)
            has_temp_col = False
        rows = []
        for r in cur.fetchall():
            row_data = {
                "UserID": r[0],
                "Username": r[1],
                "FullName": r[2],
                "Role": r[3],
                "IsActive": r[4],
                "CreatedAt": str(r[5]) if r[5] else "",
                "TempPasswordPlain": r[6],
                "EmployeeID": r[7]
            }
            rows.append(row_data)
        cur.close()
        conn.close()
        return jsonify(rows), 200
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500

@router.route("/api/users", methods=["POST"])
def create_user():
    """Tạo user mới (chỉ Admin)"""
    data = request.get_json()
    username = data.get("Username", "").strip()
    password = data.get("Password", "").strip()
    full_name = data.get("FullName", "").strip()
    role = data.get("Role", "Employee")
    employee_id = data.get("EmployeeID", None)
    
    if not username or not password or not full_name:
        return jsonify({"status": "error", "msg": "Username, Password, FullName không được trống"}), 400
    
    if role not in ['Admin', 'HR Manager', 'Payroll Manager', 'Employee']:
        return jsonify({"status": "error", "msg": "Role không hợp lệ"}), 400
    
    try:
        conn = get_taikhoan_connection()
        cur = conn.cursor()
        
        # Kiểm tra username trùng
        cur.execute("SELECT COUNT(*) FROM TaiKhoan WHERE Username = ?", (username,))
        if cur.fetchone()[0] > 0:
            return jsonify({"status": "error", "msg": "Username đã tồn tại"}), 400
            
        # Kiểm tra EmployeeID đã có tài khoản chưa
        if employee_id:
            cur.execute("SELECT COUNT(*) FROM TaiKhoan WHERE EmployeeID = ?", (employee_id,))
            if cur.fetchone()[0] > 0:
                return jsonify({"status": "error", "msg": "Nhân viên này đã có tài khoản"}), 400
        
        # Mã hóa password
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(12)).decode('utf-8')
        
        # Thêm user
        cur.execute("""
            INSERT INTO TaiKhoan (Username, PasswordHash, FullName, Role, IsActive, EmployeeID)
            VALUES (?, ?, ?, ?, 1, ?)
        """, (username, password_hash, full_name, role, employee_id))
        
        conn.commit()
        cur.close()
        conn.close()
        
        source_ip = request.remote_addr
        log_action(request.get_json().get("CreatedBy", "admin"), "CREATE_USER", "/api/users", "Success", source_ip)
        
        return jsonify({"status": "success", "msg": "Tạo user thành công"}), 201
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500

@router.route("/api/users/<int:user_id>", methods=["PUT"])
def update_user(user_id):
    """Cập nhật thông tin user (chỉ Admin)"""
    data = request.get_json()
    full_name = data.get("FullName", "").strip()
    role = data.get("Role", "")
    is_active = data.get("IsActive", 1)
    employee_id = data.get("EmployeeID", None)
    
    if not full_name:
        return jsonify({"status": "error", "msg": "FullName không được trống"}), 400
    
    if role and role not in ['Admin', 'HR Manager', 'Payroll Manager', 'Employee']:
        return jsonify({"status": "error", "msg": "Role không hợp lệ"}), 400
    
    try:
        conn = get_taikhoan_connection()
        cur = conn.cursor()
        
        # Kiểm tra xem EmployeeID đã được gán cho user khác chưa
        if employee_id:
            cur.execute("SELECT COUNT(*) FROM TaiKhoan WHERE EmployeeID = ? AND UserID != ?", (employee_id, user_id))
            if cur.fetchone()[0] > 0:
                return jsonify({"status": "error", "msg": "Nhân viên này đã được gán cho tài khoản khác"}), 400
                
        if role:
            cur.execute("""
                UPDATE TaiKhoan
                SET FullName = ?, Role = ?, IsActive = ?, EmployeeID = ?
                WHERE UserID = ?
            """, (full_name, role, is_active, employee_id, user_id))
        else:
            cur.execute("""
                UPDATE TaiKhoan
                SET FullName = ?, IsActive = ?, EmployeeID = ?
                WHERE UserID = ?
            """, (full_name, is_active, employee_id, user_id))
        
        conn.commit()
        cur.close()
        conn.close()
        
        source_ip = request.remote_addr
        log_action(request.get_json().get("UpdatedBy", "admin"), "UPDATE_USER", f"/api/users/{user_id}", "Success", source_ip)
        
        return jsonify({"status": "success", "msg": "Cập nhật user thành công"}), 200
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500

@router.route("/api/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    """Xóa user (chỉ Admin)"""
    try:
        conn = get_taikhoan_connection()
        cur = conn.cursor()
        
        # Kiểm tra user tồn tại
        cur.execute("SELECT Username FROM TaiKhoan WHERE UserID = ?", (user_id,))
        user = cur.fetchone()
        if not user:
            return jsonify({"status": "error", "msg": "User không tồn tại"}), 404
        
        # Xóa user
        cur.execute("DELETE FROM TaiKhoan WHERE UserID = ?", (user_id,))
        conn.commit()
        cur.close()
        conn.close()
        
        source_ip = request.remote_addr
        log_action(request.get_json().get("DeletedBy", "admin"), "DELETE_USER", f"/api/users/{user_id}", "Success", source_ip)
        
        return jsonify({"status": "success", "msg": "Xóa user thành công"}), 200
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500

@router.route("/api/users/<int:user_id>/change-password", methods=["POST"])
def change_password(user_id):
    """Đổi mật khẩu"""
    data = request.get_json()
    old_password = data.get("OldPassword", "").strip()
    new_password = data.get("NewPassword", "").strip()
    
    if not old_password or not new_password:
        return jsonify({"status": "error", "msg": "OldPassword và NewPassword không được trống"}), 400
    
    if len(new_password) < 6:
        return jsonify({"status": "error", "msg": "Mật khẩu mới phải ít nhất 6 ký tự"}), 400
    
    try:
        conn = get_taikhoan_connection()
        cur = conn.cursor()
        
        # Lấy user
        cur.execute("SELECT PasswordHash, Username FROM TaiKhoan WHERE UserID = ?", (user_id,))
        user = cur.fetchone()
        if not user:
            return jsonify({"status": "error", "msg": "User không tồn tại"}), 404
        
        password_hash, username = user[0], user[1]
        
        # Kiểm tra mật khẩu cũ
        if not bcrypt.checkpw(old_password.encode('utf-8'), password_hash.encode('utf-8')):
            source_ip = request.remote_addr
            log_action(username, "CHANGE_PASSWORD_FAILED", f"/api/users/{user_id}/change-password", "Failure", source_ip)
            return jsonify({"status": "error", "msg": "Mật khẩu cũ không chính xác"}), 401
        
        # Mã hóa mật khẩu mới
        new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt(12)).decode('utf-8')
        
        # Cập nhật
        cur.execute("""
            UPDATE TaiKhoan
            SET PasswordHash = ?
            WHERE UserID = ?
        """, (new_password_hash, user_id))
        
        conn.commit()
        cur.close()
        conn.close()
        
        source_ip = request.remote_addr
        log_action(username, "CHANGE_PASSWORD", f"/api/users/{user_id}/change-password", "Success", source_ip)
        
        return jsonify({"status": "success", "msg": "Đổi mật khẩu thành công"}), 200
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500

@router.route("/api/users/<int:user_id>/reset-password", methods=["POST"])
def reset_password(user_id):
    """Reset mật khẩu - Admin có thể đặt mật khẩu mới trực tiếp hoặc sinh tạm"""
    try:
        req_json = request.get_json(silent=True) or {}
        new_password_plain = req_json.get("NewPassword", "").strip()
        requester = req_json.get("ResetBy", "admin")

        conn = get_taikhoan_connection()
        cur = conn.cursor()

        # Lấy user
        cur.execute("SELECT Username, FullName FROM TaiKhoan WHERE UserID = ?", (user_id,))
        user = cur.fetchone()
        if not user:
            cur.close(); conn.close()
            return jsonify({"status": "error", "msg": "User không tồn tại"}), 404

        username, full_name = user[0], user[1]

        # Dùng mật khẩu Admin nhập vào, hoặc tự sinh nếu không có
        if new_password_plain:
            if len(new_password_plain) < 6:
                cur.close(); conn.close()
                return jsonify({"status": "error", "msg": "Mật khẩu mới phải ít nhất 6 ký tự"}), 400
            password_to_set = new_password_plain
        else:
            password_to_set = generate_temp_password(12)

        new_hash = bcrypt.hashpw(password_to_set.encode('utf-8'), bcrypt.gensalt(12)).decode('utf-8')

        # Cập nhật PasswordHash (và TempPasswordPlain nếu cột tồn tại)
        try:
            cur.execute("""
                UPDATE TaiKhoan
                SET PasswordHash = ?, TempPasswordPlain = ?
                WHERE UserID = ?
            """, (new_hash, password_to_set if not new_password_plain else None, user_id))
        except Exception:
            cur.execute("""
                UPDATE TaiKhoan
                SET PasswordHash = ?
                WHERE UserID = ?
            """, (new_hash, user_id))

        conn.commit()
        cur.close()
        conn.close()

        source_ip = request.remote_addr
        log_action(requester, "RESET_PASSWORD", f"/api/users/{user_id}/reset-password", "Success", source_ip)

        return jsonify({
            "status": "success",
            "msg": f"Đặt mật khẩu mới thành công cho {full_name}",
            "tempPassword": password_to_set if not new_password_plain else None
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500




@router.route("/api/users/<int:user_id>/show-password", methods=["GET"])
def show_user_password(user_id):
    """Xem mật khẩu tạm của user (chỉ Admin)"""
    try:
        conn = get_taikhoan_connection()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT Username, FullName, TempPasswordPlain
                FROM TaiKhoan WHERE UserID = ?
            """, (user_id,))
            user = cur.fetchone()
            cur.close()
            conn.close()
            if not user:
                return jsonify({"status": "error", "msg": "User không tồn tại"}), 404
            return jsonify({
                "status": "success",
                "Username": user[0],
                "FullName": user[1],
                "TempPassword": user[2] if user[2] else "(Chưa có mật khẩu tạm - mật khẩu được đặt lúc tạo tài khoản)"
            }), 200
        except Exception:
            cur.close()
            conn.close()
            return jsonify({"status": "error", "msg": "Cột TempPasswordPlain chưa được thêm vào database. Hãy chạy lệnh ALTER TABLE TaiKhoan ADD TempPasswordPlain NVARCHAR(100);"}), 500
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500

# ===== AUDIT LOGS APIs =====

@router.route("/api/logs", methods=["GET"])
def get_logs():
    """Lấy danh sách audit logs (chỉ Admin)"""
    try:
        limit = request.args.get("limit", 100, type=int)
        offset = request.args.get("offset", 0, type=int)
        
        conn = get_taikhoan_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT LogID, Timestamp, UserID, Action, Endpoint, ResultStatus, SourceIP
            FROM Logs
            ORDER BY LogID DESC
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
        """, (offset, limit))
        
        rows = []
        for r in cur.fetchall():
            rows.append({
                "LogID": r[0],
                "Timestamp": str(r[1]) if r[1] else "",
                "UserID": r[2],
                "Action": r[3],
                "Endpoint": r[4],
                "ResultStatus": r[5],
                "SourceIP": r[6]
            })
        
        cur.close()
        conn.close()
        return jsonify(rows), 200
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500

@router.route("/api/logs/filter", methods=["GET"])
def filter_logs():
    """Lọc logs theo Action, User, hoặc ngày"""
    try:
        action = request.args.get("action", "")
        user_id = request.args.get("userID", "")
        from_date = request.args.get("fromDate", "")
        to_date = request.args.get("toDate", "")
        limit = request.args.get("limit", 100, type=int)
        
        conn = get_taikhoan_connection()
        cur = conn.cursor()
        
        query = "SELECT LogID, Timestamp, UserID, Action, Endpoint, ResultStatus, SourceIP FROM Logs WHERE 1=1"
        params = []
        
        if action:
            query += " AND Action = ?"
            params.append(action)
        if user_id:
            query += " AND UserID = ?"
            params.append(user_id)
        if from_date:
            query += " AND Timestamp >= ?"
            params.append(from_date)
        if to_date:
            query += " AND Timestamp <= ?"
            params.append(to_date)
        
        query += " ORDER BY LogID DESC"
        
        cur.execute(query, params)
        
        rows = []
        for r in cur.fetchall():
            rows.append({
                "LogID": r[0],
                "Timestamp": str(r[1]) if r[1] else "",
                "UserID": r[2],
                "Action": r[3],
                "Endpoint": r[4],
                "ResultStatus": r[5],
                "SourceIP": r[6]
            })
        
        cur.close()
        conn.close()
        return jsonify(rows), 200
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500

#Cac API sau
@router.route("/api/departments")
def get_departments():
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor() # dùng để thực thi câu lệnh sql
        cur.execute("""
            SELECT DepartmentID, DepartmentName
            From Departments
            ORDER BY DepartmentName
        """)
        rows = [
            {"DepartmentID": r[0], "DepartmentName": r[1]}
            for r in cur.fetchall() #trả toàn bộ kết quả từ DB
        ]
        cur.close()
        sql.close()
        return jsonify(rows)
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500

@router.route("/api/positions")
def get_positions():
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        cur.execute("""
            SELECT PositionID, PositionName
            FROM Positions
            ORDER BY PositionName
        """)
        rows = [
            {"PositionID": r[0], "PositionName": r[1]}
            for r in cur.fetchall()
        ]
        cur.close()
        sql.close()
        return jsonify(rows)
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500

# ===== CRUD Departments =====

@router.route("/api/departments", methods=["POST"])
def add_department():
    data = request.get_json()
    name = data.get("DepartmentName", "").strip()
    if not name:
        return jsonify({"status": "error", "msg": "Tên phòng ban không được trống"}), 400
    sql = get_sqlserver_connection()
    cur = sql.cursor()
    try:
        cur.execute("INSERT INTO Departments (DepartmentName) VALUES (?)", (name,))
        sql.commit()
    except Exception as e:
        sql.rollback()
        return jsonify({"status": "error", "msg": str(e)}), 500
    return jsonify({"status": "success", "msg": "Thêm phòng ban thành công"})

@router.route("/api/departments/<int:dept_id>", methods=["PUT"])
def update_department(dept_id):
    data = request.get_json()
    name = data.get("DepartmentName", "").strip()
    if not name:
        return jsonify({"status": "error", "msg": "Tên phòng ban không được trống"}), 400
    sql = get_sqlserver_connection()
    cur = sql.cursor()
    try:
        cur.execute("UPDATE Departments SET DepartmentName = ? WHERE DepartmentID = ?", (name, dept_id))
        sql.commit()
    except Exception as e:
        sql.rollback()
        return jsonify({"status": "error", "msg": str(e)}), 500
    return jsonify({"status": "success", "msg": "Cập nhật phòng ban thành công"})

@router.route("/api/departments/<int:dept_id>", methods=["DELETE"])
def delete_department(dept_id):
    sql = get_sqlserver_connection()
    cur = sql.cursor()
    try:
        # Check ràng buộc: nếu có nhân viên thuộc phòng ban -> không xóa
        cur.execute("SELECT COUNT(*) FROM Employees WHERE DepartmentID = ?", (dept_id,))
        if cur.fetchone()[0] > 0:
            return jsonify({"status": "error", "msg": "Không thể xoá – phòng ban có nhân viên"}), 400
        cur.execute("DELETE FROM Departments WHERE DepartmentID = ?", (dept_id,))
        sql.commit()
    except Exception as e:
        sql.rollback()
        return jsonify({"status": "error", "msg": str(e)}), 500
    return jsonify({"status": "success", "msg": "Xoá phòng ban thành công"})

# ===== CRUD Positions =====

@router.route("/api/positions", methods=["POST"])
def add_position():
    data = request.get_json()
    name = data.get("PositionName", "").strip()
    if not name:
        return jsonify({"status": "error", "msg": "Tên chức vụ không được trống"}), 400
    sql = get_sqlserver_connection()
    cur = sql.cursor()
    try:
        cur.execute("INSERT INTO Positions (PositionName) VALUES (?)", (name,))
        sql.commit()
    except Exception as e:
        sql.rollback()
        return jsonify({"status": "error", "msg": str(e)}), 500
    return jsonify({"status": "success", "msg": "Thêm chức vụ thành công"})

@router.route("/api/positions/<int:pos_id>", methods=["PUT"])
def update_position(pos_id):
    data = request.get_json()
    name = data.get("PositionName", "").strip()
    if not name:
        return jsonify({"status": "error", "msg": "Tên chức vụ không được trống"}), 400
    sql = get_sqlserver_connection()
    cur = sql.cursor()
    try:
        cur.execute("UPDATE Positions SET PositionName = ? WHERE PositionID = ?", (name, pos_id))
        sql.commit()
    except Exception as e:
        sql.rollback()
        return jsonify({"status": "error", "msg": str(e)}), 500
    return jsonify({"status": "success", "msg": "Cập nhật chức vụ thành công"})

@router.route("/api/positions/<int:pos_id>", methods=["DELETE"])
def delete_position(pos_id):
    sql = get_sqlserver_connection()
    cur = sql.cursor()
    try:
        # Check ràng buộc: nếu có nhân viên thuộc chức vụ -> không xóa
        cur.execute("SELECT COUNT(*) FROM Employees WHERE PositionID = ?", (pos_id,))
        if cur.fetchone()[0] > 0:
            return jsonify({"status": "error", "msg": "Không thể xoá – chức vụ có nhân viên"}), 400
        cur.execute("DELETE FROM Positions WHERE PositionID = ?", (pos_id,))
        sql.commit()
    except Exception as e:
        sql.rollback()
        return jsonify({"status": "error", "msg": str(e)}), 500
    return jsonify({"status": "success", "msg": "Xoá chức vụ thành công"})

@router.route("/api/employees")
def get_employees():
    sql = get_sqlserver_connection()
    cur = sql.cursor()
    cur.execute("""
        SELECT e.EmployeeID, e.FullName, d.DepartmentName, p.PositionName, e.Status
        FROM Employees e
        LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID
        LEFT JOIN Positions p ON e.PositionID = p.PositionID
        ORDER BY e.EmployeeID
    """)
    rows = []
    for r in cur.fetchall():
        rows.append({
            "EmployeeID": r[0],
            "FullName": r[1],
            "Department": r[2],
            "Position": r[3],
            "Status": r[4]
        })
    cur.close()
    sql.close()
    return jsonify(rows)

@router.route("/api/employees/<int:emp_id>")
def get_employee_detail(emp_id):
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        cur.execute("""
            SELECT e.EmployeeID, e.FullName, e.Email, e.DateOfBirth, 
                e.Gender, e.PhoneNumber, e.HireDate, e.Status,
                d.DepartmentID, d.DepartmentName, p.PositionID, p.PositionName
            FROM Employees e
            LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID
            LEFT JOIN Positions p ON e.PositionID = p.PositionID
            WHERE EmployeeID = ?
        """, (emp_id,))
        r = cur.fetchone() #lấy 1 dòng duy nhất
        cur.close()
        sql.close()
        if not r:
            return jsonify({"msg": "Employee not found"}), 404
        return jsonify({
            "EmployeeID": r[0],
            "FullName": r[1],
            "Email": r[2],
            "DateOfBirth": r[3],
            "Gender": r[4],
            "PhoneNumber": r[5],
            "HireDate": r[6],
            "Status": r[7], 
            "DepartmentID": r[8],
            "DepartmentName": r[9], 
            "PositionID": r[10], 
            "PositionName": r[11]
        })
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500

@router.route("/api/employees", methods=["POST"])
def add_employee():
    data = request.get_json()
    full_name = data.get("FullName")
    dob = data.get("DateOfBirth")
    gender	= data.get("Gender") 
    phone	= data.get("PhoneNumber") 
    email	= data.get("Email") 
    hire_date = data.get("HireDate")
    dept_id	= data.get("DepartmentID") or None
    pos_id	= data.get("PositionID") or None
    status	= data.get("Status") or "Active"
    #Check email trùng
    sql = get_sqlserver_connection()
    cur = sql.cursor()
    cur.execute("SELECT COUNT(*) FROM Employees WHERE Email = ?", (email,))
    if cur.fetchone()[0] >0:
        return jsonify({"status": "error", "msg": "Email đã tồn tại"}), 400
    #Bỏ vào 2 data
    my = get_mysql_connection()
    sql.autocommit = False #sql server chờ commit
    my.start_transaction() #bắt đầu transaction() cho mysql
    try:
        #Insert sql server và lấy employeeid mới
        cur.execute("""
            INSERT INTO Employees
            (FullName, DateOfBirth,Gender ,PhoneNumber,
            Email,HireDate,DepartmentID,PositionID,Status)
            OUTPUT INSERTED.EmployeeID
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (full_name,dob,gender,phone,email,
        hire_date,dept_id,pos_id,status))
        #lay id moi
        row = cur.fetchone() 
        new_id = int(row[0])
        #insert mysql
        my_cur = my.cursor(dictionary=True)
        my_cur.execute("""
            INSERT INTO employees_payroll
            (EmployeeID, FullName, DepartmentID, PositionID, Status)
            VALUES (%s, %s, %s, %s, %s)
        """,(new_id, full_name, dept_id,pos_id,status))
        sql.commit()
        my.commit()
    except Exception as e:
        sql.rollback()
        my.rollback()
        return jsonify({"status": "error", "msg": str(e)}), 500
    return jsonify({"status": "success", 
        "msg": f"Thêm nhân viên thành công (ID = {new_id})" })

@router.route("/api/employees/<int:emp_id>", methods=["PUT"])
def update_employee(emp_id):
    data = request.get_json()
    full_name = data.get("FullName")
    dob = data.get("DateOfBirth")
    gender = data.get("Gender")
    phone = data.get("PhoneNumber")
    email = data.get("Email")
    hire_date = data.get("HireDate")
    dept_id = data.get("DepartmentID")
    pos_id = data.get("PositionID")
    status = data.get("Status")
    sql = get_sqlserver_connection()
    my = get_mysql_connection()
    sql.autocommit = False
    my.start_transaction()
    try:
        #Update sql server
        cur = sql.cursor()
        cur.execute("""
            UPDATE Employees
            SET FullName = ?, DateOfBirth = ?, Gender = ?,
                PhoneNumber = ?, Email = ?, HireDate = ?,
                DepartmentID = ?, PositionID = ?, Status = ?
            WHERE EmployeeID = ?
                    """, (full_name, dob, gender, phone, email, hire_date, 
                          dept_id, pos_id, status, emp_id))
        #Update mysql
        my_cur = my.cursor()
        my_cur.execute("""
            UPDATE employees_payroll
            SET FullName = %s, DepartmentID = %s, PositionID = %s, Status = %s
            WHERE EmployeeID = %s
        """, (full_name, dept_id, pos_id, status, emp_id))
        sql.commit()
        my.commit()
    except Exception as e:
        sql.rollback()
        my.rollback()
        return jsonify({"status": "error", "msg": str(e)}), 500
    return jsonify({"status": "success", "msg": "Update thành công"})
@router.route("/api/employees/<int:emp_id>", methods=["DELETE"])
def delete_employee(emp_id):
    sql = get_sqlserver_connection()
    my = get_mysql_connection()
    sql.autocommit = False
    my.start_transaction()
    try:
        #Delete sql server
        cur = sql.cursor()
        #Check ràng buộc: nếu nhân viên có dividends -> không xóa
        cur.execute("SELECT COUNT(*) FROM Dividends WHERE EmployeeID = ?", (emp_id,))
        if cur.fetchone()[0] > 0:
            return jsonify({"status": "error", 
                "msg": "Không thể xoá – nhân viên có Dividends"}), 400
        cur.execute("DELETE FROM Employees WHERE EmployeeID = ?", (emp_id,))
        #Delete mysql
        my_cur = my.cursor()
        my_cur.execute("DELETE FROM employees_payroll WHERE EmployeeID = %s", (emp_id,))
        my_cur.execute("DELETE FROM attendance WHERE EmployeeID = %s", (emp_id,))
        my_cur.execute("DELETE FROM salaries WHERE EmployeeID = %s", (emp_id,))
        sql.commit()
        my.commit()
    except Exception as e:
        sql.rollback()
        my.rollback()
        return jsonify({"status": "error", "msg": str(e)}), 500
    return jsonify({"status": "success", "msg": "Xoá thành công"})

# ===== PAYROLL APIs (MySQL) =====

@router.route("/api/salaries")
def get_salaries():
    """Lấy bảng lương theo tháng - từ MySQL PAYROLL"""
    month = request.args.get("month")  # format: 2024-09
    my = None
    try:
        my = get_mysql_connection()
        cur = my.cursor(dictionary=True)
        if month:
            # Chuyển '2024-09' thành '2024-09-01'
            cur.execute("""
                SELECT s.SalaryID, s.EmployeeID, ep.FullName,
                       dp.DepartmentName,
                       s.SalaryMonth, s.BaseSalary, s.Bonus, 
                       s.Deductions, s.NetSalary, s.CreatedAt
                FROM salaries s
                LEFT JOIN employees_payroll ep ON s.EmployeeID = ep.EmployeeID
                LEFT JOIN departments_payroll dp ON ep.DepartmentID = dp.DepartmentID
                WHERE s.SalaryMonth = %s
                ORDER BY s.EmployeeID
            """, (month + "-01",))
        else:
            cur.execute("""
                SELECT s.SalaryID, s.EmployeeID, ep.FullName,
                       dp.DepartmentName,
                       s.SalaryMonth, s.BaseSalary, s.Bonus, 
                       s.Deductions, s.NetSalary, s.CreatedAt
                FROM salaries s
                LEFT JOIN employees_payroll ep ON s.EmployeeID = ep.EmployeeID
                LEFT JOIN departments_payroll dp ON ep.DepartmentID = dp.DepartmentID
                ORDER BY s.SalaryMonth DESC, s.EmployeeID
            """)
        rows = cur.fetchall()
        # Convert Decimal/date to serializable
        for r in rows:
            r["BaseSalary"] = float(r["BaseSalary"]) if r["BaseSalary"] else 0
            r["Bonus"] = float(r["Bonus"]) if r["Bonus"] else 0
            r["Deductions"] = float(r["Deductions"]) if r["Deductions"] else 0
            r["NetSalary"] = float(r["NetSalary"]) if r["NetSalary"] else 0
            r["SalaryMonth"] = str(r["SalaryMonth"]) if r["SalaryMonth"] else ""
            r["CreatedAt"] = str(r["CreatedAt"]) if r["CreatedAt"] else ""
        return jsonify(rows)
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500
    finally:
        if my:
            my.close()

@router.route("/api/attendance")
def get_attendance():
    """Lấy dữ liệu chấm công theo tháng - từ MySQL PAYROLL"""
    month = request.args.get("month")  # format: 2024-09
    my = None
    try:
        my = get_mysql_connection()
        cur = my.cursor(dictionary=True)
        if month:
            cur.execute("""
                SELECT a.AttendanceID, a.EmployeeID, ep.FullName,
                       a.WorkDays, a.AbsentDays, a.LeaveDays,
                       a.AttendanceMonth, a.CreatedAt
                FROM attendance a
                LEFT JOIN employees_payroll ep ON a.EmployeeID = ep.EmployeeID
                WHERE a.AttendanceMonth = %s
                ORDER BY a.EmployeeID
            """, (month + "-01",))
        else:
            cur.execute("""
                SELECT a.AttendanceID, a.EmployeeID, ep.FullName,
                       a.WorkDays, a.AbsentDays, a.LeaveDays,
                       a.AttendanceMonth, a.CreatedAt
                FROM attendance a
                LEFT JOIN employees_payroll ep ON a.EmployeeID = ep.EmployeeID
                ORDER BY a.AttendanceMonth DESC, a.EmployeeID
            """)
        rows = cur.fetchall()
        for r in rows:
            r["AttendanceMonth"] = str(r["AttendanceMonth"]) if r["AttendanceMonth"] else ""
            r["CreatedAt"] = str(r["CreatedAt"]) if r["CreatedAt"] else ""
        return jsonify(rows)
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500
    finally:
        if my:
            my.close()

@router.route("/api/payroll-summary")
def get_payroll_summary():
    """Tổng hợp payroll cho Dashboard - từ MySQL PAYROLL"""
    my = None
    try:
        my = get_mysql_connection()
        cur = my.cursor(dictionary=True)
        # Tổng chi lương tháng gần nhất
        cur.execute("""
            SELECT SalaryMonth, SUM(NetSalary) as TotalNetSalary, COUNT(*) as TotalEmployees
            FROM salaries
            GROUP BY SalaryMonth
            ORDER BY SalaryMonth DESC
            LIMIT 1
        """)
        salary_row = cur.fetchone()

        # Tỷ lệ chấm công tháng gần nhất
        cur.execute("""
            SELECT AttendanceMonth, 
                   SUM(WorkDays) as TotalWorkDays, 
                   SUM(AbsentDays) as TotalAbsentDays,
                   SUM(LeaveDays) as TotalLeaveDays,
                   COUNT(*) as TotalEmployees
            FROM attendance
            GROUP BY AttendanceMonth
            ORDER BY AttendanceMonth DESC
            LIMIT 1
        """)
        attend_row = cur.fetchone()

        result = {
            "totalNetSalary": float(salary_row["TotalNetSalary"]) if salary_row else 0,
            "salaryMonth": str(salary_row["SalaryMonth"]) if salary_row else "",
            "salaryEmployees": salary_row["TotalEmployees"] if salary_row else 0,
        }
        if attend_row:
            total = attend_row["TotalWorkDays"] + attend_row["TotalAbsentDays"] + attend_row["TotalLeaveDays"]
            rate = round((attend_row["TotalWorkDays"] / total * 100), 1) if total > 0 else 0
            result["attendanceRate"] = rate
            result["attendanceMonth"] = str(attend_row["AttendanceMonth"])
            result["attendanceEmployees"] = attend_row["TotalEmployees"]
        else:
            result["attendanceRate"] = 0
            result["attendanceMonth"] = ""
            result["attendanceEmployees"] = 0

        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500
    finally:
        if my:
            my.close()

@router.route("/api/alerts")
def get_alerts():
    """Cảnh báo hệ thống tự động - từ cả 2 database"""
    alerts = []
    sql = None
    my = None
    try:
        # 1. Birthday alerts từ SQL Server
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        cur.execute("""
            SELECT EmployeeID, FullName, DateOfBirth, HireDate
            FROM Employees
            WHERE Status = 'Active'
        """)
        from datetime import datetime, date
        today = date.today()
        for r in cur.fetchall():
            emp_id, name, dob, hire_date = r[0], r[1], r[2], r[3]
            # Birthday check
            if dob:
                if isinstance(dob, str):
                    try: dob = datetime.strptime(dob.split('T')[0], '%Y-%m-%d').date()
                    except: dob = None
                elif isinstance(dob, datetime):
                    dob = dob.date()
                if dob and dob.month == today.month and dob.day == today.day:
                    alerts.append({
                        "type": "birthday",
                        "severity": "info",
                        "icon": "🎂",
                        "title": f"Sinh nhật {name}",
                        "message": f"Nhân viên #{emp_id} - {name} có sinh nhật hôm nay!",
                        "employeeId": emp_id,
                        "date": str(today)
                    })
                # Birthday this month
                elif dob and dob.month == today.month and dob.day > today.day:
                    alerts.append({
                        "type": "birthday",
                        "severity": "info",
                        "icon": "🎂",
                        "title": f"Sinh nhật sắp tới: {name}",
                        "message": f"Nhân viên #{emp_id} - {name} sinh nhật ngày {dob.day}/{dob.month}",
                        "employeeId": emp_id,
                        "date": str(dob.replace(year=today.year))
                    })
            # Work anniversary check
            if hire_date:
                if isinstance(hire_date, str):
                    try: hire_date = datetime.strptime(hire_date.split('T')[0], '%Y-%m-%d').date()
                    except: hire_date = None
                elif isinstance(hire_date, datetime):
                    hire_date = hire_date.date()
                if hire_date and hire_date.month == today.month and hire_date.day == today.day and hire_date.year < today.year:
                    years = today.year - hire_date.year
                    alerts.append({
                        "type": "anniversary",
                        "severity": "info",
                        "icon": "🎉",
                        "title": f"Kỷ niệm {years} năm: {name}",
                        "message": f"Nhân viên #{emp_id} - {name} đã làm việc {years} năm",
                        "employeeId": emp_id,
                        "date": str(today)
                    })
        sql.close()
        sql = None

        # 2. Attendance alerts từ MySQL
        my = get_mysql_connection()
        my_cur = my.cursor(dictionary=True)
        my_cur.execute("""
            SELECT a.EmployeeID, ep.FullName, 
                   SUM(a.AbsentDays) as TotalAbsent,
                   SUM(a.LeaveDays) as TotalLeave
            FROM attendance a
            LEFT JOIN employees_payroll ep ON a.EmployeeID = ep.EmployeeID
            GROUP BY a.EmployeeID, ep.FullName
            HAVING TotalAbsent > 2 OR TotalLeave > 3
        """)
        for r in my_cur.fetchall():
            total_off = (r["TotalAbsent"] or 0) + (r["TotalLeave"] or 0)
            sev = "critical" if total_off > 8 else ("warning" if total_off > 4 else "info")
            alerts.append({
                "type": "absence",
                "severity": sev,
                "icon": "⚠️" if sev != "info" else "📋",
                "title": f"Nghỉ quá nhiều: {r['FullName'] or 'NV #' + str(r['EmployeeID'])}",
                "message": f"NV #{r['EmployeeID']} nghỉ {r['TotalAbsent']} ngày vắng + {r['TotalLeave']} ngày phép",
                "employeeId": r["EmployeeID"],
                "date": str(today)
            })

        # 3. Salary anomaly alerts
        my_cur.execute("""
            SELECT s.EmployeeID, ep.FullName, s.NetSalary, s.BaseSalary
            FROM salaries s
            LEFT JOIN employees_payroll ep ON s.EmployeeID = ep.EmployeeID
            WHERE s.NetSalary > s.BaseSalary * 1.5 OR s.NetSalary < s.BaseSalary * 0.5
        """)
        for r in my_cur.fetchall():
            alerts.append({
                "type": "salary_anomaly",
                "severity": "warning",
                "icon": "💰",
                "title": f"Bất thường lương: {r['FullName'] or 'NV #' + str(r['EmployeeID'])}",
                "message": f"NV #{r['EmployeeID']} lương thực nhận bất thường so với lương cơ bản",
                "employeeId": r["EmployeeID"],
                "date": str(today)
            })

        # Sort: critical first, then warning, then info
        severity_order = {"critical": 0, "warning": 1, "info": 2}
        alerts.sort(key=lambda a: severity_order.get(a["severity"], 3))

        return jsonify(alerts)
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500
    finally:
        if sql:
            sql.close()
        if my:
            my.close()