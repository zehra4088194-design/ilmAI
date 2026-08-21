# Account Deletion - Quick Reference

## What Was Built

A complete 3-step account deletion flow with OTP email verification:

1. **Warning Screen** - User confirms understanding of data loss
2. **Email Verification** - OTP sent to registered email
3. **Permanent Deletion** - Profile and all related data deleted

## Key Files

### Endpoints (APIs)
- `src/app/api/auth/delete-account/request/route.ts` - Request deletion, send OTP
- `src/app/api/auth/delete-account/confirm/route.ts` - Verify OTP, delete account

### Frontend
- `src/app/(dashboard)/settings/delete-account/page.tsx` - Standalone page
- `src/components/features/settings/DeleteAccountFlow/index.tsx` - 3-step flow component
- `src/components/features/settings/SettingsTabs/index.tsx` - Added delete tab

### Database
- `supabase/migrations/20260820110000_account_deletion_requests.sql` - OTP table

## Environment Setup

```env
# Required
RESEND_API_KEY=re_xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Optional
RESEND_FROM_EMAIL=noreply@ilmai.study
```

## Quick Test

```bash
# 1. Run migration
supabase migration up 20260820110000

# 2. Create test account and login

# 3. Go to Settings > Delete Account

# 4. Check confirmation box and request deletion

# 5. Copy OTP from email

# 6. Paste OTP and confirm

# 7. Should redirect to login
```

## API Usage

### Request Deletion
```bash
POST /api/auth/delete-account/request
Content-Type: application/json
Authorization: Cookie (session)

{}
```

Response:
```json
{
  "status": "success",
  "message": "Confirmation email sent. Check your inbox for the OTP."
}
```

### Confirm Deletion
```bash
POST /api/auth/delete-account/confirm
Content-Type: application/json
Authorization: Cookie (session)

{
  "otp": "123456"
}
```

Response:
```json
{
  "status": "success",
  "message": "Account deleted successfully. All your data has been removed."
}
```

## Flow Diagram

```
Settings Page
    ↓
Click "Delete Account" tab
    ↓
→ /settings/delete-account
    ↓
[1. Warning Screen]
    - Show consequences
    - Require checkbox
    - Button: "Request Deletion"
    ↓
POST /api/auth/delete-account/request
    ↓
[2. Confirm Screen]
    - Show "Email sent"
    - Input OTP field
    - Button: "Confirm & Delete"
    ↓
POST /api/auth/delete-account/confirm
    ↓
[3. Success]
    - Redirect to /login
    - Account deleted
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Not authenticated" | Session expired | Re-login |
| "Could not send email" | Invalid RESEND_API_KEY | Check .env |
| "OTP has expired" | >15 minutes passed | Request new deletion |
| "Invalid OTP" | Wrong code entered | Copy from email again |
| "No deletion request found" | Didn't call request first | Request deletion first |

## What Gets Deleted

✓ Profile data
✓ Marks and progress
✓ Flashcards and decks
✓ Notes
✓ Messages and conversations
✓ Achievements
✓ Study plans
✓ Parent links
✓ School/college memberships
✓ Auth user account

## Security Facts

- 6-digit OTP (1M combinations)
- 15-minute expiry
- Single use only
- Requires email verification
- No password needed (email = auth)
- All data cascade deleted

## Database Query Examples

```sql
-- Check if migration applied
SELECT * FROM public.account_deletion_requests LIMIT 1;

-- Check pending deletion requests
SELECT user_id, created_at, expires_at 
FROM account_deletion_requests 
WHERE expires_at > NOW();

-- Verify user deleted
SELECT * FROM profiles WHERE id = 'user-id';
SELECT * FROM auth.users WHERE id = 'user-id';
```

## Implementation Checklist

- [x] Database migration created
- [x] Request endpoint built
- [x] Confirm endpoint built
- [x] Email template created
- [x] Frontend page built
- [x] DeleteAccountFlow component built
- [x] Settings integration added
- [x] Error handling implemented
- [x] Documentation written
- [x] Testing guide created
- [ ] Migration applied to staging
- [ ] Migration applied to production
- [ ] Environment variables set
- [ ] Manual testing completed
- [ ] Ready for release

## Troubleshooting

**Problem**: Email not sent
- Check `RESEND_API_KEY` is correct
- Check user email in profile
- Check Resend dashboard for errors

**Problem**: OTP always invalid
- Verify exact OTP from email
- Check hasn't expired (15 min max)
- Check timestamp in DB

**Problem**: Can't delete auth user
- Check `SUPABASE_SERVICE_ROLE_KEY`
- Verify service role permissions
- Check Supabase admin API

**Problem**: Profile not deleted
- Check for RLS policy blocking
- Verify foreign key constraints
- Check database transaction logs

## Files to Review

1. `src/app/api/auth/delete-account/request/route.ts` - Request logic
2. `src/app/api/auth/delete-account/confirm/route.ts` - Deletion logic
3. `src/components/features/settings/DeleteAccountFlow/index.tsx` - UI logic
4. `supabase/migrations/20260820110000_account_deletion_requests.sql` - DB schema

## Further Reading

- Full implementation: `ACCOUNT_DELETION_IMPLEMENTATION.md`
- Testing procedures: `ACCOUNT_DELETION_TESTING.md`
- All changes: `ACCOUNT_DELETION_CHANGES.md`

## Support

For issues:
1. Check error message in browser
2. Check server logs
3. Check email delivery via Resend
4. Review testing guide
5. Check troubleshooting section
