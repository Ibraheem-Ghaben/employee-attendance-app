# 🌐 DNS Server Configuration Guide

## 🎯 **Configure Company DNS Server for attendance.mss.ps**

This guide will help you configure your company DNS server so that `attendance.mss.ps` resolves to `192.168.5.103` for all computers on the network.

---

## 📋 **Step 1: Identify Your DNS Server**

### **Find Current DNS Server:**
```bash
# Check current DNS settings
cat /etc/resolv.conf

# Check network configuration
ip route show

# Check DNS servers
systemd-resolve --status
```

### **Common DNS Server Types:**
- **Windows Server DNS** (Active Directory)
- **Linux BIND DNS**
- **Router DNS** (most common)
- **Cloud DNS** (Google, Cloudflare)

---

## 📋 **Step 2: Router DNS Configuration (Most Common)**

### **Access Router Admin Panel:**
1. **Find Router IP**: Usually `192.168.1.1` or `192.168.0.1`
2. **Open Browser**: Go to `http://192.168.1.1`
3. **Login**: Use admin credentials
4. **Navigate**: DNS Settings or LAN Settings

### **Add DNS Record:**
```
Hostname: attendance.mss.ps
IP Address: 192.168.5.103
Type: A Record
TTL: 3600 (1 hour)
```

### **Router Brands & Access:**
- **TP-Link**: Advanced → Network → DHCP Server → Static DNS
- **Netgear**: Advanced → Setup → LAN Setup → Static DNS
- **Linksys**: Smart Wi-Fi Tools → Local Network → Static DNS
- **ASUS**: LAN → DHCP Server → Static DNS

---

## 📋 **Step 3: Windows Server DNS Configuration**

### **If Using Windows Server with Active Directory:**

1. **Open DNS Manager**:
   - Server Manager → Tools → DNS
   - Or `dnsmgmt.msc`

2. **Create Forward Lookup Zone**:
   - Right-click "Forward Lookup Zones"
   - New Zone → Primary Zone
   - Zone name: `mss.ps`

3. **Add A Record**:
   - Right-click `mss.ps` zone
   - New Host (A or AAAA)
   - Name: `attendance`
   - IP Address: `192.168.5.103`

### **PowerShell Commands:**
```powershell
# Add DNS record via PowerShell
Add-DnsServerResourceRecordA -ZoneName "mss.ps" -Name "attendance" -IPv4Address "192.168.5.103"
```

---

## 📋 **Step 4: Linux BIND DNS Configuration**

### **Install BIND (if not installed):**
```bash
sudo apt update
sudo apt install bind9 bind9utils bind9-doc
```

### **Configure BIND:**
```bash
# Edit main configuration
sudo nano /etc/bind/named.conf.local

# Add zone configuration
zone "mss.ps" {
    type master;
    file "/etc/bind/db.mss.ps";
};
```

### **Create Zone File:**
```bash
sudo nano /etc/bind/db.mss.ps
```

**Zone file content:**
```
$TTL    604800
@       IN      SOA     ns1.mss.ps. admin.mss.ps. (
                              2         ; Serial
                         604800         ; Refresh
                          86400         ; Retry
                        2419200         ; Expire
                         604800 )       ; Negative Cache TTL
;
@       IN      NS      ns1.mss.ps.
@       IN      A       192.168.5.103
ns1     IN      A       192.168.5.103
attendance IN   A       192.168.5.103
www     IN      CNAME   attendance.mss.ps
```

### **Restart BIND:**
```bash
sudo systemctl restart bind9
sudo systemctl enable bind9
```

---

## 📋 **Step 5: Cloud DNS Configuration**

### **Google Cloud DNS:**
1. **Go to**: Google Cloud Console → Network Services → Cloud DNS
2. **Create Zone**: `mss.ps`
3. **Add Record**: A record `attendance` → `192.168.5.103`

### **Cloudflare DNS:**
1. **Go to**: Cloudflare Dashboard → DNS
2. **Add Record**: A record `attendance.mss.ps` → `192.168.5.103`

---

## 📋 **Step 6: Test DNS Configuration**

### **Test from Server:**
```bash
# Test DNS resolution
nslookup attendance.mss.ps
dig attendance.mss.ps

# Test from different computer
ping attendance.mss.ps
```

### **Test from Client Computers:**
```bash
# Windows Command Prompt
nslookup attendance.mss.ps
ping attendance.mss.ps

# Linux/Mac Terminal
nslookup attendance.mss.ps
dig attendance.mss.ps
```

---

## 📋 **Step 7: Update Client DNS Settings**

### **Ensure Clients Use Company DNS:**
1. **Windows**: Network Settings → Change adapter options → Properties → IPv4 → DNS
2. **Linux**: Edit `/etc/resolv.conf`
3. **Mac**: System Preferences → Network → Advanced → DNS

### **Add DNS Server:**
```
Primary DNS: 192.168.1.1 (your router/DNS server)
Secondary DNS: 8.8.8.8 (Google DNS backup)
```

---

## 🔧 **Quick Setup Commands**

### **For Router DNS (Most Common):**
```bash
# 1. Find router IP
ip route | grep default

# 2. Access router (example: 192.168.1.1)
# Open browser: http://192.168.1.1

# 3. Add DNS record:
# Hostname: attendance.mss.ps
# IP: 192.168.5.103
```

### **For Linux BIND DNS:**
```bash
# Install BIND
sudo apt install bind9

# Configure zone
sudo nano /etc/bind/named.conf.local

# Create zone file
sudo nano /etc/bind/db.mss.ps

# Restart service
sudo systemctl restart bind9
```

---

## 🎯 **Recommended Approach**

### **For Small Company (Easiest):**
1. **Use Router DNS**: Most routers support custom DNS records
2. **Access router admin panel**
3. **Add A record**: `attendance.mss.ps` → `192.168.5.103`
4. **Test from client computers**

### **For Large Company:**
1. **Use Windows Server DNS** or **Linux BIND**
2. **Configure proper DNS zones**
3. **Set up DNS replication**
4. **Configure client DNS settings**

---

## 🚀 **Testing Steps**

### **After DNS Configuration:**
```bash
# 1. Test DNS resolution
nslookup attendance.mss.ps

# 2. Test ping
ping attendance.mss.ps

# 3. Test web access
curl -I http://attendance.mss.ps

# 4. Test from browser
# Open: http://attendance.mss.ps
```

### **Expected Results:**
```
nslookup attendance.mss.ps
Server: 192.168.1.1
Address: 192.168.1.1#53

Name: attendance.mss.ps
Address: 192.168.5.103
```

---

## 📞 **Support Information**

### **Common Issues:**
- **DNS not propagating**: Wait 5-10 minutes, clear DNS cache
- **Router doesn't support custom DNS**: Use Windows Server or Linux BIND
- **Clients not using company DNS**: Update client DNS settings

### **DNS Cache Clearing:**
```bash
# Windows
ipconfig /flushdns

# Linux
sudo systemctl restart systemd-resolved

# Mac
sudo dscacheutil -flushcache
```

---

**Choose the method that fits your company setup and follow the steps!**
