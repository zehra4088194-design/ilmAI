'use client';
import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth.store';
import type { UserProfile } from '@/types';
import { toast } from 'sonner';

export function useAuth() {
  const { user, isLoading, setUser, setLoading, logout } = useAuthStore();
  const router = useRouter();
  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error || !data) return null;
    return {
      id: data.id, email: data.email, fullName: data.full_name,
      avatarUrl: data.avatar_url ?? undefined, board: data.board as UserProfile['board'],
      gradeLevel: data.grade_level as UserProfile['gradeLevel'], subjects: data.subjects ?? [],
      subscriptionTier: data.subscription_tier as UserProfile['subscriptionTier'],
      subscriptionExpiresAt: data.subscription_expires_at ?? undefined,
      xp: data.xp, level: data.level, streak: data.streak,
      totalStudyTime: data.total_study_time, isEmailVerified: data.is_email_verified,
      isProfileComplete: data.is_profile_complete, onboardingStep: data.onboarding_step,
      role: (data.role as UserProfile['role']) ?? 'student',
      isAiOperated: data.is_ai_operated ?? false,
      aiPersonaProvider: (data.ai_persona_provider as UserProfile['aiPersonaProvider']) ?? undefined,
      aiOnboardingComplete: data.ai_onboarding_complete ?? false,
      targetMarksPercentage: data.target_marks_percentage ?? undefined,
      totalMarksPercentage: data.total_marks_percentage ?? undefined,
      previousRollNumber: data.previous_roll_number ?? undefined,
      optionalSubjectIds: data.optional_subject_ids ?? [],
      createdAt: data.created_at, updatedAt: data.updated_at,
    };
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (authUser) {
        const profile = await fetchProfile(authUser.id);
        setUser(profile || { id: authUser.id, email: authUser.email!, fullName: authUser.email!.split('@')[0]!, subscriptionTier: 'FREE', xp: 0, level: 1, streak: 0, totalStudyTime: 0, isEmailVerified: authUser.email_confirmed_at != null, isProfileComplete: false, onboardingStep: 0, role: 'student', isAiOperated: false, aiOnboardingComplete: false, optionalSubjectIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      } else {
        setUser(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const profile = await fetchProfile(session.user.id);
        if (profile) setUser(profile);
      } else if (event === 'SIGNED_OUT') {
        logout();
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile, setUser, logout]);

  const signOut = async () => {
    await supabase.auth.signOut();
    logout();
    router.push('/');
    toast.success('Logged out successfully');
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (error) toast.error(error.message);
  };

  return { user, isLoading, isAuthenticated: !!user, signOut, signInWithGoogle, fetchProfile };
}
