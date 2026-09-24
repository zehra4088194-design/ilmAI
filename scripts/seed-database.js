#!/usr/bin/env node
// Run: node scripts/seed-database.js
// Applies all seed SQL files to the database via Supabase admin API.
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const seedDir = path.join(__dirname, '..', 'database', 'seeds');

async function main() {
  const files = fs.readdirSync(seedDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (file === '003_ai_teacher_seed.sql') continue; // handled by separate script
    const sql = fs.readFileSync(path.join(seedDir, file), 'utf-8');
    console.log(`Running ${file}...`);
    const { error } = await supabase.rpc('exec_sql', { sql }).catch(() => ({ error: { message: 'rpc not available — run SQL directly in Supabase Dashboard' } }));
    if (error) console.warn(`⚠️  ${file}: ${error.message} (run manually in Supabase SQL Editor if needed)`);
    else console.log(`✅ ${file} done`);
  }
  console.log('\n✅ Seeding complete!\n');
}
main().catch(console.error);
