#!/bin/bash
# Install Node.js 20.x LTS and npm

echo "Installing Node.js 20.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo ""
echo "Node.js installation complete!"
node --version
npm --version

