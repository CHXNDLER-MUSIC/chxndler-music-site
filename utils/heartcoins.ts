import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Award HeartCoins to a user by creating a transaction record.
 * The database trigger will automatically update heartcoin_balance and heartcoin_total.
 * 
 * @param supabaseClient - The Supabase client instance
 * @param userId - The user ID to award HeartCoins to
 * @param amount - The amount of HeartCoins to award (can be negative for spending)
 * @param reason - Description of why the HeartCoins were awarded/spent
 * @param metadata - Additional data about the transaction
 */
export async function awardHeartCoins(
  supabaseClient: SupabaseClient,
  userId: string,
  amount: number,
  reason: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  const { error } = await supabaseClient
    .from('heartcoin_transactions')
    .insert({
      user_id: userId,
      amount: amount,
      reason: reason,
      metadata: metadata,
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error('Failed to award HeartCoins:', error);
    throw new Error(`Failed to award HeartCoins: ${error.message}`);
  }
}