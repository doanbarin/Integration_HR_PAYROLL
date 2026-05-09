from flask import Flask, render_template
from router import router #import API
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
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
