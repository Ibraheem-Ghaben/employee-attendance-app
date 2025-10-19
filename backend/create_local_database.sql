-- ============================================================
-- Employee Attendance System - Local Database Setup
-- Create Local Database for User Authentication
-- ============================================================

-- Create Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'AttendanceAuthDB')
BEGIN
    CREATE DATABASE AttendanceAuthDB;
    PRINT 'Database AttendanceAuthDB created successfully.';
END
ELSE
BEGIN
    PRINT 'Database AttendanceAuthDB already exists.';
END
GO

USE AttendanceAuthDB;
GO

-- ============================================================
-- Create Users Table
-- ============================================================

IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
BEGIN
    PRINT 'Users table already exists. Skipping creation.';
END
ELSE
BEGIN
    CREATE TABLE dbo.Users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        employee_code VARCHAR(50) NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'supervisor', 'employee')),
        full_name NVARCHAR(200) NOT NULL,
        email VARCHAR(100) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        last_login DATETIME2 NULL,
        CONSTRAINT UK_Users_EmployeeCode UNIQUE (employee_code)
    );

    -- Create indexes for performance
    CREATE INDEX IX_Users_Username ON dbo.Users(username);
    CREATE INDEX IX_Users_EmployeeCode ON dbo.Users(employee_code);
    CREATE INDEX IX_Users_Role ON dbo.Users(role);

    PRINT 'Users table created successfully.';
END
GO

-- ============================================================
-- Insert Default Users
-- Password: MSS@2024 (hashed with bcrypt)
-- ============================================================

-- Check if admin user exists
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE username = 'admin')
BEGIN
    -- Admin User
    INSERT INTO dbo.Users (username, password, employee_code, role, full_name, email, is_active)
    VALUES ('admin', '$2a$10$rXQVvGZLxvY5dR5Pz3HYxOyK0KjN9Q2mL3.pW6zK8XvNj7RqT9dHm', NULL, 'admin', 'System Administrator', 'admin@mss.com', 1);
    PRINT 'Admin user created.';
END

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE username = 'supervisor')
BEGIN
    -- Supervisor User
    INSERT INTO dbo.Users (username, password, employee_code, role, full_name, email, is_active)
    VALUES ('supervisor', '$2a$10$rXQVvGZLxvY5dR5Pz3HYxOyK0KjN9Q2mL3.pW6zK8XvNj7RqT9dHm', '080001', 'supervisor', 'Supervisor User', 'supervisor@mss.com', 1);
    PRINT 'Supervisor user created.';
END

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE username = 'employee1')
BEGIN
    -- Employee User 1 (Ihab Qais Nabhan Qatusa)
    INSERT INTO dbo.Users (username, password, employee_code, role, full_name, email, is_active)
    VALUES ('employee1', '$2a$10$rXQVvGZLxvY5dR5Pz3HYxOyK0KjN9Q2mL3.pW6zK8XvNj7RqT9dHm', '080165', 'employee', 'Ihab Qais Nabhan Qatusa', 'ihab.qatusa@mss.com', 1);
    PRINT 'Employee1 user created.';
END

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE username = 'employee2')
BEGIN
    -- Employee User 2 (Mohammad Yasin Ali Yasin)
    INSERT INTO dbo.Users (username, password, employee_code, role, full_name, email, is_active)
    VALUES ('employee2', '$2a$10$rXQVvGZLxvY5dR5Pz3HYxOyK0KjN9Q2mL3.pW6zK8XvNj7RqT9dHm', '080416', 'employee', 'Mohammad Yasin Ali Yasin', 'mohammad.yasin@mss.com', 1);
    PRINT 'Employee2 user created.';
END

GO

-- ============================================================
-- Verify Installation
-- ============================================================

PRINT '';
PRINT '============================================================';
PRINT 'Database Setup Complete!';
PRINT '============================================================';
PRINT '';

SELECT 
    id,
    username,
    employee_code,
    role,
    full_name,
    email,
    is_active,
    created_at
FROM dbo.Users
ORDER BY id;

PRINT '';
PRINT '============================================================';
PRINT 'Default Login Credentials:';
PRINT '============================================================';
PRINT 'Username: admin       | Password: MSS@2024 | Role: Admin';
PRINT 'Username: supervisor  | Password: MSS@2024 | Role: Supervisor (Employee: 080001)';
PRINT 'Username: employee1   | Password: MSS@2024 | Role: Employee (080165)';
PRINT 'Username: employee2   | Password: MSS@2024 | Role: Employee (080416)';
PRINT '';
PRINT 'IMPORTANT: Change default passwords in production!';
PRINT '============================================================';
GO

