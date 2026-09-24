#!/usr/bin/env node
// ============================================
// Run: node scripts/seed-ai-teacher.js
// Creates the AI-operated teacher account in Supabase
// Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
// ============================================
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const email = 'ai-teacher-1@ilm-ai.internal';
  const password = `ilm-AI-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  console.log('Creating AI teacher auth account...');
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email, password,
    email_confirm: true,
    user_metadata: { full_name: 'Sir Zafar', role: 'teacher' },
  });

  if (authError) {
    if (authError.message.includes('already')) {
      console.log('AI teacher already exists — skipping auth creation');
    } else {
      console.error('Auth error:', authError.message); process.exit(1);
    }
  }

  const userId = authUser?.user?.id;
  if (!userId) {
    // Try to find existing
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).single();
    if (!existing) { console.error('Could not create or find AI teacher'); process.exit(1); }
    console.log('AI teacher profile already exists:', existing.id);
    return;
  }

  console.log('Creating AI teacher profile...');
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    email,
    full_name: 'Sir Zafar',
    role: 'teacher',
    is_ai_operated: true,
    ai_persona_provider: 'groq',
    ai_persona_tier: 'medium',
    subscription_tier: 'ELITE',
    is_email_verified: true,
    is_profile_complete: true,
    onboarding_step: 99,
    xp: 0, level: 1, streak: 0, total_study_time: 0,
  });

  if (profileError) { console.error('Profile error:', profileError.message); process.exit(1); }
  console.log('✅ AI teacher account created successfully!');
  console.log('Teacher ID:', userId);
  console.log('Teacher Name: Sir Zafar');
  console.log('\nYou can create more AI teacher accounts by running this script again after changing the email and name above.');
}

main().catch(console.error);
