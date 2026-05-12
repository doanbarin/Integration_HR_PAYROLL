import pyodbc
import mysql.connector

def get_sqlserver_connection():
    try:
        conn = pyodbc.connect(
            "DRIVER={ODBC Driver 17 for SQL Server};"
            "SERVER=localhost;"
            "DATABASE=HUMAN_2025;"
            "UID=sa;"
            "PWD=123456;",
            timeout=5
        )
        return conn
    except Exception as e:
        print("Lỗi kết nối SQL Server:", str(e))
        raise

def get_taikhoan_connection():
    """Kết nối tới database TAIKHOAN (dành cho Authentication & User Management)"""
    try:
        conn = pyodbc.connect(
            "DRIVER={ODBC Driver 17 for SQL Server};"
            "SERVER=localhost;"
            "DATABASE=TAIKHOAN;"
            "UID=sa;"
            "PWD=123456;",
            timeout=5
        )
        return conn
    except Exception as e:
        print("Lỗi kết nối TAIKHOAN:", str(e))
        raise

def get_mysql_connection():
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="123456",
            database="payroll_2026",
            autocommit=False
        )
        return conn
    except Exception as e:
        print("Lỗi kết nối MySQL:", str(e))
        raise