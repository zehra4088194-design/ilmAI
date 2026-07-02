# StudyVerse AI Gateway — Cloudflare Worker

This is the secret vault + failover router for every AI/OCR call the app makes.
Full guided steps are in **StudyVerse AI - Deployment Guide.docx** (section "Cloudflare Worker Setup").

Quick version:
1. Cloudflare Dashboard → Workers & Pages → Create → "Create Worker"
2. Replace the default code with the contents of `worker.js`
3. Settings → Variables and Secrets → add every secret listed at the top of `worker.js`
4. Deploy
5. In your Next.js project's `.env.local`, set:
   ```
   AI_GATEWAY_URL=https://studyverse-ai1.noorhusnain791.workers.dev
   AI_GATEWAY_SECRET=<same value you set as GATEWAY_SECRET in step 3>
   ```
6. Test it: `curl https://studyverse-ai1.noorhusnain791.workers.dev/health`
