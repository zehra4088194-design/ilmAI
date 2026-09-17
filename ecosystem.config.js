/**
 * PM2 process file for the Oracle VPS. The Next.js app itself is deployed via Coolify (Docker —
 * see .env.oracle.example), so it's NOT managed here; this only keeps the standalone WhatsApp
 * worker (whatsapp-worker/, see its README.md) running 24/7, independent of the app container,
 * so redeploying the app never touches the linked WhatsApp session.
 */
module.exports = {
  apps: [
    {
      name: 'ilm-ai-whatsapp',
      cwd: __dirname + '/whatsapp-worker',
      // Always load the safety/runtime bridge so PM2 cannot bypass the email-only admin handoff.
      script: 'node',
      args: '-r ./media-guard.cjs index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: false,
      // The worker handles normal reconnects itself and exits cleanly on invalid/logged-out
      // sessions so a PM2 restart loop cannot prevent QR relinking.
      max_restarts: 0,
      restart_delay: 0,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
      out_file: __dirname + '/whatsapp-worker/logs/out.log',
      error_file: __dirname + '/whatsapp-worker/logs/error.log',
      time: true,
    },

    // Uncomment if the Next.js app runs directly via PM2 instead of Coolify's Docker deploy.
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
