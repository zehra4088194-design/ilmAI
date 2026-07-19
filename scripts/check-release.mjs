import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationDir = path.join(root, 'supabase', 'migrations');
const migrations = fs.existsSync(migrationDir) ? fs.readdirSync(migrationDir).filter((file) => file.endsWith('.sql')) : [];
const requiredMarkers = [
  '20260710121200_teacher_dashboard.sql',
  '20260717165000_resource_processing_queue.sql',
  '20260719100000_resource_mcq_sets.sql',
  '20260719110000_diagnostic_mastery.sql',
  '20260719200000_push_subscriptions.sql',
];
const missing = requiredMarkers.filter((marker) => !migrations.includes(marker));
if (missing.length) {
  console.error(`Release check failed. Missing migrations: ${missing.join(', ')}`);
  process.exit(1);
}
for (const envName of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
  if (!process.env[envName]) console.warn(`Release check warning: ${envName} is not set in this shell.`);
}
console.log(`Release check passed: ${migrations.length} Supabase migrations found.`);
