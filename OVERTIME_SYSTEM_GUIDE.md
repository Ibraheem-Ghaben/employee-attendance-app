# 📊 Overtime & Pay Tracking System

## Overview

The Employee Attendance App now includes a comprehensive **Weekly Calendar & 3-Bucket Overtime System** that automatically calculates and tracks:

- **Regular Hours** (workday hours within normal schedule)
- **Weekday Overtime** (hours after OT start time on workdays)
- **Weekend Overtime** (all hours worked on weekend days)

---

## 🎯 Key Features

### 1. **Flexible Weekly Calendar Configuration**
- Define custom week start (Sunday, Monday, etc.)
- Configure weekend days per site (e.g., Friday-Saturday or Saturday-Sunday)
- Set workday hours (start/end)
- Define overtime start time

### 2. **3-Bucket Pay Calculation**
```
Regular Pay      = (Regular Minutes / 60) × Regular Rate
Weekday OT Pay   = (Weekday OT Minutes / 60) × Weekday OT Rate
Weekend OT Pay   = (Weekend OT Minutes / 60) × Weekend OT Rate
Total Daily Pay  = Regular + Weekday OT + Weekend OT
```

### 3. **Flexible Rate Configuration**
- **Fixed Rate**: Specify exact hourly rate for OT
- **Multiplier**: Use multiplier (e.g., 1.5× or 2.0×) based on regular rate

### 4. **Automated Calculation**
- Pairs IN/OUT punches automatically
- Splits worked time into appropriate buckets
- Calculates pay for each bucket
- Stores daily breakdown with audit trail

### 5. **Weekly Reports with Excel Export**
- View weekly summaries by employee
- Daily breakdown with all 3 buckets
- Export to Excel for payroll processing

---

## 📋 Database Schema

### Tables Created

#### 1. **EmployeePayConfig**
Stores per-employee pay and schedule settings.

| Field | Type | Description |
|-------|------|-------------|
| employee_code | VARCHAR(50) | Employee identifier |
| pay_type | VARCHAR(20) | Hourly/Daily/Monthly |
| hourly_rate_regular | DECIMAL(10,2) | Regular hourly rate |
| weekday_ot_rate_type | VARCHAR(20) | fixed/multiplier |
| hourly_rate_weekday_ot | DECIMAL(10,2) | Fixed weekday OT rate (if applicable) |
| weekday_ot_multiplier | DECIMAL(5,2) | Multiplier for weekday OT (e.g., 1.5) |
| weekend_ot_rate_type | VARCHAR(20) | fixed/multiplier |
| hourly_rate_weekend_ot | DECIMAL(10,2) | Fixed weekend OT rate (if applicable) |
| weekend_ot_multiplier | DECIMAL(5,2) | Multiplier for weekend OT (e.g., 2.0) |
| week_start | VARCHAR(20) | Day of week (Sunday, Monday, etc.) |
| weekend_days | VARCHAR(100) | Comma-separated list (e.g., "Friday,Saturday") |
| workday_start | TIME | Start of regular workday (e.g., 09:00) |
| workday_end | TIME | End of regular workday (e.g., 17:00) |
| ot_start_time_on_workdays | TIME | OT starts after this time (e.g., 17:00) |
| minimum_daily_hours_for_pay | DECIMAL(5,2) | Minimum hours for pay calculation |

#### 2. **TimesheetDays**
Daily timesheet with 3-bucket breakdown.

| Field | Type | Description |
|-------|------|-------------|
| employee_code | VARCHAR(50) | Employee identifier |
| work_date | DATE | Work date |
| is_weekend | BIT | Is this a weekend day? |
| day_of_week | VARCHAR(20) | Day name |
| first_punch_in | DATETIME2 | First IN punch |
| last_punch_out | DATETIME2 | Last OUT punch |
| total_worked_minutes | INT | Total minutes worked |
| regular_minutes | INT | Regular bucket minutes |
| weekday_ot_minutes | INT | Weekday OT bucket minutes |
| weekend_ot_minutes | INT | Weekend OT bucket minutes |
| regular_pay | DECIMAL(10,2) | Regular bucket pay |
| weekday_ot_pay | DECIMAL(10,2) | Weekday OT bucket pay |
| weekend_ot_pay | DECIMAL(10,2) | Weekend OT bucket pay |
| total_pay | DECIMAL(10,2) | Total daily pay |
| is_calculated | BIT | Calculation status |

#### 3. **SitePayConfig**
Site-level default configurations.

#### 4. **PunchRecords**
Processed punch data (optional, for audit trail).

---

## 🚀 Setup Instructions

### Step 1: Run Database Schema

```bash
cd /home/administrator/employee_attendance_app/backend
sqlcmd -S localhost -U sa -P YourPassword -i overtime_schema.sql
```

Or using SQL Server Management Studio:
- Open `backend/overtime_schema.sql`
- Execute against your SQL Server instance

### Step 2: Verify Tables Created

```sql
USE AttendanceAuthDB;
SELECT * FROM dbo.EmployeePayConfig;
SELECT * FROM dbo.SitePayConfig;
SELECT * FROM dbo.TimesheetDays;
```

### Step 3: Configure Employee Pay Settings

The schema creates default configurations for test employees (080001, 080165, 080416).

To add/update configurations, use the API:

```bash
POST /api/overtime/config/080165
{
  "pay_type": "Hourly",
  "hourly_rate_regular": 20.00,
  "weekday_ot_rate_type": "multiplier",
  "weekday_ot_multiplier": 1.5,
  "weekend_ot_rate_type": "multiplier",
  "weekend_ot_multiplier": 2.0,
  "week_start": "Sunday",
  "weekend_days": "Friday,Saturday",
  "workday_start": "09:00:00",
  "workday_end": "17:00:00",
  "ot_start_time_on_workdays": "17:00:00",
  "minimum_daily_hours_for_pay": 6.0
}
```

---

## 🔧 API Endpoints

### Pay Configuration

#### Get Employee Pay Config
```http
GET /api/overtime/config/:employeeCode
Authorization: Bearer <token>
```

#### Update Employee Pay Config
```http
POST /api/overtime/config/:employeeCode
Authorization: Bearer <token>
Content-Type: application/json

{
  "hourly_rate_regular": 25.00,
  "weekday_ot_multiplier": 1.5,
  "weekend_ot_multiplier": 2.0
}
```

#### Get All Configs (Admin/Supervisor)
```http
GET /api/overtime/config
Authorization: Bearer <token>
```

### Workweek Settings

#### Update Workweek Settings
```http
POST /api/overtime/settings/workweek
Authorization: Bearer <token>
Content-Type: application/json

{
  "employee_code": "080165",
  "week_start": "Sunday",
  "weekend_days": ["Friday", "Saturday"],
  "workday_start": "09:00",
  "workday_end": "17:00",
  "ot_start_time_on_workdays": "17:00"
}
```

### Calculation

#### Calculate Timesheets (All Employees)
```http
POST /api/overtime/calculate
Authorization: Bearer <token>
Content-Type: application/json

{
  "from_date": "2025-01-01",
  "to_date": "2025-01-07",
  "force_recalculate": false
}
```

#### Calculate for Specific Employee
```http
POST /api/overtime/calculate/080165
Authorization: Bearer <token>
Content-Type: application/json

{
  "from_date": "2025-01-01",
  "to_date": "2025-01-07"
}
```

### Reports

#### Get Weekly Report
```http
GET /api/overtime/reports/weekly?from_date=2025-01-01&to_date=2025-01-07&employee_code=080165
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "employee_code": "080165",
      "employee_name": "Ihab Qais Nabhan Qatusa",
      "week_start": "2025-01-01",
      "week_end": "2025-01-07",
      "total_regular_hours": 40.0,
      "total_weekday_ot_hours": 5.0,
      "total_weekend_ot_hours": 8.0,
      "total_hours": 53.0,
      "total_regular_pay": 800.00,
      "total_weekday_ot_pay": 150.00,
      "total_weekend_ot_pay": 320.00,
      "week_total_pay": 1270.00,
      "days": [...]
    }
  ]
}
```

#### Export Weekly Report to Excel
```http
GET /api/overtime/reports/weekly/export?from_date=2025-01-01&to_date=2025-01-07
Authorization: Bearer <token>
```

Returns Excel file with columns:
- Employee | Name | Date | Day | Regular Hrs | Weekday OT Hrs | Weekend OT Hrs | Total Hrs | Regular Pay | Weekday OT Pay | Weekend OT Pay | Daily Total

#### Get Timesheet Days
```http
GET /api/overtime/timesheet/:employeeCode?from_date=2025-01-01&to_date=2025-01-07
Authorization: Bearer <token>
```

---

## 💡 Usage Examples

### Example 1: Workday with Overtime

**Configuration:**
- Workday: 09:00 - 17:00
- OT starts: 17:00
- Regular rate: $20/hr
- Weekday OT: 1.5× = $30/hr

**Punches:**
- IN: 08:55
- OUT: 18:30

**Calculation:**
- Regular: 09:00-17:00 = 8.0 hours = $160.00
- Weekday OT: 17:00-18:30 = 1.5 hours = $45.00
- Weekend OT: 0 hours = $0.00
- **Total: $205.00**

### Example 2: Weekend Work

**Configuration:**
- Weekend days: Friday, Saturday
- Regular rate: $20/hr
- Weekend OT: 2.0× = $40/hr

**Punches (Friday):**
- IN: 10:00
- OUT: 16:00

**Calculation:**
- Regular: 0 hours = $0.00
- Weekday OT: 0 hours = $0.00
- Weekend OT: 6.0 hours = $240.00
- **Total: $240.00**

### Example 3: Mixed Week

| Day | Type | Hours | Regular | Weekday OT | Weekend OT | Pay |
|-----|------|-------|---------|------------|------------|-----|
| Mon | Work | 9.0 | 8.0 | 1.0 | 0.0 | $190 |
| Tue | Work | 8.0 | 8.0 | 0.0 | 0.0 | $160 |
| Wed | Work | 10.0 | 8.0 | 2.0 | 0.0 | $220 |
| Thu | Work | 8.0 | 8.0 | 0.0 | 0.0 | $160 |
| Fri | Weekend | 6.0 | 0.0 | 0.0 | 6.0 | $240 |
| Sat | Weekend | 4.0 | 0.0 | 0.0 | 4.0 | $160 |
| Sun | Off | 0.0 | 0.0 | 0.0 | 0.0 | $0 |
| **Total** | | **45.0** | **32.0** | **3.0** | **10.0** | **$1,130** |

---

## 🔐 Permissions

| Role | View Config | Edit Config | Calculate | View Reports | Export Reports |
|------|-------------|-------------|-----------|--------------|----------------|
| **Admin** | All | All | Yes | All | All |
| **Supervisor** | All | All | Yes | All | All |
| **Employee** | Own | No | No | Own | Own |

---

## 🧪 Testing

### Test Calculation Logic

```bash
# 1. Set up test employee config
curl -X POST http://localhost:5000/api/overtime/config/080165 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pay_type": "Hourly",
    "hourly_rate_regular": 20.00,
    "weekday_ot_rate_type": "multiplier",
    "weekday_ot_multiplier": 1.5,
    "weekend_ot_rate_type": "multiplier",
    "weekend_ot_multiplier": 2.0,
    "week_start": "Sunday",
    "weekend_days": "Friday,Saturday",
    "workday_start": "09:00:00",
    "workday_end": "17:00:00",
    "ot_start_time_on_workdays": "17:00:00"
  }'

# 2. Calculate timesheets for a week
curl -X POST http://localhost:5000/api/overtime/calculate/080165 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "from_date": "2025-01-01",
    "to_date": "2025-01-07"
  }'

# 3. Get weekly report
curl -X GET "http://localhost:5000/api/overtime/reports/weekly?from_date=2025-01-01&to_date=2025-01-07&employee_code=080165" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Export to Excel
curl -X GET "http://localhost:5000/api/overtime/reports/weekly/export?from_date=2025-01-01&to_date=2025-01-07&employee_code=080165" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output weekly_report.xlsx
```

---

## 📊 Workflow

1. **Initial Setup**
   - Run `overtime_schema.sql` to create tables
   - Configure default site settings
   - Set up employee pay configurations

2. **Daily Operations**
   - Employees punch IN/OUT as usual
   - System stores raw punch data

3. **Calculation**
   - Admin/Supervisor triggers calculation (manual or scheduled)
   - System pairs punches, calculates buckets, computes pay
   - Results stored in `TimesheetDays`

4. **Reporting**
   - View weekly reports via API or UI
   - Export to Excel for payroll processing
   - Audit trail maintained with rates used

5. **Adjustments**
   - Update employee rates as needed
   - Recalculate with `force_recalculate: true`
   - Review calculation errors if any

---

## 🛠️ Troubleshooting

### Calculation Errors

Check the `TimesheetDays` table for errors:

```sql
SELECT employee_code, work_date, calculation_error
FROM dbo.TimesheetDays
WHERE is_calculated = 0 AND calculation_error IS NOT NULL;
```

Common issues:
- Missing pay configuration
- Invalid rate configuration (multiplier without value)
- No punch data for date

### Recalculate Failed Days

```bash
POST /api/overtime/calculate/080165
{
  "from_date": "2025-01-05",
  "to_date": "2025-01-05",
  "force_recalculate": true
}
```

---

## 📝 Notes

- Punch times are paired as IN → OUT based on chronological order
- Unpaired punches (missing IN or OUT) may result in calculation errors
- Weekend determination is based on `weekend_days` configuration
- Pay rates used during calculation are stored for audit purposes
- Recalculation overwrites previous results

---

## 🎉 Next Steps

Now that the overtime system is set up:

1. ✅ Database schema created
2. ✅ Backend services implemented
3. ✅ API endpoints exposed
4. 📝 TODO: Build frontend UI components
5. 📝 TODO: Add unit tests
6. 📝 TODO: Set up scheduled calculation job (optional)

Refer to the frontend implementation guide for building the UI components!

