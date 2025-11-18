#!/bin/bash

# Employee Attendance System Startup Script
echo "🚀 Starting Employee Attendance System..."

# Start PM2 services
cd /home/administrator/employee_attendance_app
npx pm2 start ecosystem.config.js

# Save PM2 configuration
npx pm2 save

# Setup PM2 to start on boot
npx pm2 startup

echo "✅ Services started successfully!"
echo "📱 Frontend: http://192.168.5.103:3000"
echo "🔧 Backend API: http://192.168.5.103:5000"
echo "📊 Status: npx pm2 status"
