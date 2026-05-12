from flask import Flask, render_template, request, jsonify
from functools import wraps
import jwt
from router import router #import API
from flask_cors import CORS
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

# ===== JWT Configuration =====
app.config['SECRET_KEY'] = 'your_secret_key_here_change_in_production_123456'
app.config['JWT_ALGORITHM'] = 'HS256'
app.config['JWT_EXPIRATION_HOURS'] = 24

# Middleware: Kiểm tra JWT token cho các API cần bảo vệ
def token_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Lấy token từ headers
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # "Bearer <token>"
            except IndexError:
                return jsonify({"status": "error", "msg": "Invalid token format"}), 401
        
        if not token:
            return jsonify({"status": "error", "msg": "Token missing"}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=[app.config['JWT_ALGORITHM']])
            request.user = data  # Lưu user info vào request
        except jwt.ExpiredSignatureError:
            return jsonify({"status": "error", "msg": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"status": "error", "msg": "Invalid token"}), 401
        
        return f(*args, **kwargs)
    return decorated_function

app.register_blueprint(router) #dangky router API

@app.route("/")
def index():
    return render_template("employees.html")

@app.route("/employees/add")
def employees_add_page():
    return render_template("employee_add.html")

@app.route("/employees/<int:emp_id>")
def employee_edit_page(emp_id):
    return render_template("employee_edit.html", emp_id=emp_id)

if __name__ == "__main__":
    app.run(debug=True)
