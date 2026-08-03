module.exports = {
  apps: [
    {
      name: 'berkaytur-app',
      script: 'dist/server.cjs',
      instances: 'max', // Runs in cluster mode using all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      watch: false,
      max_memory_restart: '1G',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_merge: true,
      time: true,
      autorestart: true,
      shutdown_with_message: true, // Support graceful shutdown propagation in PM2
      kill_timeout: 10000 // Wait 10 seconds for graceful shutdown before force kill
    }
  ]
};
