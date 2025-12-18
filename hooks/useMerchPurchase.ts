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

    // Log before calling RPC
    console.log('[useMerchPurchase] Initiating purchase:', {
      merch_item_id: merchItem.id,
      qty: quantity
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
          body: JSON.stringify({
            merchItemId: merchItem.id,
            quantity
          }),
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

      let result;
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
        throw new Error(result.error || 'Purchase failed');
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
        merch_item_id: merchItem.id,
        qty: quantity
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
      const response = await fetch('/api/merch/updateShipping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shippingInfo),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update shipping information');
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
