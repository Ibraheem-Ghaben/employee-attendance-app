# 🌐 Nginx Hostname Configuration Guide

## 🎯 **Setting Up Hostname with Nginx**

Instead of accessing via IP `http://192.168.5.103`, you can set up a hostname like:
- `http://attendance.company.com`
- `http://hr.company.com`
- `http://mss-attendance.local`

---

## 📋 **Method 1: Internal Company Domain (Recommended)**

### **Step 1: Choose Your Hostname**
Examples:
- `attendance.company.com`
- `hr.company.com`
- `mss-attendance.local`
- `employee-portal.company.com`

### **Step 2: Update Nginx Configuration**

**Current config:**
```nginx
server {
    listen 80;
    server_name www.mss-attendence.com;
    # ... rest of config
}
```

**Updated config:**
```nginx
server {
    listen 80;
    server_name attendance.company.com hr.company.com www.attendance.company.com;
    # ... rest of config
}
```

### **Step 3: Configure DNS**

**Option A: Company DNS Server**
```bash
# Add A record in your company DNS server
attendance.company.com    A    192.168.5.103
hr.company.com           A    192.168.5.103
```

**Option B: Local Hosts File (for testing)**
```bash
# Edit hosts file on each computer
sudo nano /etc/hosts

# Add these lines:
192.168.5.103    attendance.company.com
192.168.5.103    hr.company.com
192.168.5.103    mss-attendance.local
```

---

## 📋 **Method 2: Multiple Hostnames (Same Server)**

### **Single Server, Multiple Names**
```nginx
server {
    listen 80;
    server_name attendance.company.com hr.company.com mss-attendance.local www.attendance.company.com;
    
    root /home/administrator/employee_attendance_app/frontend/build;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://192.168.5.103:5000;
        # ... proxy settings
    }
}
```

---

## 📋 **Method 3: Separate Servers for Different Purposes**

### **Admin Server**
```nginx
server {
    listen 80;
    server_name admin.company.com admin-attendance.company.com;
    
    # Admin-specific configuration
    location / {
        # Admin interface
    }
}
```

### **Employee Server**
```nginx
server {
    listen 80;
    server_name attendance.company.com hr.company.com;
    
    # Employee interface
    location / {
        # Employee interface
    }
}
```

---

## 🚀 **Quick Setup Example**

### **Step 1: Update Your Nginx Config**

**Edit:** `/home/administrator/employee_attendance_app/nginx-mss-hr.conf`

**Change:**
```nginx
server_name www.mss-attendence.com;
```

**To:**
```nginx
server_name attendance.company.com hr.company.com mss-attendance.local;
```

### **Step 2: Configure Local DNS**

**Edit hosts file:**
```bash
sudo nano /etc/hosts
```

**Add:**
```
192.168.5.103    attendance.company.com
192.168.5.103    hr.company.com
192.168.5.103    mss-attendance.local
```

### **Step 3: Apply Changes**

```bash
# Copy updated config
sudo cp /home/administrator/employee_attendance_app/nginx-mss-hr.conf /etc/nginx/sites-available/employee-attendance

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### **Step 4: Test Access**

```bash
# Test different hostnames
curl -I http://attendance.company.com
curl -I http://hr.company.com
curl -I http://mss-attendance.local
```

---

## 🎯 **Recommended Hostnames**

### **For Company Use:**
- `attendance.company.com` - Main attendance system
- `hr.company.com` - HR department access
- `employee.company.com` - Employee self-service

### **For MSS Software:**
- `mss-attendance.com` - Public domain
- `mss-hr.com` - HR system
- `mss-portal.com` - Employee portal

### **For Local Testing:**
- `attendance.local` - Local development
- `hr.local` - Local HR testing
- `mss.local` - Local MSS testing

---

## 📧 **Update HR Email**

**Instead of:**
```
Production URL: http://192.168.5.103
```

**Use:**
```
Production URL: http://attendance.company.com
```

---

## 🔧 **Implementation Steps**

1. **Choose your hostname** (e.g., `attendance.company.com`)
2. **Update Nginx config** with the new server_name
3. **Configure DNS** (company DNS or local hosts file)
4. **Test the hostname** works
5. **Update HR email** with new URL
6. **Distribute hostname** to all users

---

## 🌐 **Example Complete Configuration**

```nginx
server {
    listen 80;
    server_name attendance.company.com hr.company.com mss-attendance.local;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Frontend (React SPA)
    root /home/administrator/employee_attendance_app/frontend/build;
    index index.html;
    
    # React router fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://192.168.5.103:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $http_connection;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
}
```

---

**Choose your hostname and follow the steps to set it up!**
