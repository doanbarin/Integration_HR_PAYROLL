-- =====================================================
-- Script: Thêm cột TempPasswordPlain vào bảng TaiKhoan
-- Database: TAIKHOAN
-- Chạy script này 1 lần duy nhất trong SQL Server Management Studio
-- =====================================================

USE TAIKHOAN;
GO

-- Kiểm tra xem cột đã tồn tại chưa trước khi thêm
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'TaiKhoan' AND COLUMN_NAME = 'TempPasswordPlain'
)
BEGIN
    ALTER TABLE TaiKhoan
    ADD TempPasswordPlain NVARCHAR(100) NULL;
    
    PRINT 'Đã thêm cột TempPasswordPlain thành công!';
END
ELSE
BEGIN
    PRINT 'Cột TempPasswordPlain đã tồn tại rồi.';
END
GO
