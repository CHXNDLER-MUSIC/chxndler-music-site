-- Add is_winner column to orders table for hidden signal reveal
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_winner boolean DEFAULT false NOT NULL;

-- Partial index: fast lookup since only one winner ever exists
CREATE INDEX IF NOT EXISTS idx_orders_chxndler_winner
  ON orders (is_winner)
  WHERE is_winner = true;
