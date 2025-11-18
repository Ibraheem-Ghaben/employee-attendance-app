module.exports = {
  apps: [
    {
      name: 'employee-attendance-backend',
      script: './backend/dist/server.js',
      cwd: '/home/administrator/employee_attendance_app',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      log_file: '/home/administrator/employee_attendance_app/logs/backend.log',
      error_file: '/home/administrator/employee_attendance_app/logs/backend-error.log',
      out_file: '/home/administrator/employee_attendance_app/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'employee-attendance-frontend',
      script: 'serve',
      args: '-s build -l 8080 -n',
      cwd: '/home/administrator/employee_attendance_app/frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      log_file: '/home/administrator/employee_attendance_app/logs/frontend.log',
      error_file: '/home/administrator/employee_attendance_app/logs/frontend-error.log',
      out_file: '/home/administrator/employee_attendance_app/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};