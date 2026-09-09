/**
 * PM2 process file for the Oracle VPS. The Next.js app itself is deployed via Coolify (Docker —
 * see .env.oracle.example), so it's NOT managed here; this only keeps the standalone WhatsApp
 * worker (whatsapp-worker/, see its README.md) running 24/7, independent of the app container,
 * so redeploying the app never touches the linked WhatsApp session.
 *
 * If you're NOT using Coolify and run the Next.js app directly on the VPS instead, uncomment the
 * second app below.
 */
module.exports = {
  apps: [
    {
      name: 'ilm-ai-whatsapp',
      cwd: __dirname + '/whatsapp-worker',
      script: 'index.js',
      // Baileys keeps a live WebSocket + writes credential files — a single instance only.
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      // Backs off increasingly on a crash loop instead of hammering WhatsApp's servers.
      max_restarts: 20,
      restart_delay: 5_000,
      exp_backoff_restart_delay: 5_000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
      out_file: __dirname + '/whatsapp-worker/logs/out.log',
      error_file: __dirname + '/whatsapp-worker/logs/error.log',
      time: true,
    },

    // Uncomment if the Next.js app runs directly via PM2 instead of Coolify's Docker deploy:
    // {
    //   name: 'ilm-ai-web',
    //   cwd: __dirname,
    //   script: 'npm',
    //   args: 'start',
    //   instances: 1,
    //   exec_mode: 'fork',
    //   autorestart: true,
    //   max_memory_restart: '1G',
    //   env: { NODE_ENV: 'production', PORT: 3000 },
    // },
  ],
};
