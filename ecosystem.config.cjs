// CommonJS version for PM2 compatibility
module.exports = {
  apps: [
    {
      name: 'webapp',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=car-wash-system-production --local --ip 0.0.0.0 --port 3001',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      watch: false, // Disable PM2 file monitoring
      instances: 1, // Development mode uses only one instance
      exec_mode: 'fork',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
}