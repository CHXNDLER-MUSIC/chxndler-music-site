import { useState } from 'react';
import { MerchItem, PurchaseWithHeartcoinsResult, ShippingInfo, ShippingUpdateResponse } from '@/types/merch';

export function useMerchPurchase() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchaseWithHeartCoins = async (
    merchItem: MerchItem,
    quantity: number = 1
  ): Promise<PurchaseWithHeartcoinsResult | null> => {
    setIsProcessing(true);
    setError(null);

    // Basic validation: ensure merch_item_id exists
    if (!merchItem?.id || typeof merchItem.id !== 'string' || merchItem.id.trim() === '') {
      const validationError = '[useMerchPurchase] Missing merch_item_id (merchItem.id)';
      console.error(validationError, { merchItem });
      setError('Invalid item. Please try again.');
      setIsProcessing(false);
      return null;
    }

    // Prepare payload expected by API route (camelCase)
    const payload: {
      merchItemId: string;
      quantity: number;
      merchItemSlug?: string;
    } = {
      merchItemId: merchItem.id,
      quantity,
    };
    if (merchItem.slug) payload.merchItemSlug = merchItem.slug;

    // Log before calling RPC
    console.log('[useMerchPurchase] Initiating purchase:', {
      merchItemId: merchItem.id,
      quantity
    });
    console.log('[useMerchPurchase] Payload to be sent:', payload);

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
        contentType: response.headers.get('content-type')
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
        result
      });

      if (!response.ok) {
        const errorMessage = result?.error || result?.message || 'Purchase failed';
        // Log the response JSON on failure with the payload we sent
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
        // Try to extract message from error-like objects
        errorMessage = (err as any).message || (err as any).error || JSON.stringify(err) || 'Purchase failed';
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      console.error('[useMerchPurchase] Purchase error:', {
        errorType: err?.constructor?.name || typeof err,
        errorMessage,
        errorString: String(err),
        merchItemId: merchItem.id,
        quantity
      });

      // Also log the raw error for debugging
      console.error('[useMerchPurchase] Raw error object:', err);

      setError(errorMessage);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const updateShipping = async (shippingInfo: ShippingInfo): Promise<ShippingUpdateResponse | null> => {
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

      // Read response body exactly once using text() then parse
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
  };

  return {
    purchaseWithHeartCoins,
    updateShipping,
    isProcessing,
    error,
    clearError: () => setError(null)
  };
}
