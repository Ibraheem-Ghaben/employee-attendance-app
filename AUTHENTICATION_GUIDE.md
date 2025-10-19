# 🔐 Authentication & Authorization Guide

## Overview

The Employee Attendance System now includes a complete authentication and authorization system with:
- ✅ **JWT-based authentication**
- ✅ **Role-Based Access Control (RBAC)** - Admin, Supervisor, Employee
- ✅ **User management system**
- ✅ **Employee profile access**
- ✅ **Excel export with permissions**
- ✅ **Dual database architecture** (Remote read-only + Local read/write)

---

## 🗄️ Database Architecture

### Remote Database (213.244.69.164 - READ ONLY)
- **Database**: MSS_TA
- **Tables**: Laserfiche.dbo.Laserfiche, final_attendance_records
- **Purpose**: Employee master data & attendance records
- **Access**: Read-only queries for employee information

### Local Database (localhost - READ/WRITE)
- **Database**: AttendanceAuthDB
- **Tables**: Users
- **Purpose**: User authentication & authorization
- **Access**: Full read/write access

---

## 👥 User Roles & Permissions

### 1. **Admin** 👑
**Full System Access**
- ✅ View all employee attendance records
- ✅ View all employee profiles
- ✅ Export all attendance data
- ✅ Create new users
- ✅ Manage user accounts (activate/deactivate)
- ✅ View all users list
- ✅ Access all API endpoints

### 2. **Supervisor** 👨‍💼
**Department/Team Management**
- ✅ View all employee attendance records
- ✅ View all employee profiles
- ✅ Export all attendance data
- ✅ View employee statistics
- ❌ Cannot create users
- ❌ Cannot manage user accounts

### 3. **Employee** 👤
**Self-Service Access**
- ✅ View own profile
- ✅ View own attendance records
- ✅ Export own attendance data
- ❌ Cannot view other employees
- ❌ Cannot access admin functions
- ❌ Cannot create or manage users

---

## 🔑 Default Login Credentials

| Username | Password | Role | Employee Code |
|----------|----------|------|---------------|
| `admin` | `MSS@2024` | Admin | N/A |
| `supervisor` | `MSS@2024` | Supervisor | 080001 |
| `employee1` | `MSS@2024` | Employee | 080165 (Ihab Qatusa) |
| `employee2` | `MSS@2024` | Employee | 080416 (Mohammad Yasin) |

⚠️ **IMPORTANT**: Change these passwords in production!

---

## 🚀 API Endpoints

### Authentication Endpoints

#### 1. **Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "MSS@2024"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "employee_code": null,
    "role": "admin",
    "full_name": "System Administrator",
    "email": "admin@mss.com",
    "is_active": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

#### 2. **Get Current User**
```http
GET /api/auth/me
Authorization: Bearer {token}
```

#### 3. **Register New User** (Admin Only)
```http
POST /api/auth/register
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "username": "newuser",
  "password": "SecurePass123",
  "employee_code": "080500",
  "role": "employee",
  "full_name": "John Doe",
  "email": "john.doe@mss.com"
}
```

#### 4. **Get All Users** (Admin Only)
```http
GET /api/auth/users
Authorization: Bearer {admin_token}
```

#### 5. **Update User Status** (Admin Only)
```http
PUT /api/auth/users/:userId/status
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "is_active": false
}
```

---

### Profile Endpoints

#### 1. **Get My Profile** (All Roles)
```http
GET /api/profile/my-profile?start_date=2025-01-01&end_date=2025-12-31
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "Company_Code": "MSS",
    "Branch_Code": "MSS",
    "Employee_Code": "080165",
    "Employee_Name_1_English": "Ihab Qais Nabhan Qatusa",
    "Employee_Name_1_Arabic": "ايهاب قيس نبهان قطوسه",
    "Site_1_English": "Ramallah"
  },
  "attendanceRecords": [...],
  "statistics": {
    "totalRecords": 150,
    "totalCheckIns": 75,
    "totalCheckOuts": 75,
    "lastPunch": "2025-06-12T16:55:33"
  }
}
```

#### 2. **Get Employee Profile** (Admin/Supervisor or Own Data)
```http
GET /api/profile/:employeeCode
Authorization: Bearer {token}
```

#### 3. **Get All Employees** (Admin/Supervisor Only)
```http
GET /api/profile/list/all
Authorization: Bearer {token}
```

---

### Attendance Endpoints

#### 1. **Get All Attendance Records** (Admin/Supervisor Only)
```http
GET /api/employees?page=1&pageSize=50
Authorization: Bearer {token}
```

---

### Export Endpoints

#### 1. **Export All Attendance** (Admin/Supervisor)
```http
GET /api/export/attendance?employee_code=080165&start_date=2025-01-01&end_date=2025-12-31
Authorization: Bearer {token}
```

Downloads Excel file with attendance data.

#### 2. **Export My Attendance** (All Roles)
```http
GET /api/export/my-attendance?start_date=2025-01-01&end_date=2025-12-31
Authorization: Bearer {token}
```

Downloads Excel file with user's own attendance data.

---

## 🔒 Security Features

### JWT Token
- **Algorithm**: HS256
- **Expiration**: 7 days
- **Storage**: Should be stored securely in frontend (localStorage/sessionStorage)
- **Header Format**: `Authorization: Bearer {token}`

### Password Security
- **Hashing**: bcrypt with 10 salt rounds
- **Min Length**: Recommended 8 characters
- **Requirements**: Should include uppercase, lowercase, numbers, symbols

### Authorization Checks
1. **Token Validation**: Every protected endpoint validates JWT
2. **Role Verification**: Endpoints check user role before access
3. **Data Ownership**: Employees can only access their own data
4. **Admin Override**: Admins can access any data

---

## 📝 Usage Examples

### Example 1: Admin Login & View All Employees
```bash
# Step 1: Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "MSS@2024"}'

# Save the token from response

# Step 2: Get all employees
curl http://localhost:5000/api/profile/list/all \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Example 2: Employee View Own Profile
```bash
# Login as employee
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "employee1", "password": "MSS@2024"}'

# Get own profile
curl http://localhost:5000/api/profile/my-profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Example 3: Export Attendance to Excel
```bash
# Login and get token
# Then download Excel file
curl http://localhost:5000/api/export/my-attendance \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -o my_attendance.xlsx
```

---

## 🛠️ Frontend Integration

### 1. Login Component
```typescript
const login = async (username: string, password: string) => {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Store token
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  }
  
  throw new Error(data.message);
};
```

### 2. Protected API Calls
```typescript
const fetchProtectedData = async (endpoint: string) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`http://localhost:5000${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return response.json();
};
```

### 3. Role-Based UI
```typescript
const user = JSON.parse(localStorage.getItem('user'));

{user.role === 'admin' && (
  <AdminPanel />
)}

{(user.role === 'admin' || user.role === 'supervisor') && (
  <ViewAllEmployees />
)}

{user.role === 'employee' && (
  <MyProfile />
)}
```

---

## 🔧 Troubleshooting

### Token Expired
**Error**: "Invalid or expired token"
**Solution**: Re-login to get a new token

### Access Denied
**Error**: "Access denied. Required roles: admin, supervisor"
**Solution**: User doesn't have required role permissions

### Password Issues
**Error**: "Invalid username or password"
**Solution**: 
1. Verify credentials
2. Check if account is active
3. Reset password if needed

---

## 🚀 Next Steps

1. ✅ Backend authentication complete
2. ⏳ Create frontend login page
3. ⏳ Implement protected routes in React
4. ⏳ Add role-based UI components
5. ⏳ Implement Excel export button
6. ⏳ Add user profile page
7. ⏳ Create admin panel

---

**System Status**: ✅ Backend Authentication Fully Operational!

