-- ============================================================
-- Admin Extensions Schema: periods, adjustments, guards
-- ============================================================

USE AttendanceAuthDB;
GO

-- Extend SitePayConfig (workweek & optional fields)
IF COL_LENGTH('dbo.SitePayConfig', 'break_minutes') IS NULL
  ALTER TABLE dbo.SitePayConfig ADD break_minutes INT NULL, grace_in INT NULL, grace_out INT NULL,
    rounding_mode VARCHAR(20) NULL, rounding_step INT NULL;
GO

-- Extend EmployeePayConfig (status/pay_type/daily_rate)
IF COL_LENGTH('dbo.EmployeePayConfig', 'status') IS NULL
  ALTER TABLE dbo.EmployeePayConfig ADD status VARCHAR(16) NOT NULL CONSTRAINT DF_EPC_status DEFAULT 'active';
IF COL_LENGTH('dbo.EmployeePayConfig', 'pay_type') IS NULL
  ALTER TABLE dbo.EmployeePayConfig ADD pay_type VARCHAR(16) NOT NULL CONSTRAINT DF_EPC_pay_type DEFAULT 'Hourly';
IF COL_LENGTH('dbo.EmployeePayConfig', 'daily_rate') IS NULL
  ALTER TABLE dbo.EmployeePayConfig ADD daily_rate DECIMAL(18,4) NULL;
GO

-- Extend TimesheetDays (admin workflow columns)
IF COL_LENGTH('dbo.TimesheetDays', 'ot_entry_mode') IS NULL
  ALTER TABLE dbo.TimesheetDays ADD ot_entry_mode VARCHAR(20) NOT NULL CONSTRAINT DF_TSD_ot_mode DEFAULT 'auto';
IF COL_LENGTH('dbo.TimesheetDays', 'approval_status') IS NULL
  ALTER TABLE dbo.TimesheetDays ADD approval_status VARCHAR(20) NOT NULL CONSTRAINT DF_TSD_approval DEFAULT 'pending';
IF COL_LENGTH('dbo.TimesheetDays', 'approved_by') IS NULL
  ALTER TABLE dbo.TimesheetDays ADD approved_by INT NULL, approved_at DATETIME2 NULL, notes NVARCHAR(MAX) NULL;
GO

-- Timesheet Adjustments audit
IF OBJECT_ID('dbo.TimesheetAdjustments','U') IS NULL
BEGIN
  CREATE TABLE dbo.TimesheetAdjustments(
    id INT IDENTITY(1,1) PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL,
    work_date DATE NOT NULL,
    field_changed VARCHAR(64) NOT NULL,
    old_value VARCHAR(255) NULL,
    new_value VARCHAR(255) NULL,
    changed_by INT NULL,
    changed_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    reason NVARCHAR(MAX) NULL
  );
  CREATE INDEX IX_TA_emp_date ON dbo.TimesheetAdjustments(employee_code, work_date);
END
GO

-- Payroll Periods
IF OBJECT_ID('dbo.PayrollPeriods','U') IS NULL
BEGIN
  CREATE TABLE dbo.PayrollPeriods(
    id INT IDENTITY(1,1) PRIMARY KEY,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    is_locked BIT NOT NULL DEFAULT 0,
    is_closed BIT NOT NULL DEFAULT 0,
    locked_by INT NULL,
    locked_at DATETIME2 NULL,
    closed_by INT NULL,
    closed_at DATETIME2 NULL
  );
  CREATE INDEX IX_PP_range ON dbo.PayrollPeriods(from_date, to_date);
END
GO

-- Helpful default daily_rate for existing Hourly records left NULL

PRINT 'Admin schema extensions applied.';
GO

