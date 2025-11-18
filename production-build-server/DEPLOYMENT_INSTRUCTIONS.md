# 🚀 Employee Attendance System - Server IP Deployment Instructions

## 📋 Prerequisites
- Ubuntu Server with Node.js 20+
- Nginx installed
- PM2 installed globally
- Server IP: 192.168.5.103

## 🚀 Quick Deployment

### 1. Copy Files to Production Server
```bash
sudo mkdir -p /var/www/employee-attendance
sudo cp -r * /var/www/employee-attendance/
sudo chown -R administrator:administrator /var/www/employee-attendance
```

### 2. Install Backend Dependencies
```bash
cd /var/www/employee-attendance/backend
npm install --production
```

### 3. Configure Environment
```bash
# Edit environment variables
sudo nano /var/www/employee-attendance/.env
# Update database passwords and JWT secret
```

### 4. Configure Nginx
```bash
sudo cp nginx-employee-attendance.conf /etc/nginx/sites-available/employee-attendance
sudo ln -sf /etc/nginx/sites-available/employee-attendance /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Start Application
```bash
cd /var/www/employee-attendance
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 📊 Management Commands
- Monitor: `pm2 monit`
- Logs: `pm2 logs`
- Restart: `pm2 restart employee-attendance-backend`
- Stop: `pm2 stop employee-attendance-backend`

## 🌐 URLs
- Frontend: http://192.168.5.103
- Backend API: http://192.168.5.103/api
- Health Check: http://192.168.5.103/api/health

## 📁 Important Files
- Application: `/var/www/employee-attendance`
- Logs: `/var/log/employee-attendance`
- Config: `/etc/nginx/sites-available/employee-attendance`
- Environment: `/var/www/employee-attendance/.env`
