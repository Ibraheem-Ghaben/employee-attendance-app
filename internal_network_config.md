# 🔒 Internal Network Database Configuration

## 📋 **Internal Network Setup**

### **Database Connection Strategy**
- **Local Database**: `localhost` (same server)
- **APIC Database**: Internal company network IP
- **No Public IPs**: All connections stay within company network
- **Firewall Protection**: Database ports not exposed externally

### **Network Architecture**
```
Internet → MSS-HR.com → Nginx → Node.js App
                                    ↓
                            Internal Network
                                    ↓
                    ┌─────────────────────────────┐
                    │  Local Database (localhost) │
                    │  AttendanceAuthDB            │
                    └─────────────────────────────┘
                                    ↓
                    ┌─────────────────────────────┐
                    │  APIC Database (192.168.1.100) │
                    │  MSS_TA                     │
                    └─────────────────────────────┘
```

---

## 🔧 **Database Configuration**

### **Local Database (AttendanceAuthDB)**
```bash
# Server: localhost (same server)
# Port: 1433 (internal only)
# Database: AttendanceAuthDB
# User: sa
# Password: [secure password]
# Network: Internal only
```

### **APIC Database (MSS_TA)**
```bash
# Server: 192.168.1.100 (internal company network)
# Port: 1433 (internal only)
# Database: MSS_TA
# User: sa
# Password: [secure password]
# Network: Internal company network only
```

---

## 🛡️ **Security Configuration**

### **Firewall Rules**
```bash
# Allow HTTP/HTTPS from internet
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block database ports from internet
sudo ufw deny 1433/tcp
sudo ufw deny 1434/tcp

# Allow internal network access
sudo ufw allow from 192.168.1.0/24 to any port 1433
sudo ufw allow from 192.168.1.0/24 to any port 1434
```

### **Database Security**
- ✅ **No Public Access**: Database ports not exposed to internet
- ✅ **Internal Network Only**: Connections limited to company network
- ✅ **Strong Passwords**: Secure database credentials
- ✅ **Encrypted Connections**: SSL/TLS for database connections
- ✅ **Access Control**: Limited to specific IP ranges

---

## 📊 **Network Configuration**

### **Internal IP Ranges**
```bash
# Company Network: 192.168.1.0/24
# Database Server: 192.168.1.100
# Web Server: 192.168.1.X (current server)
# Application Server: 192.168.1.X (current server)
```

### **Port Configuration**
```bash
# External Ports (Internet Access)
Port 80  - HTTP (redirects to HTTPS)
Port 443 - HTTPS (SSL/TLS)

# Internal Ports (Company Network Only)
Port 1433 - SQL Server (internal only)
Port 1434 - SQL Server Browser (internal only)
Port 5000 - Node.js API (internal only)
```

---

## 🔒 **Security Best Practices**

### **Database Security**
1. **Strong Passwords**: Use complex passwords for database accounts
2. **Network Isolation**: Keep databases on internal network only
3. **Access Control**: Limit database access to specific IP ranges
4. **Encryption**: Use SSL/TLS for database connections
5. **Monitoring**: Log all database access attempts

### **Network Security**
1. **Firewall**: Block external access to database ports
2. **VPN Access**: Use VPN for remote database access
3. **Network Segmentation**: Separate database network from web network
4. **Monitoring**: Monitor network traffic and access patterns
5. **Backup Security**: Secure database backups

---

## 📋 **Configuration Files**

### **Environment Variables**
```bash
# Local Database (Internal)
LOCAL_DB_SERVER=localhost
LOCAL_DB_NAME=AttendanceAuthDB
LOCAL_DB_USER=sa
LOCAL_DB_PASSWORD=your-secure-local-password
LOCAL_DB_PORT=1433

# APIC Database (Internal Company Network)
APIC_DB_SERVER=192.168.1.100
APIC_DB_NAME=MSS_TA
APIC_DB_USER=sa
APIC_DB_PASSWORD=your-secure-apic-password
APIC_DB_PORT=1433
```

### **Firewall Configuration**
```bash
# UFW Firewall Rules
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 1433/tcp
sudo ufw deny 1434/tcp
sudo ufw allow from 192.168.1.0/24 to any port 1433
sudo ufw allow from 192.168.1.0/24 to any port 1434
```

---

## 🚀 **Deployment Steps**

### **1. Configure Internal Network**
```bash
# Ensure server is on company network
# IP: 192.168.1.X
# Gateway: 192.168.1.1
# DNS: Company DNS servers
```

### **2. Update Database Configuration**
```bash
# Edit environment file
nano /var/www/employee-attendance/.env

# Update database passwords
LOCAL_DB_PASSWORD=your-secure-local-password
APIC_DB_PASSWORD=your-secure-apic-password
```

### **3. Configure Firewall**
```bash
# Apply firewall rules
sudo ufw enable
sudo ufw reload
```

### **4. Test Database Connections**
```bash
# Test local database
sqlcmd -S localhost -U sa -P your-secure-local-password

# Test APIC database
sqlcmd -S 192.168.1.100 -U sa -P your-secure-apic-password
```

---

## ✅ **Security Checklist**

### **Database Security**
- [ ] Strong passwords for all database accounts
- [ ] Database ports not exposed to internet
- [ ] SSL/TLS encryption enabled
- [ ] Access limited to company network
- [ ] Regular security updates

### **Network Security**
- [ ] Firewall configured correctly
- [ ] Internal network access only
- [ ] VPN access for remote management
- [ ] Network monitoring enabled
- [ ] Backup security measures

### **Application Security**
- [ ] Environment variables secured
- [ ] Database connections encrypted
- [ ] Access logs monitored
- [ ] Regular security audits
- [ ] Incident response plan

---

## 🆘 **Troubleshooting**

### **Database Connection Issues**
```bash
# Check database service
sudo systemctl status mssql-server

# Test database connectivity
sqlcmd -S localhost -U sa -P password
sqlcmd -S 192.168.1.100 -U sa -P password

# Check network connectivity
ping 192.168.1.100
telnet 192.168.1.100 1433
```

### **Network Issues**
```bash
# Check firewall status
sudo ufw status

# Check network configuration
ip route show
ip addr show

# Test internal connectivity
ping 192.168.1.100
```

---

## 📞 **Support Information**

### **Internal Network Support**
- **Network Admin**: Contact your IT department
- **Database Admin**: Contact your database administrator
- **Security Team**: Contact your security team

### **Configuration Files**
- **Environment**: `/var/www/employee-attendance/.env`
- **Firewall**: `/etc/ufw/`
- **Network**: `/etc/netplan/`

---

**🔒 Your database connections are now secure and internal to your company network!**
