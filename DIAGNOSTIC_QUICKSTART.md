# Realtime Diagnostics - Quick Start Guide

## Prerequisites

Before running the diagnostic tool, you need:

1. **A Supabase project** (local or cloud)
2. **A test user account** in your Supabase Auth

## Step 1: Create a Test User

If you don't have a test user yet, create one:

### Option A: Using Supabase Dashboard
1. Go to Authentication > Users
2. Click "Add user"
3. Enter email and password
4. Confirm the user's email

### Option B: Using SQL
```sql
-- This creates a user directly in the auth schema
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('your-password', gen_salt('bf')),
  now(),
  now(),
  now()
);
```

## Step 2: Configure Environment

Add these lines to your `.env` file:

```bash
# Test credentials for diagnostics
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=your-test-password
```

**Important:** Replace with your actual test user credentials!

## Step 3: Run the Diagnostic

```bash
pnpm run diagnose:realtime
```

## Step 4: Review Results

The tool will output color-coded results:
- ✅ Green = Pass
- ❌ Red = Fail  
- ⚠️ Yellow = Warning

A detailed JSON report is saved to `realtime-diagnostic-report.json`

## Common Issues

### "Cannot proceed without proper environment configuration"
→ Add `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` to your `.env` file

### "Login failed"
→ Verify the test user exists and the password is correct

### "No broadcast received within timeout"
→ This indicates the core issue! Check:
1. Database trigger exists and is firing
2. RLS policies allow broadcast delivery
3. Authentication is working correctly

## What's Next?

- If all tests pass: Your realtime infrastructure is working!
- If tests fail: The report will guide you to the specific component that needs fixing
- See `REALTIME_DIAGNOSTICS.md` for detailed troubleshooting

## Quick Test Without Full Setup

If you just want to test the script syntax:

```bash
node --check test-realtime-diagnostics.js
```

This verifies the script has no syntax errors without actually running it.
