// ============================================================================
// eLIS — PM2 Ecosystem Configuration
// 
// Usage: pm2 start elis-ecosystem.config.js
// Restart: pm2 restart elis-ecosystem.config.js --update-env
// Logs: pm2 logs
// Monitor: pm2 monit
//
// VPS: dinaragil@103.196.155.147
// SSH: ssh -i ~/Documents/SSH/elib.pem dinaragil@103.196.155.147
// ============================================================================

module.exports = {
  apps: [
    {
      name: 'elis-api',
      cwd: '/home/dinaragil/elibs/apps/api',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'postgresql://postgres:postgres123@localhost:5433/elis_db?schema=public',
        JWT_SECRET: process.env.JWT_SECRET || 'CHANGE-ME-IN-PRODUCTION-32-CHARS-MIN',
        JWT_EXPIRATION: process.env.JWT_EXPIRATION || '1d',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        CORS_ORIGINS: 'https://elibs.jizo.my.id,http://localhost:3000',
      },
      max_memory_restart: '300M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/home/dinaragil/elibs/logs/api-error.log',
      out_file: '/home/dinaragil/elibs/logs/api-out.log',
      merge_logs: true,
      // Graceful restart
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
    {
      name: 'elis-web',
      cwd: '/home/dinaragil/elibs/apps/web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'https://elibs.jizo.my.id',
        NEXT_TELEMETRY_DISABLED: 1,
      },
      max_memory_restart: '250M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/home/dinaragil/elibs/logs/web-error.log',
      out_file: '/home/dinaragil/elibs/logs/web-out.log',
      merge_logs: true,
      kill_timeout: 5000,
    },
  ],
};
