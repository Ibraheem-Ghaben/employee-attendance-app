# 🚀 Employee Attendance System - Production Quick Reference

## 📋 **Quick Commands**

### **Deployment Commands**
```bash
# Run production deployment
./deploy_production.sh

# Check production status
./check_production.sh

# Manual deployment steps
cd /home/administrator/employee_attendance_app
./deploy_production.sh
```

### **Service Management**
```bash
# PM2 Commands
pm2 status                    # Check all processes
pm2 monit                     # Monitor processes
pm2 logs                      # View all logs
pm2 logs employee-attendance-backend  # View backend logs
pm2 restart employee-attendance-backend  # Restart backend
pm2 stop employee-attendance-backend     # Stop backend
pm2 start employee-attendance-backend   # Start backend

# Nginx Commands
sudo systemctl status nginx   # Check Nginx status
sudo systemctl restart nginx  # Restart Nginx
sudo nginx -t                 # Test Nginx configuration
sudo systemctl reload nginx   # Reload Nginx configuration
```

### **Application URLs**
- **Frontend**: http://MSS-HR.com
- **Backend API**: http://MSS-HR.com/api
- **Health Check**: http://MSS-HR.com/api/health

### **File Locations**
- **Application**: `/var/www/employee-attendance`
- **Logs**: `/var/log/employee-attendance`
- **Config**: `/etc/nginx/sites-available/employee-attendance`
- **PM2 Config**: `/var/www/employee-attendance/ecosystem.config.js`
- **Environment**: `/var/www/employee-attendance/.env`

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **1. Application Not Accessible**
```bash
# Check if services are running
pm2 status
sudo systemctl status nginx

# Check ports
netstat -tlnp | grep -E ":(80|5000)"

# Restart services
pm2 restart employee-attendance-backend
sudo systemctl restart nginx
```

#### **2. Database Connection Issues**
```bash
# Check environment variables
cat /var/www/employee-attendance/.env

# Test database connection
# (Use your database client to test connections)
```

#### **3. Log Analysis**
```bash
# View recent logs
pm2 logs employee-attendance-backend --lines 50

# View error logs
tail -f /var/log/employee-attendance/backend-error.log

# View all logs
tail -f /var/log/employee-attendance/backend.log
```

#### **4. Performance Issues**
```bash
# Monitor system resources
htop
df -h
free -h

# Monitor PM2 processes
pm2 monit
```

---

## 📊 **Monitoring Commands**

### **System Monitoring**
```bash
# Check system resources
htop                          # Interactive process viewer
df -h                         # Disk usage
free -h                       # Memory usage
uptime                        # System uptime and load

# Check network
netstat -tlnp                 # Listening ports
ss -tlnp                      # Alternative to netstat
```

### **Application Monitoring**
```bash
# PM2 monitoring
pm2 monit                     # Real-time monitoring
pm2 show employee-attendance-backend  # Detailed process info

# Log monitoring
tail -f /var/log/employee-attendance/backend.log
pm2 logs employee-attendance-backend --lines 100
```

---

## 🔄 **Update Procedures**

### **Application Updates**
```bash
# 1. Pull latest changes
cd /home/administrator/employee_attendance_app
git pull origin main

# 2. Rebuild applications
cd frontend && npm run build
cd ../backend && npm run build

# 3. Copy to production
sudo cp -r frontend/build/* /var/www/employee-attendance/
sudo cp -r backend/dist /var/www/employee-attendance/backend/

# 4. Restart services
pm2 restart employee-attendance-backend
```

### **Configuration Updates**
```bash
# Update Nginx configuration
sudo nano /etc/nginx/sites-available/employee-attendance
sudo nginx -t
sudo systemctl reload nginx

# Update PM2 configuration
sudo nano /var/www/employee-attendance/ecosystem.config.js
pm2 restart employee-attendance-backend
```

---

## 🔒 **Security Checklist**

### **Essential Security Steps**
- [ ] Change default passwords in `.env` file
- [ ] Update JWT secret in `.env` file
- [ ] Install SSL certificate
- [ ] Configure firewall (UFW)
- [ ] Set up regular backups
- [ ] Monitor logs for suspicious activity

### **SSL Certificate Installation**
```bash
# Install SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 📋 **Backup Procedures**

### **Application Backup**
```bash
# Create backup
sudo tar -czf /backup/employee-attendance-$(date +%Y%m%d).tar.gz /var/www/employee-attendance

# Restore backup
sudo tar -xzf /backup/employee-attendance-YYYYMMDD.tar.gz -C /
```

### **Database Backup**
```bash
# Backup local database
# (Use your MSSQL backup tools)

# Backup APIC database
# (Use your MSSQL backup tools)
```

---

## 🆘 **Emergency Procedures**

### **Complete System Restart**
```bash
# Stop all services
pm2 stop all
sudo systemctl stop nginx

# Start all services
pm2 start all
sudo systemctl start nginx
```

### **Rollback to Previous Version**
```bash
# Stop current version
pm2 stop employee-attendance-backend

# Restore from backup
sudo tar -xzf /backup/employee-attendance-YYYYMMDD.tar.gz -C /

# Start services
pm2 start employee-attendance-backend
```

### **Reset to Development Mode**
```bash
# Stop production services
pm2 stop all
sudo systemctl stop nginx

# Start development services
cd /home/administrator/employee_attendance_app/backend
npm run dev &

cd /home/administrator/employee_attendance_app/frontend
npm start &
```

---

## 📞 **Support Information**

### **Contact Details**
- **Team**: MSS Software Team
- **Email**: support@mss.com
- **Application**: Employee Attendance System v3.0.0

### **Useful Logs**
- **Application Logs**: `/var/log/employee-attendance/`
- **Nginx Logs**: `/var/log/nginx/`
- **System Logs**: `/var/log/syslog`

### **Key Files to Monitor**
- `/var/www/employee-attendance/.env`
- `/var/www/employee-attendance/ecosystem.config.js`
- `/etc/nginx/sites-available/employee-attendance`

---

## ✅ **Health Check Checklist**

### **Daily Checks**
- [ ] Application accessible at http://localhost
- [ ] PM2 processes running (`pm2 status`)
- [ ] Nginx running (`sudo systemctl status nginx`)
- [ ] No critical errors in logs
- [ ] Database connections working

### **Weekly Checks**
- [ ] Disk space usage
- [ ] Memory usage
- [ ] Log file sizes
- [ ] SSL certificate validity
- [ ] Backup completion

### **Monthly Checks**
- [ ] Security updates
- [ ] Performance metrics
- [ ] Backup restoration test
- [ ] Configuration review

---

**🎯 Remember**: Always test changes in a development environment before applying to production!
