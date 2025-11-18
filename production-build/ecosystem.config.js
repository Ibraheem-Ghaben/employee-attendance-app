module.exports = {
  apps: [
    {
      name: 'mss-attendence-backend',
      script: './backend/dist/server.js',
      cwd: '/var/www/mss-attendence',
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
        JWT_SECRET: 'mss-attendence-super-secret-jwt-key-2025-production'
      },
      log_file: '/var/log/mss-attendence/backend.log',
      error_file: '/var/log/mss-attendence/backend-error.log',
      out_file: '/var/log/mss-attendence/backend-out.log',
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
