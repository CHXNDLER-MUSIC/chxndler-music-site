import { useState, useRef, useCallback } from 'react';
import { PurchaseWithHeartcoinsResult, ShippingInfo, ShippingUpdateResponse } from '@/types/merch';

// Purchase request interface for purchase_merch_with_heartcoins_v4
// v4 signature: (p_merch_item_id uuid, p_quantity int, p_client_request_id uuid)
// Server is authoritative for price lookup - do NOT send price
export interface PurchaseRequest {
  merchItemId: string;      // -> p_merch_item_id (UUID from merch_items.id)
  quantity: number;         // -> p_quantity
  idempotencyKey: string;   // -> p_client_request_id (prevents double-submit)
  clientSlug?: string;      // UNUSED by v4 - kept for backwards compat, not sent to API
  selected_color?: string;  // -> p_selected_color (color variant purchased)
}

/**
 * Hook for handling merch purchases with HeartCoins.
 *
 * DOUBLE-SUBMIT PREVENTION:
 * - Uses useRef for synchronous in-flight check (not affected by React batching)
 * - useState for UI updates (button disabled state)
 * - The ref check happens BEFORE any async work begins
 * - This prevents duplicate calls from: StrictMode, Fast Refresh, rapid clicks
 */
export function useMerchPurchase() {
  // useState for UI reactivity (disabling buttons, showing spinners)
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useRef for SYNCHRONOUS duplicate prevention
  // This is checked immediately and is NOT subject to React's async state batching
  const purchaseInFlightRef = useRef(false);

  const purchaseWithHeartCoins = useCallback(async (
    request: PurchaseRequest
  ): Promise<PurchaseWithHeartcoinsResult | null> => {
    // v4 only uses: merchItemId, quantity, idempotencyKey, selected_color
    const { merchItemId, quantity, idempotencyKey, selected_color } = request;

    // ============================================================
    // CRITICAL: Synchronous duplicate prevention using ref
    // This check happens BEFORE any async work and is not affected
    // by React's state batching or StrictMode double-invocation
    // ============================================================
    if (purchaseInFlightRef.current) {
      console.warn('[useMerchPurchase] BLOCKED: Purchase already in flight (ref check)', {
        idempotencyKey,
        merchItemId,
      });
      return null;
    }

    // Set ref IMMEDIATELY and SYNCHRONOUSLY before any async work
    purchaseInFlightRef.current = true;
    console.log('[useMerchPurchase] Purchase in flight set to TRUE', { idempotencyKey });

    // Also set state for UI updates (button disabled state)
    setIsProcessing(true);
    setError(null);

    // Basic validation: ensure merchItemId exists
    if (!merchItemId || typeof merchItemId !== 'string' || merchItemId.trim() === '') {
      const validationError = '[useMerchPurchase] Missing or invalid merchItemId';
      console.error(validationError, { request });
      setError('Invalid item. Please try again.');
      setIsProcessing(false);
      purchaseInFlightRef.current = false;
      return null;
    }

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      const validationError = '[useMerchPurchase] Missing idempotencyKey';
      console.error(validationError, { request });
      setError('Missing idempotency key. Please try again.');
      setIsProcessing(false);
      purchaseInFlightRef.current = false;
      return null;
    }

    // Prepare payload for API route -> purchase_merch_with_heartcoins_v4
    // v4 signature: (p_merch_item_id, p_quantity, p_client_request_id)
    // Do NOT send: price, clientSlug, order_type, userId - v4 handles internally
    const payload = {
      merchItemId,        // -> p_merch_item_id
      quantity,           // -> p_quantity
      idempotencyKey,     // -> p_client_request_id
      // Explicitly declare paymentType for server normalization/logging
      paymentType: 'heartcoins' as const,
      // Pass selected color variant if provided
      ...(selected_color ? { selected_color } : {}),
    };

    console.log('[useMerchPurchase] Initiating purchase (single API call):', payload);

    try {
      console.log('[useMerchPurchase] Making fetch request to /api/merch/purchase');

      let response: Response;
      try {
        response = await fetch('/api/merch/purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } catch (fetchError) {
        console.error('[useMerchPurchase] Fetch failed (network error):', fetchError);
        throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Failed to connect to server'}`);
      }

      console.log('[useMerchPurchase] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      let result: any;
      try {
        const responseText = await response.text();
        // Log full body safely (truncate to avoid massive output)
        console.log('[useMerchPurchase] Response text (first 1500 chars):', responseText.slice(0, 1500));
        result = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('[useMerchPurchase] Failed to parse response as JSON:', parseError);
        throw new Error(`Server returned invalid response: ${parseError instanceof Error ? parseError.message : 'Parse error'}`);
      }

      // Log the API response
      console.log('[useMerchPurchase] API response:', {
        status: response.status,
        ok: response.ok,
        result,
      });

      if (!response.ok) {
        // Handle idempotency as success if server indicates already processed
        if (
          response.status === 409 ||
          result?.idempotent === true ||
          (typeof result?.message === 'string' && result.message.toLowerCase().includes('already processed'))
        ) {
          console.warn('[useMerchPurchase] Treating idempotent response as success', {
            status: response.status,
            result,
          });
          const normalized = Array.isArray(result) ? result[0] : result || {};
          return {
            success: true,
            message: normalized?.message || 'Already processed',
            order_id: normalized?.order_id ?? null,
            user_id: normalized?.user_id ?? null,
            heartcoins_before: normalized?.heartcoins_before ?? null,
            heartcoins_after: normalized?.heartcoins_after ?? null,
            amount_spent: normalized?.amount_spent ?? normalized?.total_heartcoins ?? 0,
          } as PurchaseWithHeartcoinsResult;
        }

        const errorMessage = result?.error || result?.message || 'Purchase failed';
        console.error('[useMerchPurchase] Purchase failed response JSON:', {
          payload_sent: payload,
          response_json: result,
          status: response.status,
        });
        throw new Error(`Purchase failed (${response.status}): ${errorMessage}`);
      }

      // Handle array return shape from TABLE-returning RPC
      const normalizedResult = Array.isArray(result) ? result[0] : result;

      // Check if the purchase was actually successful
      if (!normalizedResult?.success) {
        throw new Error(normalizedResult?.message || 'Purchase failed');
      }

      console.log('[useMerchPurchase] Purchase successful:', normalizedResult);
      return normalizedResult as PurchaseWithHeartcoinsResult;

    } catch (err) {
      // Better error extraction - handle various error types
      let errorMessage = 'Purchase failed';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err && typeof err === 'object') {
        errorMessage = (err as any).message || (err as any).error || JSON.stringify(err) || 'Purchase failed';
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      console.error('[useMerchPurchase] Purchase error:', {
        errorType: err?.constructor?.name || typeof err,
        errorMessage,
        merchItemId,
        idempotencyKey,
      });

      setError(errorMessage);
      return null;
    } finally {
      // ============================================================
      // CRITICAL: Always reset both ref and state in finally block
      // This ensures we can retry after errors
      // ============================================================
      purchaseInFlightRef.current = false;
      setIsProcessing(false);
      console.log('[useMerchPurchase] Purchase in flight reset to FALSE');
    }
  }, []);

  const updateShipping = useCallback(async (shippingInfo: ShippingInfo): Promise<ShippingUpdateResponse | null> => {
    setIsProcessing(true);
    setError(null);

    console.log('[SHIPPING] using orders.id', shippingInfo.orderId);

    try {
      let response: Response;
      try {
        response = await fetch('/api/merch/updateShipping', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(shippingInfo),
        });
      } catch (fetchError) {
        console.error('[SHIPPING] Fetch failed (network error):', fetchError);
        throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Failed to connect to server'}`);
      }

      let result;
      try {
        const responseText = await response.text();
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[SHIPPING] Failed to parse response as JSON:', parseError);
        throw new Error(`Server returned invalid response: ${parseError instanceof Error ? parseError.message : 'Parse error'}`);
      }

      if (!response.ok) {
        const errorMessage = result?.error || result?.message || 'Failed to update shipping information';
        throw new Error(`Shipping update failed (${response.status}): ${errorMessage}`);
      }

      console.log('[SHIPPING] Shipping saved for order:', shippingInfo.orderId);
      return { success: true } as ShippingUpdateResponse;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update shipping information';
      console.error('[SHIPPING] Shipping update error:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    purchaseWithHeartCoins,
    updateShipping,
    isProcessing,
    error,
    clearError: useCallback(() => setError(null), []),
  };
}
