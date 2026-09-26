# Schema Changes Summary

## Migration: 20250102000000_add_name_fields_and_rls.sql

### New Columns Added to `squares` Table

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `first_name` | TEXT | Yes | First name of the person claiming the square |
| `last_name` | TEXT | Yes | Last name of the person claiming the square |

### Constraints Added

- `valid_first_name`: Ensures first_name is either NULL or 1-100 characters after trimming
- `valid_last_name`: Ensures last_name is either NULL or 1-100 characters after trimming

### Triggers Created

1. **sync_claimed_by_name_trigger**
   - Automatically sets `claimed_by_name = first_name || ' ' || last_name`
   - Runs BEFORE INSERT OR UPDATE on squares
   - Ensures consistency between name fields

2. **auto_create_squares_trigger**
   - Automatically creates 100 squares (positions 0-99) when a new game is inserted
   - Runs AFTER INSERT on games
   - Initial squares have `payment_status = 'released'` (available)

### Functions Created

1. **sync_claimed_by_name()**
   - Concatenates first_name and last_name
   - Used by trigger to maintain claimed_by_name field

2. **initialize_game_squares(p_game_id UUID)**
   - Creates 100 squares for a given game ID
   - Uses ON CONFLICT to avoid duplicates
   - Marked SECURITY DEFINER to allow admin-level operations

3. **create_squares_for_new_game()**
   - Wrapper function for trigger
   - Calls initialize_game_squares() with new game ID

### Row Level Security (RLS) Policies

#### Games Table
- **"Anyone can view active games"** (SELECT)
  - Public can read games where status = 'active'
  
- **"Only admins can manage games"** (ALL)
  - Only authenticated admins can create/update/delete games

#### Squares Table
- **"Anyone can view squares for active games"** (SELECT)
  - Public can read all squares for active games
  
- **"Anyone can claim available squares"** (UPDATE)
  - USING: game is active AND (square unclaimed OR status is released/unpaid)
  - WITH CHECK: first_name, last_name, email, and payment_method must all be NOT NULL
  - Prevents claiming already-paid squares
  
- **"Only admins can delete squares"** (DELETE)
  - Only authenticated admins can delete squares

#### Scores Table
- **"Anyone can view scores"** (SELECT)
  - Public can read all scores
  
- **"Only admins can manage scores"** (ALL)
  - Only authenticated admins can create/update/delete scores

#### Admins Table
- **"Only admins can view admins"** (SELECT)
  - Only authenticated admins can read the admins table

## Backward Compatibility

- ✅ Existing `claimed_by_name` field maintained for backward compatibility
- ✅ Trigger automatically syncs `claimed_by_name` from `first_name + last_name`
- ✅ Existing admin authentication not affected
- ✅ No data migration required for existing squares
- ✅ New claims will populate all three fields (first_name, last_name, claimed_by_name)

## Application to Existing Database

This migration is safe to apply to existing databases:

1. **ALTER TABLE ADD COLUMN** is non-destructive
2. New columns are nullable, won't break existing data
3. Triggers only affect new inserts/updates
4. RLS policies are additive (enable security where it didn't exist before)

## Required Manual Steps After Migration

### 1. For New Installations
No manual steps required. The migration and triggers handle everything automatically.

### 2. For Existing Installations (if any data exists)

If you have existing games without squares:
```sql
-- Initialize squares for existing games
SELECT initialize_game_squares(id) FROM games;
```

If you have existing claimed squares (unlikely in Phase 1):
```sql
-- Parse existing claimed_by_name into first_name and last_name
-- Manual review recommended as name format may vary
-- Example for "First Last" format:
UPDATE squares 
SET 
  first_name = SPLIT_PART(claimed_by_name, ' ', 1),
  last_name = SPLIT_PART(claimed_by_name, ' ', 2)
WHERE 
  claimed_by_name IS NOT NULL 
  AND first_name IS NULL;
```

### 3. Test RLS Policies

After applying migration, test that anonymous users can:
- ✅ Read active games
- ✅ Read squares
- ✅ Claim unclaimed squares
- ❌ Delete squares
- ❌ Update claimed squares (unless unpaid)
- ❌ Modify games

Test that only admins can:
- ✅ Manage games
- ✅ Manage scores
- ✅ Delete squares
- ✅ View admin list

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

## Rollback Procedure

If you need to rollback this migration:

```sql
-- 1. Drop triggers first
DROP TRIGGER IF EXISTS auto_create_squares_trigger ON games;
DROP TRIGGER IF EXISTS sync_claimed_by_name_trigger ON squares;

-- 2. Drop functions
DROP FUNCTION IF EXISTS create_squares_for_new_game();
DROP FUNCTION IF EXISTS initialize_game_squares(UUID);
DROP FUNCTION IF EXISTS sync_claimed_by_name();

-- 3. Drop RLS policies
DROP POLICY IF EXISTS "Anyone can view active games" ON games;
DROP POLICY IF EXISTS "Only admins can manage games" ON games;
DROP POLICY IF EXISTS "Anyone can view squares for active games" ON squares;
DROP POLICY IF EXISTS "Anyone can claim available squares" ON squares;
DROP POLICY IF EXISTS "Only admins can delete squares" ON squares;
DROP POLICY IF EXISTS "Anyone can view scores" ON scores;
DROP POLICY IF EXISTS "Only admins can manage scores" ON scores;
DROP POLICY IF EXISTS "Only admins can view admins" ON admins;

-- 4. Disable RLS (optional, only if needed)
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE squares DISABLE ROW LEVEL SECURITY;
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;

-- 5. Remove constraints
ALTER TABLE squares DROP CONSTRAINT IF EXISTS valid_first_name;
ALTER TABLE squares DROP CONSTRAINT IF EXISTS valid_last_name;

-- 6. Remove columns (data loss!)
ALTER TABLE squares DROP COLUMN IF EXISTS first_name;
ALTER TABLE squares DROP COLUMN IF EXISTS last_name;
```

**WARNING:** Dropping columns will cause data loss. Ensure you have a backup before rolling back.
