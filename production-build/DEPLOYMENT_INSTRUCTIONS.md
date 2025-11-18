# 🚀 Mss-Attendence.com Deployment Instructions

## 📋 Prerequisites
- Ubuntu Server with Node.js 20+
- Nginx installed
- PM2 installed globally
- SSL certificate (Let's Encrypt)

## 🚀 Quick Deployment

### 1. Copy Files to Production Server
```bash
sudo mkdir -p /var/www/mss-attendence
sudo cp -r * /var/www/mss-attendence/
sudo chown -R administrator:administrator /var/www/mss-attendence
```

### 2. Install Backend Dependencies
```bash
cd /var/www/mss-attendence/backend
npm install --production
```

### 3. Configure Environment
```bash
# Edit environment variables
sudo nano /var/www/mss-attendence/.env
# Update database passwords and JWT secret
```

### 4. Configure Nginx
```bash
sudo cp nginx-mss-attendence.conf /etc/nginx/sites-available/mss-attendence
sudo ln -sf /etc/nginx/sites-available/mss-attendence /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Start Application
```bash
cd /var/www/mss-attendence
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. Install SSL Certificate
```bash
sudo certbot --nginx -d mss-attendence.com -d www.mss-attendence.com
```

## 📊 Management Commands
- Monitor: `pm2 monit`
- Logs: `pm2 logs`
- Restart: `pm2 restart mss-attendence-backend`
- Stop: `pm2 stop mss-attendence-backend`

## 🌐 URLs
- Frontend: https://mss-attendence.com
- Backend API: https://mss-attendence.com/api

## 📁 Important Files
- Application: `/var/www/mss-attendence`
- Logs: `/var/log/mss-attendence`
- Config: `/etc/nginx/sites-available/mss-attendence`
- Environment: `/var/www/mss-attendence/.env`
