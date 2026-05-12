# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pyodbc
import bcrypt

conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=localhost;"
    "DATABASE=TAIKHOAN;"
    "UID=sa;"
    "PWD=123456;",
    timeout=5
)
cur = conn.cursor()

print("=" * 60)
print("CHAN DOAN BANG TaiKhoan")
print("=" * 60)

# 1. Kiem tra do dai cot PasswordHash
cur.execute("""
    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'TaiKhoan' AND COLUMN_NAME = 'PasswordHash'
""")
col_info = cur.fetchone()
if col_info:
    print(f"\n[COT] PasswordHash: {col_info[1]}({col_info[2]})")
    if col_info[2] and col_info[2] < 60:
        print(f"  >>> LOI: Cot qua ngan! Bcrypt can toi thieu 60 ky tu.")
    else:
        print(f"  OK: Do dai cot du")

# 2. Lay hash thuc te tu DB va kiem tra do dai
print("\n[USERS] Danh sach va do dai hash:")
cur.execute("SELECT UserID, Username, PasswordHash FROM TaiKhoan")
users = cur.fetchall()
for u in users:
    hash_len = len(u[2]) if u[2] else 0
    status = "OK (60)" if hash_len == 60 else f"TRUNCATED ({hash_len} ky tu) <-- LOI"
    print(f"  - [{u[0]}] {u[1]}: hash length = {hash_len} -- {status}")

# 3. Sua cot neu can
print("\n[FIX] Kiem tra va sua do dai cot...")
if col_info and col_info[2] and col_info[2] < 100:
    print("  >> Dang ALTER cot PasswordHash thanh NVARCHAR(100)...")
    cur.execute("ALTER TABLE TaiKhoan ALTER COLUMN PasswordHash NVARCHAR(100) NOT NULL")
    conn.commit()
    print("  DONE: Da sua cot!")
else:
    print("  OK: Cot da du dai, khong can sua")

# 4. Reset mat khau cho tat ca user ve "123456"
print("\n[RESET] Dat lai mat khau ve '123456' cho tat ca user...")
new_pass = "123456"
new_hash = bcrypt.hashpw(new_pass.encode('utf-8'), bcrypt.gensalt(12)).decode('utf-8')
print(f"  Hash moi ({len(new_hash)} ky tu): {new_hash[:30]}...")

cur.execute("UPDATE TaiKhoan SET PasswordHash = ?", (new_hash,))
conn.commit()
print(f"  DONE: Da reset {cur.rowcount} tai khoan ve mat khau: 123456")

# 5. Verify lai
print("\n[VERIFY] Kiem tra lai sau khi reset:")
cur.execute("SELECT UserID, Username, PasswordHash FROM TaiKhoan")
users_after = cur.fetchall()
test_pass = "123456"
for u in users_after:
    ok = bcrypt.checkpw(test_pass.encode('utf-8'), u[2].encode('utf-8'))
    print(f"  - [{u[0]}] {u[1]}: verify '123456' -> {'DUNG' if ok else 'SAI'}")

cur.close()
conn.close()

print("\n" + "=" * 60)
print("XONG! Thu dang nhap lai voi mat khau: 123456")
print("=" * 60)
