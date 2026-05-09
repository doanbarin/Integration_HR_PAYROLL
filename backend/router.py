from flask import Blueprint, jsonify, request
from config import get_sqlserver_connection, get_mysql_connection

router = Blueprint("router", __name__)

#Cac API sau
@router.route("/api/departments")
def get_departments():
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
    return jsonify(rows)

@router.route("/api/positions")
def get_positions():
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
    return jsonify(rows)

@router.route("/api/employees")
def get_employees():
    sql = get_sqlserver_connection()
    cur = sql.cursor()
    cur.execute("""
        SELECT e.EmployeeID, e.FullName, d.DepartmentName, p.PositionName
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
            "Position": r[3]
        })
    return jsonify(rows)

@router.route("/api/employees/<int:emp_id>")
def get_employee_detail(emp_id):
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