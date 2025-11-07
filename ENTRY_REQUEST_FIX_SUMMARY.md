# Entry Request Validation Error - Fix Summary

**Date**: 2025-10-27
**Issue**: Entry request creation fails with validation error ("점증에러")

## Root Cause

The `entry_request_status` enum in the database is missing the value `"owner_requested"` which is used by the entry request router code.

### What We Found

1. **Database Enum** (`entry_request_status`) has these values:
   - `bp_draft`
   - `bp_requested`
   - ~~`owner_requested`~~ ❌ **MISSING**
   - `owner_reviewing`
   - `owner_approved`
   - `bp_reviewing`
   - `bp_approved`
   - `ep_reviewing`
   - `ep_approved`
   - `rejected`

2. **Router Code** (`server/entry-request-router-v2.ts` line 167):
   ```typescript
   status: 'owner_requested',  // ❌ This value doesn't exist in the database enum!
   ```

3. **Error Message**:
   ```
   invalid input value for enum entry_request_status: "owner_requested"
   ```

## Fix Applied

### 1. Updated Drizzle Schema ✅

**File**: `drizzle/schema.ts` (lines 27-38)

Added `"owner_requested"` to the enum definition:

```typescript
export const entryRequestStatusEnum = pgEnum("entry_request_status", [
  "bp_draft",
  "bp_requested",
  "owner_requested",  // ← ADDED
  "owner_reviewing",
  "owner_approved",
  "bp_reviewing",
  "bp_approved",
  "ep_reviewing",
  "ep_approved",
  "rejected"
]);
```

### 2. Database Migration Required ⚠️

The database enum needs to be updated. You need to **manually execute** this SQL in Supabase SQL Editor:

```sql
ALTER TYPE entry_request_status ADD VALUE IF NOT EXISTS 'owner_requested';
```

#### How to Execute:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Paste the SQL command above
4. Click **Run**

OR

Use the provided SQL file: `add-owner-requested-status.sql`

### 3. Verify the Fix

After applying the database migration, test entry request creation:

```bash
node test-entry-request-create.mjs
```

Expected output:
```
✅ Entry request created: [request number]
✅ SUCCESS without request_type: [item data]
✅ SUCCESS with request_type: [item data]
✅ Cleanup complete
```

## Additional Findings

During investigation, we also found:

1. **Test Data Created**:
   - 2 BP companies (센토아, Test BP Company)
   - 2 EP companies (에코, Test EP Company)
   - Test users: bp@test.com / test123, ep@test.com / test123

2. **Column Name Differences** (already correctly handled by `toSnakeCase`/`toCamelCase` helpers):
   - Code uses: `companyType` → Database has: `company_type` ✅
   - Code uses: `password` → Database has: `password` ✅

## Entry Request Workflow

After the fix, the workflow will be:

1. **Owner** creates entry request → Status: `owner_requested` ✅
2. **BP** reviews and approves → Status: `bp_approved`
3. **EP** reviews and approves → Status: `ep_approved`
4. **Owner** can then create **Deployment** (투입 관리)

## Files Modified

- ✅ `drizzle/schema.ts` - Added `owner_requested` to enum
- ✅ `add-owner-requested-status.sql` - SQL migration script (ready to run)
- ✅ `test-entry-request-create.mjs` - Test script for verification

## Next Steps

1. **URGENT**: Execute the SQL migration in Supabase (see section 2 above)
2. Test entry request creation via the UI or test script
3. Once entry requests work, test the deployment creation flow
4. Consider adding tests to prevent schema mismatches in the future

## Technical Details

- **PostgreSQL Enum Alteration**: PostgreSQL allows adding new values to enums with `ALTER TYPE ... ADD VALUE`
- **Drizzle Kit Limitation**: Drizzle cannot automatically alter existing enums, only create/drop them
- **Schema Cache**: The error "invalid input value for enum" occurs because PostgreSQL validates enum values at insert time

## Prevention

To prevent similar issues in the future:

1. **Enum Documentation**: Keep a list of all enum values and their meanings
2. **Schema Validation**: Add tests that verify code enum usage matches database enum values
3. **Migration Review**: Always review generated migrations before applying
4. **Type Safety**: Use TypeScript's enum or union types that match the database exactly

---

**Author**: Claude AI Assistant
**Work Log Reference**: `10271148내용.md`
