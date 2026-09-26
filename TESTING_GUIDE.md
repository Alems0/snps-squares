# Multi-Square Claiming - Testing Guide

## Overview
This document provides step-by-step testing instructions for the multi-square claiming feature with contact information and payment method selection.

## Prerequisites

### 1. Production Supabase Configuration

**For Production Testing (Project: axkxwguwquuxbjyntjeq):**

The production project is already configured with:
- ✅ First name and last name columns
- ✅ Sync trigger for `claimed_by_name`
- ✅ RLS policies (`squares_claim_anon`, `games_select_public`, etc.)
- ✅ Active game with 100 squares (all `payment_status = 'unpaid'`, `claimed_by_email IS NULL`)
- ✅ Venmo handle: `@Don-Stecher`
- ✅ Google OAuth enabled

**Environment variables (.env):**
```env
VITE_SUPABASE_URL=https://axkxwguwquuxbjyntjeq.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_ADMIN_EMAIL=stecher2789@gmail.com
```

### 2. For New/Development Installations

If setting up a new development environment:

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Apply the migrations** in order:
   ```bash
   # Option A: Using Supabase CLI (recommended)
   supabase link --project-ref your-project-ref
   supabase db push
   
   # Option B: Manual application via SQL Editor
   # Run each migration file in the Supabase Dashboard > SQL Editor:
   # - supabase/migrations/20250101000000_initial_schema.sql
   # - supabase/migrations/20250102000000_add_name_fields_and_rls.sql
   ```

3. **Configure environment variables** (`.env`):
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_ADMIN_EMAIL=stecher2789@gmail.com
   ```

4. **Enable Google OAuth** (Supabase Dashboard > Auth > Providers > Google)
   - Add your OAuth credentials
   - Set Site URL to your deployment URL or `http://localhost:5173` for local testing
   - Add redirect URLs

5. **Create an active game with 100 unclaimed squares**:
   ```sql
   -- Create game
   INSERT INTO games (season, afc_team, nfc_team, cost_per_square, charity_percentage, venmo_handle, status)
   VALUES (2027, 'Kansas City Chiefs', 'Philadelphia Eagles', 10, 10, 'your-venmo-handle', 'active');
   
   -- Initialize 100 squares as unclaimed (payment_status = 'unpaid', claimed_by_email = NULL)
   INSERT INTO squares (game_id, position, payment_status)
   SELECT 
     (SELECT id FROM games WHERE status = 'active' LIMIT 1),
     generate_series(0, 99),
     'unpaid'
   ON CONFLICT DO NOTHING;
   ```

**IMPORTANT**: Unclaimed squares MUST have `payment_status = 'unpaid'` (not 'released') and `claimed_by_email IS NULL` to match the existing RLS policy.

### 3. Verify Production Schema

Check that squares are properly initialized:

```sql
-- Should return 100 unclaimed squares
SELECT COUNT(*) FROM squares 
WHERE game_id = (SELECT id FROM games WHERE status = 'active' LIMIT 1)
  AND payment_status = 'unpaid'
  AND claimed_by_email IS NULL;
-- Expected: 100

-- Verify columns exist
SELECT first_name, last_name, claimed_by_name, claimed_by_email, payment_method, payment_status
FROM squares 
WHERE game_id = (SELECT id FROM games WHERE status = 'active' LIMIT 1)
LIMIT 1;
-- Should show all columns exist (all NULL for unclaimed square)
```

## Testing Scenarios

### Scenario 1: Single Square Claim (Cash Payment)

1. **Navigate to the board**: `http://localhost:5173`
2. **Verify initial state**:
   - All squares should show "+" (available)
   - No selection panel visible
   - Legend shows: Available (+), Selected (✓), Claimed (initials)
3. **Click one available square**:
   - Square should change to yellow background with "✓"
   - Selection panel appears at top showing "1 square selected" and "Total: $10"
4. **Click "Claim Now"**:
   - Modal opens with claim form
   - Shows selected square number in a badge
   - Shows total cost: $10
5. **Fill out the form**:
   - First Name: "John"
   - Last Name: "Doe"
   - Email: "john.doe@example.com"
   - Payment Method: Select "Cash"
6. **Submit the form**:
   - Success modal appears
   - Shows "Squares Claimed!" message
   - Displays payment method: "💵 Cash"
   - Shows next steps
7. **Click "Done"**:
   - Modal closes
   - Board refreshes
   - Previously selected square now shows "JD" (initials)
   - Square has gray background (claimed state)

**Validation:**
- Verify in Supabase:
  ```sql
  SELECT * FROM squares WHERE claimed_by_email = 'john.doe@example.com';
  ```
- Check fields: `first_name`, `last_name`, `claimed_by_name` (should be "John Doe"), `payment_method` (should be "cash"), `payment_status` (should be "unpaid")

### Scenario 2: Multiple Square Claim (Venmo Payment)

1. **Navigate to the board**
2. **Click 3 different available squares**:
   - All 3 should show "✓" and yellow background
   - Selection panel shows "3 squares selected" and "Total: $30"
3. **Click one selected square again**:
   - Should deselect (return to "+" and white background)
   - Selection panel now shows "2 squares selected" and "Total: $20"
4. **Select the third square again** (now 3 total)
5. **Click "Clear"** in selection panel:
   - All squares deselect
   - Selection panel disappears
6. **Select 5 squares**
7. **Click "Claim Now"**
8. **Fill out the form**:
   - First Name: "Jane"
   - Last Name: "Smith"
   - Email: "jane.smith@example.com"
   - Payment Method: Select "Venmo"
9. **Verify Venmo details shown**:
   - Should display "Send to: @testvenmo"
10. **Submit the form**
11. **Success modal**:
    - Shows "5 squares" claimed
    - Total: $50
    - Payment method: "📱 Venmo"
    - Displays: "Send payment to: @testvenmo"
12. **Close modal and verify**:
    - All 5 squares show "JS" initials
    - All have gray background

### Scenario 3: Form Validation

1. **Select one square and click "Claim Now"**
2. **Try submitting with empty form**:
   - Error: "First name is required"
3. **Fill First Name: "Test"**, try submit:
   - Error: "Last name is required"
4. **Fill Last Name: "User"**, try submit:
   - Error: "Email is required"
5. **Fill Email: "invalidemail"**, try submit:
   - Error: "Please enter a valid email address"
6. **Fill valid Email: "test@example.com"**, try submit without payment method:
   - Error: "Please select a payment method"
7. **Select payment method**, submit:
   - Should succeed

### Scenario 4: Attempting to Claim Already Claimed Square

1. **Claim a square** (following Scenario 1)
2. **Refresh the page**
3. **Try clicking the claimed square**:
   - Should not be selectable (cursor-not-allowed)
   - Hover should show "Claimed by [Name]"
   - No selection state change

### Scenario 5: Race Condition (Two Users Claiming Same Square)

This tests the `claimed_by_email IS NULL` check in the UPDATE statement.

1. **Open two browser windows** (or one normal + one incognito)
2. **In both windows**, select the same square (e.g., position 0)
3. **Window 1**: Click "Claim Now", fill form, but **don't submit yet**
4. **Window 2**: Click "Claim Now", fill form with different email, **submit**
5. **Window 2**: Should succeed, square claimed
6. **Window 1**: Now submit the form
7. **Expected result**: 
   - Window 1 should either:
     - Get an error (square already claimed), OR
     - Successfully claim 0 squares (the update affected 0 rows)
8. **Refresh Window 1**: Square should show Window 2's initials

**Note:** The current implementation updates each square with `.is('claimed_by_email', null)`, so Window 1's update will affect 0 rows silently. This is acceptable but could be improved with explicit error handling.

### Scenario 6: Unassigned Numbers Display

When numbers haven't been randomized yet (default -1 values):

1. **Verify game has unassigned numbers**:
   ```sql
   SELECT afc_numbers, nfc_numbers FROM games WHERE status = 'active';
   -- Both should be [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]
   ```
2. **Board should display**:
   - NFC header: `? ? ? ? ? ? ? ? ? ?`
   - AFC column: `?` for each row
3. **Claims should still work normally**

### Scenario 7: No Active Game

1. **Set game to archived**:
   ```sql
   UPDATE games SET status = 'archived' WHERE status = 'active';
   ```
2. **Refresh the board page**
3. **Should display**: "No active game found" message
4. **Re-activate game**:
   ```sql
   UPDATE games SET status = 'active' WHERE status = 'archived';
   ```

## Database Verification Queries

### View All Claims
```sql
SELECT 
  position,
  first_name,
  last_name,
  claimed_by_name,
  claimed_by_email,
  payment_method,
  payment_status,
  claimed_at
FROM squares 
WHERE claimed_by_email IS NOT NULL
ORDER BY claimed_at DESC;
```

### Count Claims by Payment Method
```sql
SELECT 
  payment_method,
  COUNT(*) as count,
  SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_count
FROM squares
WHERE claimed_by_email IS NOT NULL
GROUP BY payment_method;
```

### Find Top Buyers
```sql
SELECT 
  claimed_by_name,
  claimed_by_email,
  COUNT(*) as square_count,
  COUNT(*) * (SELECT cost_per_square FROM games WHERE status = 'active' LIMIT 1) as total_spent
FROM squares
WHERE claimed_by_email IS NOT NULL
GROUP BY claimed_by_name, claimed_by_email
ORDER BY square_count DESC
LIMIT 10;
```

### Test RLS Policies
```sql
-- As anonymous user (should work - public can read active games)
SELECT * FROM games WHERE status = 'active';

-- As anonymous user (should work - public can read squares)
SELECT * FROM squares WHERE game_id = (SELECT id FROM games WHERE status = 'active' LIMIT 1);

-- As anonymous user trying to update a square (should work if square is unclaimed)
-- This simulates the claim action
UPDATE squares 
SET 
  first_name = 'Test',
  last_name = 'User',
  claimed_by_email = 'test@example.com',
  payment_method = 'cash',
  payment_status = 'unpaid',
  claimed_at = NOW()
WHERE 
  game_id = (SELECT id FROM games WHERE status = 'active' LIMIT 1)
  AND position = 0
  AND claimed_by_email IS NULL;
```

## Common Issues & Troubleshooting

### Issue: "Failed to load game data"
- **Cause**: No active game or Supabase connection issue
- **Fix**: 
  1. Check `.env` credentials
  2. Verify game exists with `status = 'active'`
  3. Check browser console for detailed error

### Issue: "Failed to claim squares"
- **Cause**: RLS policy blocking update or square already claimed
- **Fix**:
  1. Verify RLS policies applied correctly
  2. Check if square is already claimed
  3. Refresh page and try again

### Issue: Squares don't initialize
- **Cause**: Trigger not created or not firing
- **Fix**:
  ```sql
  -- Manually initialize squares for existing game
  SELECT initialize_game_squares(id) FROM games WHERE status = 'active';
  ```

### Issue: claimed_by_name is NULL
- **Cause**: Trigger not working
- **Fix**:
  ```sql
  -- Manually sync names
  UPDATE squares 
  SET claimed_by_name = first_name || ' ' || last_name
  WHERE first_name IS NOT NULL AND last_name IS NOT NULL AND claimed_by_name IS NULL;
  ```

### Issue: Venmo handle not showing
- **Cause**: Game doesn't have venmo_handle set
- **Fix**:
  ```sql
  UPDATE games SET venmo_handle = 'your-venmo-handle' WHERE status = 'active';
  ```
- **Expected behavior**: If venmo_handle is NULL, modal shows "Venmo details will be provided"

## Performance Notes

- The board fetches all 100 squares on load
- Each claim updates squares individually (one UPDATE per square)
- After successful claim, board refetches all squares
- For large numbers of simultaneous claims, consider debouncing or optimistic updates

## Security Verification

### RLS Policies
- ✅ Public can read active games
- ✅ Public can read squares for active games
- ✅ Public can claim (update) unclaimed squares
- ✅ Public CANNOT update claimed squares (unless payment_status = 'unpaid')
- ✅ Public CANNOT delete squares
- ✅ Only admins can manage games, scores, and admins table

### Data Validation
- ✅ First name: 1-100 characters, required
- ✅ Last name: 1-100 characters, required
- ✅ Email: Valid format, required
- ✅ Payment method: Must be 'cash' or 'venmo'
- ✅ claimed_by_name auto-computed (no injection risk)

## Next Steps (Out of Scope for This PR)

- Admin panel: Mark squares as paid
- Admin panel: Release/unclaim squares
- Email notifications on successful claim
- Update Prize Pot and Top Buyers in real-time
- CSV export of claims
- Number randomization UI
