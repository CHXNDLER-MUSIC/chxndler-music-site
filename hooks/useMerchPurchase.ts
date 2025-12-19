import { useState, useRef, useCallback } from 'react';
import { PurchaseWithHeartcoinsResult, ShippingInfo, ShippingUpdateResponse } from '@/types/merch';

// New purchase request interface - client sends only IDs, not prices
// Server is authoritative for price lookup
export interface PurchaseRequest {
  merchItemId: string;      // The UUID from merch_items.id
  quantity: number;
  clientSlug?: string;      // For logging/debugging only
  idempotencyKey: string;   // Prevents double-submit on server
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
    const { merchItemId, quantity, clientSlug, idempotencyKey } = request;

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

    // Prepare payload expected by API route
    // IMPORTANT: Do NOT send price - server looks it up
    const payload = {
      merchItemId,
      quantity,
      idempotencyKey,
      clientSlug, // For server-side logging only
    };

    console.log('[useMerchPurchase] Initiating purchase (single API call):', {
      merchItemId,
      quantity,
      clientSlug,
      idempotencyKey,
    });

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
        console.log('[useMerchPurchase] Response text (first 500 chars):', responseText.slice(0, 500));
        result = JSON.parse(responseText);
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
        console.error('[updateShipping] Fetch failed (network error):', fetchError);
        throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Failed to connect to server'}`);
      }

      let result;
      try {
        const responseText = await response.text();
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[updateShipping] Failed to parse response as JSON:', parseError);
        throw new Error(`Server returned invalid response: ${parseError instanceof Error ? parseError.message : 'Parse error'}`);
      }

      if (!response.ok) {
        const errorMessage = result?.error || result?.message || 'Failed to update shipping information';
        throw new Error(`Shipping update failed (${response.status}): ${errorMessage}`);
      }

      console.log('Shipping update successful:', result.data);
      return result.data as ShippingUpdateResponse;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update shipping information';
      console.error('Shipping update error:', errorMessage);
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
