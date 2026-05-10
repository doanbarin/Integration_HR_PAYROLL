import pyodbc
import mysql.connector

def get_sqlserver_connection():
    try:
        conn = pyodbc.connect(
            "DRIVER={ODBC Driver 17 for SQL Server};"
            "SERVER=Hikari;"
            "DATABASE=HUMAN_2025;"
            "UID=sa;"
            "PWD=1;",
            timeout=5
        )
        return conn
    except Exception as e:
        print("Lỗi kết nối SQL Server:", str(e))
        raise

def get_mysql_connection():
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="Hikari",
            password="1",
            database="PAYROLL_2026",
            autocommit=False
        )
        return conn
    except Exception as e:
        print("Lỗi kết nối MySQL:", str(e))
        raise