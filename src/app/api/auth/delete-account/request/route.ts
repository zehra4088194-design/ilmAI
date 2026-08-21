import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send email via Resend
async function sendDeletionEmail(email: string, otp: string, fullName: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@ilmai.study',
      to: email,
      subject: 'Confirm your account deletion request',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .otp-box { background: white; border: 2px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
              .otp-text { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #667eea; font-family: monospace; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 4px; }
              .footer { color: #666; font-size: 12px; margin-top: 20px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Account Deletion Request</h1>
              </div>
              <div class="content">
                <p>Hi ${fullName},</p>
                <p>We received a request to delete your ilm AI account. To confirm this action, please use the verification code below:</p>

                <div class="otp-box">
                  <div class="otp-text">${otp}</div>
                </div>

                <p><strong>This code will expire in 15 minutes.</strong></p>

                <div class="warning">
                  <strong>⚠️ Warning:</strong> Deleting your account is permanent. All your data, including progress, flashcards, notes, and settings will be permanently deleted and cannot be recovered.
                </div>

                <p>If you did not request account deletion, you can safely ignore this email. Your account remains active.</p>

                <p style="margin-top: 30px; color: #666;">Best regards,<br>The ilm AI Team</p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply to this address.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Account Deletion Request

Hi ${fullName},

We received a request to delete your ilm AI account. To confirm this action, please use the verification code below:

${otp}

This code will expire in 15 minutes.

⚠️ Warning: Deleting your account is permanent. All your data, including progress, flashcards, notes, and settings will be permanently deleted and cannot be recovered.

If you did not request account deletion, you can safely ignore this email. Your account remains active.

Best regards,
The ilm AI Team
      `,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Resend API error:', error);
    throw new Error('Failed to send deletion confirmation email');
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'Not authenticated' }, { status: 401 });
    }

    // Get user profile for full name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { status: 'error', error: 'Could not fetch user profile' },
        { status: 400 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Store OTP in database (upsert - replace if already exists)
    const { error: dbError } = await supabase
      .from('account_deletion_requests')
      .upsert(
        {
          user_id: user.id,
          otp,
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { status: 'error', error: 'Could not create deletion request' },
        { status: 400 }
      );
    }

    // Send email
    try {
      await sendDeletionEmail(user.email || '', otp, profile.full_name || 'User');
    } catch (emailError) {
      console.error('Email error:', emailError);
      // Clean up the database record if email fails
      await supabase.from('account_deletion_requests').delete().eq('user_id', user.id);

      return NextResponse.json(
        { status: 'error', error: 'Could not send confirmation email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: 'success', message: 'Confirmation email sent. Check your inbox for the OTP.' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ status: 'error', error: 'An unexpected error occurred' }, { status: 500 });
  }
}
