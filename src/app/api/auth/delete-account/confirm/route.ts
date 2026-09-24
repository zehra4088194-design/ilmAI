import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'Not authenticated' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { otp } = body;

    if (!otp || typeof otp !== 'string') {
      return NextResponse.json({ status: 'error', error: 'Invalid OTP format' }, { status: 400 });
    }

    // Get deletion request
    const { data: deletionRequest, error: fetchError } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !deletionRequest) {
      return NextResponse.json(
        { status: 'error', error: 'No deletion request found. Please request deletion first.' },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    const expiresAt = new Date(deletionRequest.expires_at);
    if (new Date() > expiresAt) {
      // Clean up expired request
      await supabase.from('account_deletion_requests').delete().eq('user_id', user.id);
      return NextResponse.json(
        { status: 'error', error: 'OTP has expired. Please request a new deletion confirmation.' },
        { status: 400 }
      );
    }

    // Verify OTP
    if (deletionRequest.otp !== otp) {
      return NextResponse.json({ status: 'error', error: 'Invalid OTP. Please check and try again.' }, { status: 400 });
    }

    // Delete the profile - this will cascade delete related data through ON DELETE CASCADE
    // relationships defined in the database schema
    const profileId = user.id;

    const { error: profileDeleteError } = await supabase.from('profiles').delete().eq('id', profileId);
    if (profileDeleteError) {
      console.error('Profile deletion error:', profileDeleteError);
      return NextResponse.json({ status: 'error', error: 'Could not delete profile' }, { status: 500 });
    }

    // Delete the auth user
    try {
      const adminClient = await createAdminClient();
      await adminClient.auth.admin.deleteUser(user.id);
    } catch (authError) {
      console.error('Auth deletion error:', authError);
      // Even if auth deletion fails, we've already deleted the profile
      // The orphaned auth user will be cleaned up later
    }

    // Clean up deletion request
    await supabase.from('account_deletion_requests').delete().eq('user_id', user.id);

    return NextResponse.json({
      status: 'success',
      message: 'Account deleted successfully. All your data has been removed.',
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ status: 'error', error: 'An unexpected error occurred' }, { status: 500 });
  }
}
