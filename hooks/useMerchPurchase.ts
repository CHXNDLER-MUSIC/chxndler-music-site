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
      const response = await fetch('/api/merch/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchItemId: merchItem.id,
          quantity
        }),
      });

      const result = await response.json();

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
      const errorMessage = err instanceof Error ? err.message : 'Purchase failed';
      console.error('[useMerchPurchase] Purchase error:', {
        error: err,
        message: errorMessage,
        merch_item_id: merchItem.id,
        qty: quantity
      });
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
