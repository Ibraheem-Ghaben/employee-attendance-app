#!/bin/bash

echo "🔧 Configuring Ubuntu Server Firewall..."

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow our application ports
sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp

# Allow SSH
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw --force enable

echo "✅ Firewall configured successfully!"
echo "📋 Allowed ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (Frontend), 5000 (Backend)"
