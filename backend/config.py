import pyodbc
import mysql.connector

def get_sqlserver_connection():
    try:
        conn = pyodbc.connect(
            r"DRIVER={ODBC Driver 17 for SQL Server};"
            r"SERVER=localhost\SQLEXPRESS2025;"
            r"DATABASE=HUMAN_2025;"
            r"UID=sa;"
            r"PWD=123456;",
            timeout=5
        )
        return conn
    except Exception as e:
        print("Lỗi kết nối SQL Server HUMAN_2025:", str(e))
        raise

def get_mysql_connection():
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="123456", # Nếu vẫn lỗi 1045, bạn hãy thử đổi thành password=""
            database="payroll_2026",
            autocommit=False
        )
        return conn
    except Exception as e:
        print("Lỗi kết nối MySQL:", str(e))
        raise

def get_taikhoan_connection():
    try:
        conn = pyodbc.connect(
            r"DRIVER={ODBC Driver 17 for SQL Server};"
            r"SERVER=localhost\SQLEXPRESS2025;"
            r"DATABASE=TAIKHOAN;"
            r"UID=sa;"
            r"PWD=123456;",
            timeout=5
        )
        return conn
    except Exception as e:
        print("Lỗi kết nối SQL Server TAIKHOAN:", str(e))
        raise