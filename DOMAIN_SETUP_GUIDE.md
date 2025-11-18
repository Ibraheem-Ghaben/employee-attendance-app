# 🌐 Domain Setup Guide - Employee Attendance System

## 🎯 **Setting Up a Hostname Instead of IP Address**

Instead of accessing your system via `http://192.168.5.103:3000`, you can set up a proper domain name like:
- `http://attendance.company.com`
- `http://hr.company.com`
- `http://mss-attendance.local`

---

## 📋 **Option 1: Internal Domain (Recommended for Company Network)**

### **Step 1: Choose a Domain Name**
Examples:
- `attendance.company.com`
- `hr.company.com`
- `mss-attendance.local`
- `employee-portal.company.com`

### **Step 2: Configure DNS (Internal Network)**

**If you have a company DNS server:**
```bash
# Add A record in your DNS server
attendance.company.com    A    192.168.5.103
hr.company.com           A    192.168.5.103
```

**If using local hosts file (for testing):**
```bash
# Edit hosts file on each computer
sudo nano /etc/hosts

# Add this line:
192.168.5.103    attendance.company.com
192.168.5.103    hr.company.com
```

### **Step 3: Update Nginx Configuration**

**Current config:**
```nginx
server_name www.mss-attendence.com;
```

**Updated config:**
```nginx
server_name attendance.company.com hr.company.com;
```

### **Step 4: Test Domain Access**
```bash
# Test from any computer on the network
ping attendance.company.com
curl http://attendance.company.com
```

---

## 📋 **Option 2: Public Domain (For External Access)**

### **Step 1: Purchase Domain**
- Buy domain from: GoDaddy, Namecheap, Cloudflare, etc.
- Examples: `mss-attendance.com`, `company-hr.com`

### **Step 2: Configure DNS Records**
```bash
# A Record
attendance.company.com    A    192.168.5.103

# CNAME (optional)
www.attendance.company.com    CNAME    attendance.company.com
```

### **Step 3: Port Forwarding (Router Configuration)**
```bash
# Forward external ports to internal server
External Port 80  → 192.168.5.103:80
External Port 443 → 192.168.5.103:443
External Port 3000 → 192.168.5.103:3000
```

### **Step 4: Update Nginx for Public Access**
```nginx
server {
    listen 80;
    server_name attendance.company.com www.attendance.company.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name attendance.company.com www.attendance.company.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/attendance.company.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/attendance.company.com/privkey.pem;
    
    # Rest of your configuration...
}
```

---

## 📋 **Option 3: Quick Local Setup (For Testing)**

### **Step 1: Create Local Domain**
```bash
# Edit hosts file
sudo nano /etc/hosts

# Add these lines:
192.168.5.103    attendance.local
192.168.5.103    hr.local
192.168.5.103    mss.local
```

### **Step 2: Update Nginx**
```nginx
server_name attendance.local hr.local mss.local;
```

### **Step 3: Test Access**
```bash
# Test the new domain
curl http://attendance.local
curl http://hr.local
```

---

## 🔧 **Implementation Steps**

### **Step 1: Update Nginx Configuration**

**Edit your nginx config:**
```bash
sudo nano /etc/nginx/sites-available/employee-attendance
```

**Update server_name:**
```nginx
server {
    listen 80;
    server_name attendance.company.com hr.company.com www.attendance.company.com;
    
    # Your existing configuration...
}
```

### **Step 2: Test Configuration**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### **Step 3: Update Email Template**

**Update the HR email with new domain:**
```markdown
**Production URL:** http://attendance.company.com
```

### **Step 4: Configure SSL (Optional but Recommended)**

**Install SSL certificate:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d attendance.company.com -d www.attendance.company.com
```

---

## 📊 **Domain Examples**

### **Internal Company Domains:**
- `attendance.company.com`
- `hr.company.com`
- `employee.company.com`
- `portal.company.com`

### **MSS-Specific Domains:**
- `mss-attendance.com`
- `mss-hr.com`
- `mss-employee.com`
- `mss-portal.com`

### **Local Testing Domains:**
- `attendance.local`
- `hr.local`
- `mss.local`
- `employee.local`

---

## 🎯 **Recommended Setup**

### **For Internal Company Use:**
1. **Domain:** `attendance.company.com`
2. **DNS:** Add A record in company DNS server
3. **Access:** `http://attendance.company.com`
4. **SSL:** Optional for internal use

### **For External Access:**
1. **Domain:** `mss-attendance.com`
2. **DNS:** Public DNS records
3. **Access:** `https://mss-attendance.com`
4. **SSL:** Required for security

### **For Quick Testing:**
1. **Domain:** `attendance.local`
2. **DNS:** Local hosts file
3. **Access:** `http://attendance.local`
4. **SSL:** Not needed

---

## 📞 **Next Steps**

1. **Choose your domain name**
2. **Configure DNS (internal or public)**
3. **Update Nginx configuration**
4. **Test domain access**
5. **Update HR email with new URL**
6. **Configure SSL (if needed)**

---

## 🔍 **Testing Commands**

```bash
# Test DNS resolution
nslookup attendance.company.com
dig attendance.company.com

# Test HTTP access
curl -I http://attendance.company.com
curl -I https://attendance.company.com

# Test from different computers
ping attendance.company.com
```

---

**Choose the option that best fits your needs and follow the steps to set up your domain!**
