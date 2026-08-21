# Account Deletion Testing Guide

## Quick Start

### Prerequisites
1. Local development environment running
2. Supabase project with migration applied
3. Resend API key configured
4. Test user account

### Step-by-Step Testing

#### Test 1: Request Deletion (Happy Path)

1. **Login** to your test account
2. **Navigate** to Settings > Delete Account
3. **Review** the warning message and data deletion list
4. **Check** the confirmation checkbox
5. **Click** "Request Account Deletion" button
6. **Verify**:
   - Loading spinner appears briefly
   - Success toast message: "Confirmation email sent!"
   - UI transitions to OTP input form
   - Email received in Resend (check console or Resend dashboard)

**Expected Email Contents**:
- Subject: "Confirm your account deletion request"
- Displays 6-digit OTP code
- Lists data that will be deleted
- Warning about permanent deletion
- Plain text fallback version included

**Database Check**:
```sql
SELECT * FROM account_deletion_requests WHERE user_id = '<test-user-id>';
```
Should show one record with OTP, created_at, and expires_at (15 min from now).

---

#### Test 2: Confirm Deletion with Valid OTP

1. **Copy** the 6-digit OTP from the confirmation email
2. **Paste** into the OTP input field
3. **Verify** input field:
   - Only accepts digits
   - Maximum 6 characters
   - Auto-strips non-numeric characters
   - Shows placeholder "000000"
4. **Click** "Confirm & Delete Account" button
5. **Verify**:
   - Loading spinner appears
   - Success message: "Account deleted successfully"
   - Page redirects to login after ~2 seconds
   - You are fully logged out

**Database Check** (as admin):
```sql
SELECT * FROM profiles WHERE id = '<test-user-id>';
```
Should return no rows (profile deleted).

```sql
SELECT * FROM account_deletion_requests WHERE user_id = '<test-user-id>';
```
Should return no rows (cleanup record deleted).

**Auth Check**:
```sql
SELECT * FROM auth.users WHERE id = '<test-user-id>';
```
Should return no rows (auth user deleted).

---

#### Test 3: Invalid OTP Rejection

1. **From** OTP confirmation step
2. **Enter** an incorrect 6-digit code (e.g., "000000")
3. **Click** "Confirm & Delete Account"
4. **Verify**:
   - Error toast: "Invalid OTP. Please check and try again."
   - UI remains on confirmation step
   - User not deleted
   - Can try again with correct OTP

---

#### Test 4: Expired OTP Handling

1. **Request** account deletion
2. **Wait** 15+ minutes (or manually update database):
   ```sql
   UPDATE account_deletion_requests 
   SET expires_at = NOW() - interval '1 minute'
   WHERE user_id = '<test-user-id>';
   ```
3. **Enter** the OTP (should be expired now)
4. **Click** "Confirm & Delete Account"
5. **Verify**:
   - Error toast: "OTP has expired. Please request a new deletion confirmation."
   - Database record automatically cleaned up
   - User can request deletion again

---

#### Test 5: Back Button Navigation

1. **On** the OTP confirmation step
2. **Click** "Back" button
3. **Verify**:
   - Returns to warning screen
   - Checkbox is unchecked
   - Can re-request deletion or cancel

---

#### Test 6: Multiple Deletion Requests

1. **Request** account deletion (get OTP #1)
2. **Before** confirming, **request** again
3. **Verify**:
   - Success message appears
   - New email sent with OTP #2
   - Old OTP #1 no longer works (overwritten in database)
   - Only OTP #2 will confirm deletion

**Database Check**:
```sql
SELECT otp, created_at FROM account_deletion_requests 
WHERE user_id = '<test-user-id>';
```
Should show one record with the newest OTP.

---

#### Test 7: Session Timeout Between Steps

1. **Request** account deletion, get OTP
2. **Clear** browser cookies (or logout via another tab)
3. **Try** to confirm OTP
4. **Verify**:
   - Error: "Not authenticated" or similar
   - API returns 401

---

#### Test 8: Data Cascade Verification

Create a test user with related data:

```sql
-- Before deletion, verify test user has:
SELECT COUNT(*) FROM marks WHERE user_id = '<test-user-id>';
SELECT COUNT(*) FROM flashcard_decks WHERE user_id = '<test-user-id>';
SELECT COUNT(*) FROM notes WHERE user_id = '<test-user-id>';
SELECT COUNT(*) FROM conversations WHERE user_id = '<test-user-id>';
```

After confirming deletion, verify all counts are 0:

```sql
SELECT COUNT(*) FROM marks WHERE user_id = '<test-user-id>';
-- Should return 0

SELECT COUNT(*) FROM flashcard_decks WHERE user_id = '<test-user-id>';
-- Should return 0

-- etc.
```

---

## Edge Cases & Error Scenarios

### Email Delivery Failure

**Setup**:
1. Configure invalid Resend API key
2. Try to request deletion

**Expected**:
- Error toast: "Could not send confirmation email. Please try again."
- Database record cleaned up (no orphaned OTP)
- User account still active

---

### Database Connection Failure

**Setup**:
1. Simulate database connection issue during confirmation
2. Try to confirm with valid OTP

**Expected**:
- Error toast: "An unexpected error occurred"
- Database maintains data integrity
- User can retry after service recovery

---

### Concurrent Deletion Attempts

**Setup**:
1. Open account deletion in two tabs
2. Request deletion in Tab 1
3. Request deletion in Tab 2
4. Confirm in Tab 1 with OTP from Tab 1

**Expected**:
- Account successfully deleted
- Tab 2's OTP becomes invalid immediately
- User fully logged out

---

## Browser Testing

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)  
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Chrome Mobile
- [ ] Safari iOS
- [ ] Firefox Mobile

**Test Focus**:
- OTP input on mobile (numeric keyboard)
- Email links on mobile
- Toast notifications visibility
- Button tap targets (min 44x44px)

---

## Performance Testing

### Email Send Performance

```typescript
// Measure time from request to email received
const start = Date.now();
// Click "Request Deletion"
// Time until email arrives
const duration = Date.now() - start;
// Should be < 5 seconds typically
```

### OTP Verification Performance

```typescript
const start = Date.now();
// Enter OTP and click confirm
// Time until redirect
const duration = Date.now() - start;
// Should be < 3 seconds
```

---

## Cleanup Between Tests

After each test, if you want to test again with the same user:

```sql
-- Restore test user (admin access required)
INSERT INTO auth.users (id, email, ...) VALUES (...);
INSERT INTO profiles (id, full_name, email, ...) VALUES (...);
```

Or create a new test user for each test cycle.

---

## Monitoring & Logs

### Check Request Logs
```bash
# View API request logs in Supabase dashboard
# Look for POST /api/auth/delete-account/request
```

### Check Confirmation Logs
```bash
# View API request logs in Supabase dashboard
# Look for POST /api/auth/delete-account/confirm
```

### Resend Email Logs
- Visit Resend dashboard at https://resend.com
- Navigate to Emails section
- Filter by "account deletion" subject
- Verify delivery status

---

## Troubleshooting

### Email Not Arriving

1. **Check** RESEND_API_KEY is correct
   ```bash
   echo $RESEND_API_KEY
   ```

2. **Check** email address in request
   - Verify user.email in auth.users table

3. **Check** Resend API status
   - Visit https://www.resenddocs.com
   - Check if there are service issues

4. **Review** Resend dashboard logs

### OTP Always Invalid

1. **Verify** OTP matches exactly (case-sensitive comparison)
2. **Check** database for correct stored OTP:
   ```sql
   SELECT otp FROM account_deletion_requests 
   WHERE user_id = '<user-id>';
   ```

3. **Verify** timestamp - OTP may have expired

### Cannot Delete Auth User

1. **Verify** SUPABASE_SERVICE_ROLE_KEY is set and correct
2. **Check** service role has admin permissions in Supabase
3. **Review** server logs for Supabase API errors

### Profile Deletion Fails

1. **Check** for foreign key constraint violations
   ```sql
   -- Ensure all cascading deletes are configured
   SELECT constraint_name 
   FROM information_schema.table_constraints 
   WHERE table_name = 'profiles' AND constraint_type = 'FOREIGN KEY';
   ```

2. **Verify** RLS policies don't prevent deletion

---

## Success Criteria Checklist

- [ ] Deletion request email sent within 5 seconds
- [ ] OTP validated correctly
- [ ] Account completely deleted after confirmation
- [ ] All related data cascades deleted
- [ ] Auth user cannot login after deletion
- [ ] OTP expires after 15 minutes
- [ ] Error handling works for all edge cases
- [ ] UI is intuitive and user-friendly
- [ ] No orphaned database records remain
- [ ] Proper error messages shown to users

---

## Reporting Issues

When reporting issues, include:

1. **Error message** shown to user
2. **Network tab** from browser dev tools (POST request/response)
3. **Server logs** if available
4. **Steps to reproduce**
5. **User ID** (if not sensitive)
6. **Timestamp** of issue
7. **Browser/device** information
