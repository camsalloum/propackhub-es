// pm2 ecosystem for Estimation Studio on the home server (camai).
// Used by scripts/deploy-es.sh.
//
// Layout on camai (target — host apply deferred):
//   /home/camai/propackhub-es/
//     current/packages/server/dist/   # compiled API
//     current/packages/web/dist/      # built web bundle (nginx serves static)
//
// Start with:
//   pm2 start /home/camai/propackhub-es/deploy/ecosystem.config.cjs
// Reload (zero-downtime for the API) with:
//   pm2 reload ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: 'es-api',
      cwd: '/home/camai/propackhub-es/current/packages/server',
      script: 'dist/index.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
        HOST: '127.0.0.1',
        RUN_MIGRATIONS_ON_BOOT: 'false',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '768M',
      out_file: '/home/camai/logs/es-api.out.log',
      error_file: '/home/camai/logs/es-api.err.log',
    },
  ],
};
