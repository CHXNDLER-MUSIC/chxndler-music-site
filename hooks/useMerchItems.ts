import { useState, useEffect } from 'react';
import { MerchItem } from '@/types/merch';

export function useMerchItems(category?: 'physical' | 'digital') {
  const [items, setItems] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMerchItems = async () => {
      try {
        setLoading(true);
        setError(null);

        const url = new URL('/api/merch/items', window.location.origin);
        if (category) {
          url.searchParams.set('category', category);
        }

        const response = await fetch(url.toString());
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch merchandise items');
        }

        const data = await response.json();
        setItems(data.data || []);
      } catch (err) {
        console.error('Error fetching merch items:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch items');
      } finally {
        setLoading(false);
      }
    };

    fetchMerchItems();
  }, [category]);

  return {
    items,
    loading,
    error,
    refetch: () => {
      setLoading(true);
      setError(null);
      // Re-run the effect by updating a dependency
    }
  };
}