# 🚀 Employee Attendance System - Production Deployment Plan

## 📋 **Current System Status**

### ✅ **System Overview**
- **Application**: Employee Attendance System v3.0.0
- **Location**: `/home/administrator/employee_attendance_app`
- **Node.js**: v20.19.5
- **NPM**: v10.8.2
- **Current Status**: Development mode running
- **Frontend**: React app on port 3000
- **Backend**: Node.js/Express API on port 5000

### 🔧 **Current Running Services**
- Frontend: `http://localhost:3000` (React development server)
- Backend: `http://localhost:5000` (Node.js API server)
- Database: MSSQL (local connection)

---

## 🎯 **Production Deployment Strategy**

### **Phase 1: Environment Setup** ⚙️

#### **1.1 Install Production Dependencies**
```bash
# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt update
sudo apt install nginx -y

# Install SSL certificates (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx -y
```

#### **1.2 Create Production Directories**
```bash
# Create production directory structure
sudo mkdir -p /var/www/employee-attendance
sudo mkdir -p /var/log/employee-attendance
sudo mkdir -p /etc/employee-attendance

# Set permissions
sudo chown -R administrator:administrator /var/www/employee-attendance
sudo chown -R administrator:administrator /var/log/employee-attendance
```

### **Phase 2: Application Build** 🏗️

#### **2.1 Build Frontend for Production**
```bash
cd /home/administrator/employee_attendance_app/frontend
npm run build
```

#### **2.2 Build Backend for Production**
```bash
cd /home/administrator/employee_attendance_app/backend
npm run build
```

#### **2.3 Copy Production Files**
```bash
# Copy built frontend
sudo cp -r /home/administrator/employee_attendance_app/frontend/build/* /var/www/employee-attendance/

# Copy backend
sudo cp -r /home/administrator/employee_attendance_app/backend/dist /var/www/employee-attendance/backend
sudo cp /home/administrator/employee_attendance_app/backend/package.json /var/www/employee-attendance/backend/
sudo cp -r /home/administrator/employee_attendance_app/backend/node_modules /var/www/employee-attendance/backend/
```

### **Phase 3: Process Management** 🔄

#### **3.1 Create PM2 Ecosystem File**
```bash
# Create ecosystem.config.js in production directory
cat > /var/www/employee-attendance/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'employee-attendance-backend',
      script: './backend/dist/server.js',
      cwd: '/var/www/employee-attendance',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        LOCAL_DB_SERVER: 'localhost',
        LOCAL_DB_NAME: 'AttendanceAuthDB',
        LOCAL_DB_USER: 'sa',
        LOCAL_DB_PASSWORD: '',
        LOCAL_DB_PORT: '1433',
        APIC_DB_SERVER: '192.168.1.100',
        APIC_DB_NAME: 'MSS_TA',
        APIC_DB_USER: 'sa',
        APIC_DB_PASSWORD: 'YourAPICPassword',
        APIC_DB_PORT: '1433',
        JWT_SECRET: 'your-super-secret-jwt-key-change-this-in-production'
      },
      log_file: '/var/log/employee-attendance/backend.log',
      error_file: '/var/log/employee-attendance/backend-error.log',
      out_file: '/var/log/employee-attendance/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF
```

#### **3.2 Start Production Services**
```bash
cd /var/www/employee-attendance
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### **Phase 4: Web Server Configuration** 🌐

#### **4.1 Configure Nginx**
```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/employee-attendance << 'EOF'
server {
    listen 80;
    server_name MSS-HR.com www.MSS-HR.com;  # Your domain
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Frontend (React App)
    location / {
        root /var/www/employee-attendance;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
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
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/employee-attendance /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### **4.2 Configure SSL (Optional but Recommended)**
```bash
# Install SSL certificate
sudo certbot --nginx -d MSS-HR.com -d www.MSS-HR.com
```

### **Phase 5: Database Configuration** 🗄️

#### **5.1 Database Connection Settings**
```bash
# Create production environment file
sudo tee /var/www/employee-attendance/.env << 'EOF'
NODE_ENV=production
PORT=5000

# Local Database (MSSQL)
LOCAL_DB_SERVER=localhost
LOCAL_DB_NAME=AttendanceAuthDB
LOCAL_DB_USER=sa
LOCAL_DB_PASSWORD=your-local-db-password
LOCAL_DB_PORT=1433

# APIC Database (MSSQL)
APIC_DB_SERVER=192.168.1.100
APIC_DB_NAME=MSS_TA
APIC_DB_USER=sa
APIC_DB_PASSWORD=your-apic-db-password
APIC_DB_PORT=1433

# JWT Secret (CHANGE THIS!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Sync Settings
SYNC_INTERVAL=3600000
SYNC_TIMEOUT=300000
EOF

# Set secure permissions
sudo chmod 600 /var/www/employee-attendance/.env
sudo chown administrator:administrator /var/www/employee-attendance/.env
```

### **Phase 6: Monitoring & Logging** 📊

#### **6.1 Setup Log Rotation**
```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/employee-attendance << 'EOF'
/var/log/employee-attendance/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 administrator administrator
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

#### **6.2 Setup Monitoring**
```bash
# Install monitoring tools
sudo npm install -g pm2-logrotate

# Configure PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### **Phase 7: Security Configuration** 🔒

#### **7.1 Firewall Configuration**
```bash
# Configure UFW firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 5000/tcp   # Block direct access to backend
sudo ufw enable
```

#### **7.2 File Permissions**
```bash
# Set secure file permissions
sudo chown -R administrator:administrator /var/www/employee-attendance
sudo chmod -R 755 /var/www/employee-attendance
sudo chmod 600 /var/www/employee-attendance/.env
```

---

## 🚀 **Deployment Commands**

### **Quick Deployment Script**
```bash
#!/bin/bash
# Production Deployment Script

echo "🚀 Starting Employee Attendance System Production Deployment..."

# Phase 1: Install dependencies
echo "📦 Installing production dependencies..."
sudo npm install -g pm2
sudo apt update && sudo apt install nginx certbot python3-certbot-nginx -y

# Phase 2: Create directories
echo "📁 Creating production directories..."
sudo mkdir -p /var/www/employee-attendance
sudo mkdir -p /var/log/employee-attendance
sudo chown -R administrator:administrator /var/www/employee-attendance
sudo chown -R administrator:administrator /var/log/employee-attendance

# Phase 3: Build applications
echo "🏗️ Building applications..."
cd /home/administrator/employee_attendance_app/frontend
npm run build

cd /home/administrator/employee_attendance_app/backend
npm run build

# Phase 4: Copy files
echo "📋 Copying production files..."
sudo cp -r /home/administrator/employee_attendance_app/frontend/build/* /var/www/employee-attendance/
sudo cp -r /home/administrator/employee_attendance_app/backend/dist /var/www/employee-attendance/backend
sudo cp /home/administrator/employee_attendance_app/backend/package.json /var/www/employee-attendance/backend/
sudo cp -r /home/administrator/employee_attendance_app/backend/node_modules /var/www/employee-attendance/backend/

# Phase 5: Configure services
echo "⚙️ Configuring services..."
# (Copy the ecosystem.config.js and nginx configuration from above)

# Phase 6: Start services
echo "🚀 Starting production services..."
cd /var/www/employee-attendance
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Phase 7: Configure Nginx
echo "🌐 Configuring Nginx..."
# (Copy the nginx configuration from above)
sudo systemctl restart nginx

echo "✅ Production deployment completed!"
echo "🌐 Application available at: http://your-domain.com"
echo "📊 Monitor with: pm2 monit"
```

---

## 📊 **Production Monitoring**

### **Health Check Commands**
```bash
# Check application status
pm2 status
pm2 monit

# Check logs
pm2 logs employee-attendance-backend
tail -f /var/log/employee-attendance/backend.log

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t

# Check database connections
# (Test your database connections)
```

### **Performance Monitoring**
```bash
# Monitor system resources
htop
df -h
free -h

# Monitor application performance
pm2 show employee-attendance-backend
```

---

## 🔧 **Maintenance Commands**

### **Application Updates**
```bash
# Update application
cd /home/administrator/employee_attendance_app
git pull origin main

# Rebuild and redeploy
npm run build:production
pm2 restart employee-attendance-backend
```

### **Backup Commands**
```bash
# Backup database
# (Create your database backup script)

# Backup application
sudo tar -czf /backup/employee-attendance-$(date +%Y%m%d).tar.gz /var/www/employee-attendance
```

---

## ⚠️ **Important Notes**

1. **Change Default Passwords**: Update all default passwords in production
2. **SSL Certificates**: Install SSL certificates for HTTPS
3. **Domain Configuration**: Update domain names in configurations
4. **Database Security**: Ensure database connections are secure
5. **Regular Backups**: Set up automated backups
6. **Monitoring**: Set up proper monitoring and alerting
7. **Security Updates**: Keep system updated

---

## 🎯 **Next Steps**

1. **Review Configuration**: Check all configuration files
2. **Test Deployment**: Run the deployment script
3. **Verify Services**: Ensure all services are running
4. **Test Application**: Verify application functionality
5. **Setup Monitoring**: Configure monitoring and alerts
6. **Document Access**: Document admin access and credentials

---

**📞 Support**: Contact MSS Software Team for deployment assistance
**📧 Email**: support@mss.com
**🌐 Website**: http://your-domain.com
