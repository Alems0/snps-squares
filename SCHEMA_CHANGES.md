# Schema Changes Summary

## Migration: 20250102000000_add_name_fields_and_rls.sql

**IMPORTANT**: This migration is designed to be idempotent and safe to run on the production Supabase project `axkxwguwquuxbjyntjeq`, which already has:
- `first_name` and `last_name` columns
- `sync_claimed_by_name` trigger
- RLS policies (`squares_claim_anon`, `games_select_public`, etc.)
- 100 squares per game with `payment_status = 'unpaid'` and `claimed_by_email IS NULL`

### What This Migration Does

1. **Adds columns if they don't exist** (idempotent via DO block)
   - `first_name` TEXT (nullable)
   - `last_name` TEXT (nullable)

2. **Adds constraints if they don't exist** (idempotent via DO block)
   - `valid_first_name`: 1-100 characters after trimming
   - `valid_last_name`: 1-100 characters after trimming

3. **Creates/replaces trigger function**
   - `sync_claimed_by_name()`: Auto-computes `claimed_by_name = first_name || ' ' || last_name`
   - Drops and recreates trigger to ensure it's up to date

### What This Migration Does NOT Do

- ❌ Does NOT create RLS policies (production already has them)
- ❌ Does NOT enable RLS (already enabled on production)
- ❌ Does NOT initialize squares (production seeds them manually)
- ❌ Does NOT change `payment_status` values


## Production Alignment

### Existing Production Schema (Project: axkxwguwquuxbjyntjeq)

**RLS Policies Already Present:**
- `squares_claim_anon`: Allows anonymous users to claim squares
- `games_select_public`: Allows public to read active games
- `is_admin()` function: Admin authorization helper
- Other policies for admin operations

**Existing Claim Logic:**
- Unclaimed squares have `payment_status = 'unpaid'` AND `claimed_by_email IS NULL`
- Frontend UPDATE checks `.is('claimed_by_email', null)` to prevent double-claims
- Payment status CHECK constraint: `unpaid | paid | released`

**Active Game Configuration:**
- Game seeded with 100 squares (positions 0-99)
- Venmo handle: `@Don-Stecher`
- Squares pre-initialized as `payment_status = 'unpaid'` with null email

### Application Claim Flow

The app performs UPDATE (not INSERT or UPSERT):

```typescript
supabase
  .from('squares')
  .update({
    first_name: data.firstName,
    last_name: data.lastName,
    claimed_by_email: data.email,
    payment_method: data.paymentMethod,
    payment_status: 'unpaid',
    claimed_at: new Date().toISOString(),
  })
  .eq('game_id', game.id)
  .eq('position', position)
  .is('claimed_by_email', null) // Race condition protection
```

This aligns with production's existing RLS policy that checks `claimed_by_email IS NULL AND payment_status = 'unpaid'`.

## Backward Compatibility

- ✅ Existing `claimed_by_name` field maintained for backward compatibility
- ✅ Trigger automatically syncs `claimed_by_name` from `first_name + last_name`
- ✅ Existing admin authentication not affected
- ✅ No data migration required for existing squares
- ✅ New claims will populate all three fields (first_name, last_name, claimed_by_name)

## Application to Existing Database

This migration is **safe and idempotent** for production:

1. **Columns**: Uses `IF NOT EXISTS` check before adding columns
2. **Constraints**: Uses `IF NOT EXISTS` check before adding constraints  
3. **Trigger**: Uses `CREATE OR REPLACE` and `DROP TRIGGER IF EXISTS`
4. **No RLS changes**: Respects existing policies, doesn't try to recreate them
5. **No square initialization**: Doesn't interfere with existing squares

**To apply to production:**
```bash
# Using Supabase CLI
supabase db push

# Or manually via SQL Editor in Supabase Dashboard
# Copy/paste the migration file contents
```

**Safe to run multiple times** - all operations are idempotent.

## Required Manual Steps After Migration

### For Production (axkxwguwquuxbjyntjeq)
✅ **No manual steps required!**

The migration is designed to be a no-op on production since columns and trigger already exist. It will only ensure the trigger function is up to date.

## Impact on Application Code

### TypeScript Types Updated

```typescript
export interface Square {
  // New fields added:
  first_name?: string
  last_name?: string
  
  // Existing fields unchanged:
  claimed_by_name?: string  // Now auto-computed
  claimed_by_email?: string
  payment_method?: 'venmo' | 'cash'
  payment_status: 'unpaid' | 'paid' | 'released'
  // ... other fields
}
```

### Claiming Logic

Old (conceptual):
```typescript
// Would have been:
INSERT INTO squares VALUES (...)
```

New (implemented):
```typescript
// Update existing squares created by trigger
UPDATE squares 
SET 
  first_name = ?,
  last_name = ?,
  claimed_by_email = ?,
  payment_method = ?,
  payment_status = 'unpaid',
  claimed_at = NOW()
WHERE 
  game_id = ? 
  AND position = ? 
  AND claimed_by_email IS NULL
```

## Security Considerations

### RLS Enforcement
- All tables now have RLS enabled
- Anonymous users have read-only access to public data
- Anonymous users can claim squares (write their own data)
- Admin operations require authentication

### Data Validation
- Database-level constraints on name lengths
- Email format validated by existing CHECK constraint
- Payment method restricted to 'cash' or 'venmo'
- Payment status restricted to valid values

### SQL Injection Prevention
- All client queries use parameterized statements via Supabase client
- Trigger functions use proper SQL escaping
- No string concatenation in dynamic SQL

## Performance Considerations

### Indexes
Existing indexes are sufficient:
- `idx_squares_game_id`: Fast lookup of squares by game
- `idx_squares_claimed`: Fast filtering of claimed squares
- Unique constraint on (game_id, position): Prevents duplicate squares

### Query Performance
- SELECT for board: ~100 rows, very fast
- UPDATE for claim: Single row with indexed lookup
- Trigger overhead: Minimal (simple string concatenation)

### Recommendations for Scale
Current implementation is sufficient for:
- ✅ 100s of concurrent users
- ✅ 1000s of total squares (10+ games)
- ✅ Real-time board updates

For larger scale (not needed in Phase 1):
- Consider connection pooling (Supabase handles this)
- Consider caching active game (1 second TTL)
- Consider optimistic updates for claiming UI

## Production Testing Checklist

After deploying to production (`axkxwguwquuxbjyntjeq`):

- [ ] Verify migration applied successfully (check columns exist)
- [ ] Verify trigger works (insert a test claim, check `claimed_by_name`)
- [ ] Test claiming flow: select square → fill form → submit → success
- [ ] Verify claimed squares show initials (e.g., "DS" for Don Stecher)
- [ ] Test Venmo display shows `@Don-Stecher`
- [ ] Verify race condition protection (two users same square)
- [ ] Check existing RLS policies still work
- [ ] Verify admin auth still functional

## Rollback Procedure

If you need to rollback this migration:

```sql
-- 1. Drop trigger
DROP TRIGGER IF EXISTS sync_claimed_by_name_trigger ON squares;

-- 2. Drop function
DROP FUNCTION IF EXISTS sync_claimed_by_name();

-- 3. Remove constraints (optional)
ALTER TABLE squares DROP CONSTRAINT IF EXISTS valid_first_name;
ALTER TABLE squares DROP CONSTRAINT IF EXISTS valid_last_name;

-- 4. Remove columns (data loss! Only if necessary)
-- ALTER TABLE squares DROP COLUMN IF EXISTS first_name;
-- ALTER TABLE squares DROP COLUMN IF EXISTS last_name;
```

**WARNING**: Dropping columns will cause data loss. On production, preserve the columns even if rolling back the feature.

**NOTE**: Do NOT drop RLS policies - they existed before this migration.
