# Account Deletion Implementation Guide

## Overview

This document describes the complete implementation of the account deletion feature for ilm AI, including OTP-based email confirmation.

## Architecture

### 1. Database Schema

**Migration File**: `supabase/migrations/20260820110000_account_deletion_requests.sql`

Creates a new table to store temporary deletion requests:

```sql
account_deletion_requests (
  id: UUID (primary key)
  user_id: UUID (references auth.users)
  otp: TEXT (6-digit code)
  created_at: TIMESTAMPTZ
  expires_at: TIMESTAMPTZ (15 minutes from creation)
)
```

Features:
- One deletion request per user (unique constraint on user_id)
- Row-level security: users can only see their own requests
- Service-only write access (no direct user access)
- Automatic indexing on user_id and expires_at for performance

### 2. API Endpoints

#### POST `/api/auth/delete-account/request`

**Purpose**: Initiate account deletion request

**Endpoint**: `src/app/api/auth/delete-account/request/route.ts`

**Flow**:
1. Verify user authentication
2. Generate random 6-digit OTP
3. Store OTP in database with 15-minute expiry
4. Send email via Resend API with OTP
5. Return success message

**Request**:
- Method: POST
- Authentication: Required (session cookie)
- Body: Empty

**Response**:
```json
{
  "status": "success",
  "message": "Confirmation email sent. Check your inbox for the OTP."
}
```

**Error Cases**:
- User not authenticated (401)
- Profile not found (400)
- Email send failure (500)
- Database error (400)

#### POST `/api/auth/delete-account/confirm`

**Purpose**: Confirm deletion with OTP and permanently delete account

**Endpoint**: `src/app/api/auth/delete-account/confirm/route.ts`

**Flow**:
1. Verify user authentication
2. Fetch OTP from database
3. Verify OTP is not expired (15-minute window)
4. Verify OTP matches submitted value
5. Delete profile from database (cascades to all related data)
6. Delete auth user via Supabase admin API
7. Clean up OTP record
8. Return success message

**Request**:
```json
{
  "otp": "123456"
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Account deleted successfully. All your data has been removed."
}
```

**Error Cases**:
- User not authenticated (401)
- No deletion request found (400)
- OTP expired (400) - automatically cleaned up
- Invalid OTP (400)
- Profile deletion failure (500)

### 3. Email Template

**Email Service**: Resend API

**Template Path**: Inline HTML in `request/route.ts`

**Features**:
- Professional gradient header
- Clear OTP display (32px, monospace font)
- Expiry warning (15 minutes)
- Data deletion consequences highlighted
- Dark/light mode support
- Plain text fallback

**Email Content**:
- From: `noreply@ilmai.study` (configurable via `RESEND_FROM_EMAIL`)
- Subject: "Confirm your account deletion request"
- OTP: 6-digit code valid for 15 minutes

### 4. Frontend Components

#### Delete Account Page

**Path**: `src/app/(dashboard)/settings/delete-account/page.tsx`

- Server-rendered page
- Fetches user email and full name
- Passes to DeleteAccountFlow component

#### DeleteAccountFlow Component

**Path**: `src/components/features/settings/DeleteAccountFlow/index.tsx`

**State Machine**: Three-step flow

1. **Warning Step** (`step === 'warning'`)
   - Display account deletion consequences
   - List all data that will be deleted
   - Require explicit confirmation checkbox
   - "Request Deletion" button

2. **Confirmation Step** (`step === 'confirm'`)
   - Display email confirmation message
   - 6-digit OTP input field (numeric only, max 6)
   - Security warning about viewing screen
   - "Confirm & Delete" button
   - Back button to return to warning

3. **Success** (automatic redirect)
   - Redirects to login after 2-second delay
   - User is fully signed out

**Features**:
- Comprehensive warning messages
- Inline validation
- Loading states during API calls
- Error toast notifications
- OTP input auto-formatting (strips non-numeric)
- Secure input handling

#### Settings Tab Integration

**Modified**: `src/components/features/settings/SettingsTabs/index.tsx`

**Changes**:
- Added "Delete Account" tab to TABS array
- Uses Trash2 icon (already imported)
- Dedicated delete-account section in CardContent
- Links to `/settings/delete-account` with "Proceed" button
- Shows warning about permanent deletion

## Environment Configuration

### Required Variables

1. **Email Service** (for `request/route.ts`):
   - `RESEND_API_KEY` - Resend API authentication key
   - `RESEND_FROM_EMAIL` (optional) - Sender email address (defaults to `noreply@ilmai.study`)

2. **Supabase** (for `confirm/route.ts`):
   - `SUPABASE_SERVICE_ROLE_KEY` - Admin access for user deletion
   - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon key for regular operations

## Data Deletion

When an account is deleted via OTP confirmation, the following happens:

1. **Profile Deletion**: The row in `profiles` table is deleted
2. **Cascading Deletes**: All related data cascades via ON DELETE CASCADE:
   - User's memberships (school, college)
   - Study data (marks, progress, flashcards, notes)
   - Messages and conversations
   - Achievements and gamification data
   - Parent links and attachments
   - All other user-generated content

3. **Auth User Deletion**: Supabase auth user is deleted via admin API
4. **Cleanup**: OTP record is removed from `account_deletion_requests`

**Note**: Deletion is **permanent and irreversible**.

## Security Considerations

1. **OTP Security**:
   - 6-digit code (1 million combinations)
   - 15-minute expiry window
   - Single use only
   - Stored in database, not transmitted in URL

2. **Authentication**:
   - Requires active session (verified via `auth.getUser()`)
   - No password required for deletion (user has confirmed via email)

3. **Email Verification**:
   - Only sent to registered email address
   - User must access email to obtain OTP
   - Adds friction to prevent accidental deletion

4. **Rate Limiting**:
   - Not currently implemented
   - **TODO**: Add rate limiting to prevent brute-force OTP attempts

5. **Cascade Safety**:
   - Database foreign keys with ON DELETE CASCADE handle referential integrity
   - No orphaned records remain

## Testing

### Manual Testing Flow

1. **Request Deletion**:
   ```bash
   # Login as test user
   # Navigate to Settings > Delete Account
   # Check the confirmation checkbox
   # Click "Request Account Deletion"
   # Check email for OTP
   ```

2. **Confirm Deletion**:
   ```bash
   # Copy OTP from email
   # Enter OTP in confirmation form
   # Click "Confirm & Delete Account"
   # Verify redirect to login page
   # Attempt to login with deleted account (should fail)
   ```

3. **Edge Cases**:
   - Request deletion multiple times (should overwrite OTP)
   - Wait 15+ minutes and try to confirm (should reject with expiry message)
   - Submit wrong OTP 3 times (should show error each time)
   - Close browser after requesting deletion, return later (should still work)

### Automated Testing (TODO)

Create test file: `src/app/api/auth/delete-account/__tests__/deletion.test.ts`

Test scenarios:
- Unauthenticated request (should fail with 401)
- Valid request flow with real email
- OTP expiry validation
- Invalid OTP rejection
- Profile cascade deletion verification
- Auth user deletion verification
- Multiple concurrent deletion requests

## Deployment Checklist

- [ ] Run migration: `supabase migration up 20260820110000`
- [ ] Set `RESEND_API_KEY` in production environment
- [ ] Verify email sender address is configured
- [ ] Add service role key to production environment
- [ ] Test deletion flow in staging environment
- [ ] Monitor logs for deletion errors
- [ ] Brief support team on account deletion process
- [ ] Update privacy policy if needed
- [ ] Consider adding a grace period (optional future feature)

## Future Enhancements

1. **Grace Period**: Restore deleted accounts within 30 days
2. **Data Export**: Before deletion, offer to download user data
3. **Rate Limiting**: Prevent brute-force OTP attempts
4. **Audit Logging**: Log all deletion requests and confirmations
5. **Admin Override**: Allow admins to recover deleted accounts (within grace period)
6. **Analytics**: Track deletion reasons and user feedback
7. **Scheduled Deletion**: Schedule deletion for future date instead of immediate
8. **SMS Confirmation**: SMS OTP as alternative to email

## References

- Database Schema: `supabase/migrations/20260820110000_account_deletion_requests.sql`
- API Endpoints: 
  - `src/app/api/auth/delete-account/request/route.ts`
  - `src/app/api/auth/delete-account/confirm/route.ts`
- Frontend: `src/components/features/settings/DeleteAccountFlow/index.tsx`
- Page: `src/app/(dashboard)/settings/delete-account/page.tsx`
- Integration: `src/components/features/settings/SettingsTabs/index.tsx`

## Support

For issues or questions about account deletion:
1. Check logs in `request/route.ts` and `confirm/route.ts`
2. Verify email service configuration
3. Check database migration applied correctly
4. Ensure service role key has admin privileges
