# Merch System Testing Guide

This document outlines how to test the new HeartCoin-based merch system that uses the database as the source of truth for all prices and product information.

## Prerequisites

Before testing, ensure that the following SQL scripts have been executed:

1. `sql/create_merch_items_table.sql` - Creates the merch_items table
2. `sql/update_orders_table_for_merch.sql` - Updates orders table for merch support
3. `sql/purchase_item_with_heartcoins_merch.sql` - New secure purchase function
4. `sql/update_order_shipping.sql` - Shipping update function

## Test Setup

### 1. Create Test User with HeartCoins

```sql
-- First ensure your test user has a profile
INSERT INTO profiles (id, username, heartcoin_balance) 
VALUES (
  'your-test-user-uuid', 
  'test_user', 
  100
) ON CONFLICT (id) DO UPDATE SET heartcoin_balance = 100;
```

### 2. Verify Merch Items

Check that merch items are loaded correctly:

```sql
SELECT id, name, slug, price_heartcoins, is_active, category 
FROM merch_items 
WHERE is_active = true 
ORDER BY name;
```

Expected result: Should show all active merchandise with proper HeartCoin prices.

## Test Scenarios

### Test 1: Successful Purchase Flow

**Steps:**
1. Open the HeartCoinButton modal
2. Navigate to the "USE" tab, then "MERCH" subtab
3. Verify that merch items load from database (not hardcoded)
4. Select an item with a price lower than your HeartCoin balance
5. Click "PAY WITH [X HeartCoins]"
6. Confirm the purchase
7. Verify shipping form appears
8. Fill out shipping information:
   - Full Name: "Test User"
   - Address Line 1: "123 Test St"
   - City: "Test City"  
   - State: "TS"
   - ZIP: "12345"
   - Country: "United States"
9. Submit shipping form

**Expected Results:**
- HeartCoin balance decreases by item price
- Order created in `orders` table with `pending_fulfillment` status
- Shipping information saved to order
- Success message: "Order confirmed! Your artifact is on its way through the Heartverse."
- Transaction recorded in `heartcoin_transactions` table

**Verification Queries:**
```sql
-- Check balance was deducted
SELECT heartcoin_balance FROM profiles WHERE id = 'your-test-user-uuid';

-- Check order was created
SELECT * FROM orders WHERE user_id = 'your-test-user-uuid' ORDER BY created_at DESC LIMIT 1;

-- Check transaction was recorded  
SELECT * FROM heartcoin_transactions WHERE user_id = 'your-test-user-uuid' ORDER BY created_at DESC LIMIT 1;
```

### Test 2: Insufficient HeartCoins

**Setup:**
```sql
UPDATE profiles SET heartcoin_balance = 1 WHERE id = 'your-test-user-uuid';
```

**Steps:**
1. Try to purchase an item that costs more than 1 HeartCoin
2. Confirm purchase

**Expected Results:**
- Error message: "Insufficient HeartCoins. You have 1, but need [X]. Earn more by completing quests!"
- No order created
- Balance unchanged

### Test 3: Database Price Authority

**Setup:**
1. Note current price of an item in the UI
2. Update the price in the database:
```sql
UPDATE merch_items SET price_heartcoins = 999 WHERE slug = 'necklace';
```
3. Refresh the application

**Expected Results:**
- UI shows new price (999 HeartCoins)
- Purchase attempts use database price, not any cached/hardcoded price

### Test 4: Item Not Available

**Setup:**
```sql
UPDATE merch_items SET is_active = false WHERE slug = 'pin';
```

**Steps:**
1. Refresh application
2. Verify 'pin' item no longer appears in the merch list

**Expected Results:**
- Item not displayed in UI
- Cannot purchase inactive items

### Test 5: Invalid Shipping Information

**Steps:**
1. Complete a purchase successfully 
2. In shipping form, leave required fields blank
3. Try to submit

**Expected Results:**
- Submit button remains disabled
- Clear validation messages for missing fields

### Test 6: Concurrent Purchase Protection

This tests that the database function prevents race conditions:

**Steps:**
1. Set user balance to exactly match item price
2. Attempt purchase (should succeed)
3. Immediately attempt to purchase same item again

**Expected Results:**
- First purchase succeeds
- Second purchase fails with insufficient funds
- No negative balance

## Logging Verification

Check browser console and server logs for proper logging:

**Purchase Attempt:**
```
[PURCHASE] User {uuid} attempting to purchase 1x {item_id}
```

**Purchase Success:**  
```
[PURCHASE] Success - Order {order_id} created for user {uuid}
```

**Shipping Update:**
```
[SHIPPING] User {uuid} updating shipping info for order {order_id}
[SHIPPING] Success - Order {order_id} shipping info updated
```

## Error Cases to Test

1. **Network errors** - Disconnect network during purchase
2. **Invalid merch item ID** - Try to purchase non-existent item
3. **Malformed shipping data** - Send invalid data to shipping endpoint
4. **Authentication failures** - Purchase without valid session

## Cleanup

After testing, reset test data:

```sql
-- Reset test user balance
UPDATE profiles SET heartcoin_balance = 100 WHERE id = 'your-test-user-uuid';

-- Reactivate test items
UPDATE merch_items SET is_active = true WHERE slug = 'pin';

-- Reset prices if changed
UPDATE merch_items SET price_heartcoins = 12 WHERE slug = 'necklace';

-- Clean up test orders if desired
DELETE FROM orders WHERE user_id = 'your-test-user-uuid' AND created_at > NOW() - INTERVAL '1 hour';
```

## Success Criteria

✅ All merch items load from database, not hardcoded arrays  
✅ Prices come exclusively from database  
✅ Purchase flow creates order with correct HeartCoin deduction  
✅ Shipping information updates order correctly  
✅ Error handling works for all failure scenarios  
✅ Proper logging throughout the flow  
✅ No race conditions or negative balances possible  
✅ UI shows appropriate loading and error states