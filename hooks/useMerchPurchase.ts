import { useState } from 'react';
import { MerchItem, PurchaseResponse, ShippingInfo, ShippingUpdateResponse } from '@/types/merch';

export function useMerchPurchase() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchaseWithHeartCoins = async (
    merchItem: MerchItem,
    quantity: number = 1
  ): Promise<PurchaseResponse | null> => {
    setIsProcessing(true);
    setError(null);

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

      if (!response.ok) {
        throw new Error(result.error || 'Purchase failed');
      }

      console.log('Purchase successful:', result.data);
      return result.data as PurchaseResponse;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Purchase failed';
      console.error('Purchase error:', errorMessage);
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