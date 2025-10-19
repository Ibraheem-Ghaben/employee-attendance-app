-- ============================================================
-- Employee Attendance System - Overtime & Pay Tracking Schema
-- Weekly Calendar & 3-Bucket Overtime System
-- ============================================================

USE AttendanceAuthDB;
GO

-- ============================================================
-- Create Employee Pay Configuration Table
-- ============================================================

IF OBJECT_ID('dbo.EmployeePayConfig', 'U') IS NOT NULL
BEGIN
    PRINT 'EmployeePayConfig table already exists. Dropping and recreating...';
    DROP TABLE dbo.EmployeePayConfig;
END
GO

CREATE TABLE dbo.EmployeePayConfig (
    id INT IDENTITY(1,1) PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    
    -- Pay Type
    pay_type VARCHAR(20) NOT NULL CHECK (pay_type IN ('Hourly', 'Daily', 'Monthly')),
    hourly_rate_regular DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Weekday Overtime Configuration
    weekday_ot_rate_type VARCHAR(20) NOT NULL CHECK (weekday_ot_rate_type IN ('fixed', 'multiplier')),
    hourly_rate_weekday_ot DECIMAL(10,2) NULL,  -- Used if rate_type = 'fixed'
    weekday_ot_multiplier DECIMAL(5,2) NULL,    -- Used if rate_type = 'multiplier' (e.g., 1.5)
    
    -- Weekend Overtime Configuration
    weekend_ot_rate_type VARCHAR(20) NOT NULL CHECK (weekend_ot_rate_type IN ('fixed', 'multiplier')),
    hourly_rate_weekend_ot DECIMAL(10,2) NULL,  -- Used if rate_type = 'fixed'
    weekend_ot_multiplier DECIMAL(5,2) NULL,    -- Used if rate_type = 'multiplier' (e.g., 2.0)
    
    -- Weekly Calendar Configuration
    week_start VARCHAR(20) NOT NULL DEFAULT 'Sunday' CHECK (week_start IN ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
    weekend_days VARCHAR(100) NOT NULL DEFAULT 'Friday,Saturday',  -- Comma-separated list
    workday_start TIME NOT NULL DEFAULT '09:00:00',
    workday_end TIME NOT NULL DEFAULT '17:00:00',
    ot_start_time_on_workdays TIME NOT NULL DEFAULT '17:00:00',
    
    -- Minimum hours for pay calculation
    minimum_daily_hours_for_pay DECIMAL(5,2) NOT NULL DEFAULT 6.00,
    
    -- Audit fields
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT FK_EmployeePayConfig_Employee FOREIGN KEY (employee_code) 
        REFERENCES dbo.Users(employee_code) ON DELETE CASCADE
);

CREATE INDEX IX_EmployeePayConfig_EmployeeCode ON dbo.EmployeePayConfig(employee_code);

PRINT 'EmployeePayConfig table created successfully.';
GO

-- ============================================================
-- Create Site Pay Configuration Table (for default settings)
-- ============================================================

IF OBJECT_ID('dbo.SitePayConfig', 'U') IS NOT NULL
BEGIN
    PRINT 'SitePayConfig table already exists. Dropping and recreating...';
    DROP TABLE dbo.SitePayConfig;
END
GO

CREATE TABLE dbo.SitePayConfig (
    id INT IDENTITY(1,1) PRIMARY KEY,
    site_code VARCHAR(50) NOT NULL UNIQUE,
    site_name NVARCHAR(200) NOT NULL,
    
    -- Default weekly calendar for this site
    week_start VARCHAR(20) NOT NULL DEFAULT 'Sunday',
    weekend_days VARCHAR(100) NOT NULL DEFAULT 'Friday,Saturday',
    workday_start TIME NOT NULL DEFAULT '09:00:00',
    workday_end TIME NOT NULL DEFAULT '17:00:00',
    ot_start_time_on_workdays TIME NOT NULL DEFAULT '17:00:00',
    
    -- Default pay rates for new employees
    default_hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 20.00,
    default_weekday_ot_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.5,
    default_weekend_ot_multiplier DECIMAL(5,2) NOT NULL DEFAULT 2.0,
    
    -- Audit fields
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

CREATE INDEX IX_SitePayConfig_SiteCode ON dbo.SitePayConfig(site_code);

PRINT 'SitePayConfig table created successfully.';
GO

-- ============================================================
-- Create Timesheet Days Table (Daily breakdown with 3 buckets)
-- ============================================================

IF OBJECT_ID('dbo.TimesheetDays', 'U') IS NOT NULL
BEGIN
    PRINT 'TimesheetDays table already exists. Dropping and recreating...';
    DROP TABLE dbo.TimesheetDays;
END
GO

CREATE TABLE dbo.TimesheetDays (
    id INT IDENTITY(1,1) PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL,
    work_date DATE NOT NULL,
    
    -- Day type
    is_weekend BIT NOT NULL DEFAULT 0,
    day_of_week VARCHAR(20) NOT NULL,
    
    -- Punch times (first IN, last OUT)
    first_punch_in DATETIME2 NULL,
    last_punch_out DATETIME2 NULL,
    
    -- Total worked time
    total_worked_minutes INT NOT NULL DEFAULT 0,
    
    -- 3-Bucket breakdown (minutes)
    regular_minutes INT NOT NULL DEFAULT 0,
    weekday_ot_minutes INT NOT NULL DEFAULT 0,
    weekend_ot_minutes INT NOT NULL DEFAULT 0,
    
    -- 3-Bucket pay calculation
    regular_pay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    weekday_ot_pay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    weekend_ot_pay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_pay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Pay rates used (for audit trail)
    hourly_rate_regular DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    hourly_rate_weekday_ot DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    hourly_rate_weekend_ot DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Status
    is_calculated BIT NOT NULL DEFAULT 0,
    calculation_error NVARCHAR(MAX) NULL,
    
    -- Audit fields
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    calculated_at DATETIME2 NULL,
    
    CONSTRAINT FK_TimesheetDays_Employee FOREIGN KEY (employee_code) 
        REFERENCES dbo.Users(employee_code) ON DELETE CASCADE,
    CONSTRAINT UQ_TimesheetDays_EmployeeDate UNIQUE (employee_code, work_date)
);

CREATE INDEX IX_TimesheetDays_EmployeeCode ON dbo.TimesheetDays(employee_code);
CREATE INDEX IX_TimesheetDays_WorkDate ON dbo.TimesheetDays(work_date);
CREATE INDEX IX_TimesheetDays_EmployeeCodeDate ON dbo.TimesheetDays(employee_code, work_date);

PRINT 'TimesheetDays table created successfully.';
GO

-- ============================================================
-- Create Punch Records Table (Processed punch data)
-- ============================================================

IF OBJECT_ID('dbo.PunchRecords', 'U') IS NOT NULL
BEGIN
    PRINT 'PunchRecords table already exists. Dropping and recreating...';
    DROP TABLE dbo.PunchRecords;
END
GO

CREATE TABLE dbo.PunchRecords (
    id INT IDENTITY(1,1) PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL,
    punch_time DATETIME2 NOT NULL,
    punch_type VARCHAR(10) NOT NULL CHECK (punch_type IN ('IN', 'OUT')),
    work_date DATE NOT NULL,
    
    -- Link to timesheet day
    timesheet_day_id INT NULL,
    
    -- Raw data reference
    clock_id INT NULL,
    card_id VARCHAR(50) NULL,
    
    -- Audit fields
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT FK_PunchRecords_Employee FOREIGN KEY (employee_code) 
        REFERENCES dbo.Users(employee_code) ON DELETE CASCADE,
    CONSTRAINT FK_PunchRecords_TimesheetDay FOREIGN KEY (timesheet_day_id) 
        REFERENCES dbo.TimesheetDays(id) ON DELETE SET NULL
);

CREATE INDEX IX_PunchRecords_EmployeeCode ON dbo.PunchRecords(employee_code);
CREATE INDEX IX_PunchRecords_WorkDate ON dbo.PunchRecords(work_date);
CREATE INDEX IX_PunchRecords_PunchTime ON dbo.PunchRecords(punch_time);
CREATE INDEX IX_PunchRecords_EmployeeCodeDate ON dbo.PunchRecords(employee_code, work_date);

PRINT 'PunchRecords table created successfully.';
GO

-- ============================================================
-- Insert Default Site Configuration
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM dbo.SitePayConfig WHERE site_code = 'MSS_DEFAULT')
BEGIN
    INSERT INTO dbo.SitePayConfig (
        site_code, 
        site_name, 
        week_start, 
        weekend_days, 
        workday_start, 
        workday_end, 
        ot_start_time_on_workdays,
        default_hourly_rate,
        default_weekday_ot_multiplier,
        default_weekend_ot_multiplier
    )
    VALUES (
        'MSS_DEFAULT',
        'MSS Default Configuration',
        'Sunday',
        'Friday,Saturday',
        '09:00:00',
        '17:00:00',
        '17:00:00',
        20.00,
        1.5,
        2.0
    );
    PRINT 'Default site configuration created.';
END
GO

-- ============================================================
-- Insert Sample Pay Configurations for Test Users
-- ============================================================

-- Admin (no pay config needed)

-- Supervisor
IF NOT EXISTS (SELECT 1 FROM dbo.EmployeePayConfig WHERE employee_code = '080001')
BEGIN
    INSERT INTO dbo.EmployeePayConfig (
        employee_code,
        pay_type,
        hourly_rate_regular,
        weekday_ot_rate_type,
        weekday_ot_multiplier,
        weekend_ot_rate_type,
        weekend_ot_multiplier,
        week_start,
        weekend_days,
        workday_start,
        workday_end,
        ot_start_time_on_workdays,
        minimum_daily_hours_for_pay
    )
    VALUES (
        '080001',
        'Hourly',
        25.00,
        'multiplier',
        1.5,
        'multiplier',
        2.0,
        'Sunday',
        'Friday,Saturday',
        '09:00:00',
        '17:00:00',
        '17:00:00',
        6.0
    );
    PRINT 'Pay configuration created for supervisor (080001).';
END

-- Employee 1 (Ihab Qatusa - 080165)
IF NOT EXISTS (SELECT 1 FROM dbo.EmployeePayConfig WHERE employee_code = '080165')
BEGIN
    INSERT INTO dbo.EmployeePayConfig (
        employee_code,
        pay_type,
        hourly_rate_regular,
        weekday_ot_rate_type,
        weekday_ot_multiplier,
        weekend_ot_rate_type,
        weekend_ot_multiplier,
        week_start,
        weekend_days,
        workday_start,
        workday_end,
        ot_start_time_on_workdays,
        minimum_daily_hours_for_pay
    )
    VALUES (
        '080165',
        'Hourly',
        20.00,
        'multiplier',
        1.5,
        'multiplier',
        2.0,
        'Sunday',
        'Friday,Saturday',
        '09:00:00',
        '17:00:00',
        '17:00:00',
        6.0
    );
    PRINT 'Pay configuration created for employee1 (080165).';
END

-- Employee 2 (Mohammad Yasin - 080416)
IF NOT EXISTS (SELECT 1 FROM dbo.EmployeePayConfig WHERE employee_code = '080416')
BEGIN
    INSERT INTO dbo.EmployeePayConfig (
        employee_code,
        pay_type,
        hourly_rate_regular,
        weekday_ot_rate_type,
        weekday_ot_multiplier,
        weekend_ot_rate_type,
        weekend_ot_multiplier,
        week_start,
        weekend_days,
        workday_start,
        workday_end,
        ot_start_time_on_workdays,
        minimum_daily_hours_for_pay
    )
    VALUES (
        '080416',
        'Hourly',
        20.00,
        'multiplier',
        1.5,
        'multiplier',
        2.0,
        'Sunday',
        'Friday,Saturday',
        '09:00:00',
        '17:00:00',
        '17:00:00',
        6.0
    );
    PRINT 'Pay configuration created for employee2 (080416).';
END
GO

-- ============================================================
-- Verification Query
-- ============================================================

PRINT '';
PRINT '============================================================';
PRINT 'Overtime Schema Setup Complete!';
PRINT '============================================================';
PRINT '';

SELECT 
    employee_code,
    pay_type,
    hourly_rate_regular,
    weekday_ot_multiplier,
    weekend_ot_multiplier,
    week_start,
    weekend_days,
    CONVERT(VARCHAR(5), workday_start, 108) as workday_start,
    CONVERT(VARCHAR(5), workday_end, 108) as workday_end,
    CONVERT(VARCHAR(5), ot_start_time_on_workdays, 108) as ot_start
FROM dbo.EmployeePayConfig
ORDER BY employee_code;

PRINT '';
PRINT 'Tables Created:';
PRINT '- EmployeePayConfig (per-employee pay & schedule settings)';
PRINT '- SitePayConfig (site-level defaults)';
PRINT '- TimesheetDays (daily timesheet with 3 pay buckets)';
PRINT '- PunchRecords (processed punch data)';
PRINT '============================================================';
GO

