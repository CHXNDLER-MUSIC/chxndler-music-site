"use client";

import { useState, useEffect } from 'react';
import { useUserRelics, RelicWithStatus } from '@/lib/useUserRelics';
import { supabaseClient } from '@/lib/supabaseClient';

interface RelicsGalleryProps {
  className?: string;
}

interface RelicCardProps {
  relic: RelicWithStatus;
  onDownload?: (relic: RelicWithStatus) => void;
}

function RelicCard({ relic, onDownload }: RelicCardProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!relic.isUnlocked || !relic.image_url) return;
    
    setDownloading(true);
    try {
      // Create a temporary download link
      const link = document.createElement('a');
      link.href = relic.image_url;
      link.download = `${relic.code}.webp`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      onDownload?.(relic);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  const getRarityColor = (rarity?: string | null) => {
    switch (rarity?.toLowerCase()) {
      case 'common': return 'border-gray-400 bg-gray-50';
      case 'uncommon': return 'border-green-400 bg-green-50';
      case 'rare': return 'border-blue-400 bg-blue-50';
      case 'epic': return 'border-purple-400 bg-purple-50';
      case 'legendary': return 'border-yellow-400 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div 
      className={`
        relative p-4 rounded-lg border-2 transition-all duration-200 
        ${getRarityColor(relic.rarity)}
        ${relic.isUnlocked 
          ? 'hover:shadow-lg cursor-pointer' 
          : 'opacity-50 cursor-not-allowed grayscale'
        }
      `}
      onClick={relic.isUnlocked ? handleDownload : undefined}
    >
      {/* Relic Image */}
      <div className="aspect-square mb-3 relative overflow-hidden rounded-md bg-white">
        {relic.image_url ? (
          <img 
            src={relic.image_url}
            alt={relic.label}
            className={`
              w-full h-full object-contain p-2
              ${relic.isLocked ? 'opacity-30' : ''}
            `}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-2xl">?</span>
          </div>
        )}
        
        {/* Lock overlay for locked relics */}
        {relic.isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <svg 
              className="w-8 h-8 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
          </div>
        )}

        {/* Download indicator for unlocked relics */}
        {relic.isUnlocked && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg 
              className="w-4 h-4 text-gray-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
          </div>
        )}
      </div>

      {/* Relic Info */}
      <div className="space-y-2">
        <h3 className="font-medium text-sm text-gray-900 truncate">{relic.label}</h3>
        
        <div className="flex items-center justify-between text-xs">
          {relic.rarity && (
            <span className={`
              px-2 py-1 rounded-full font-medium
              ${relic.rarity === 'common' ? 'bg-gray-200 text-gray-800' : ''}
              ${relic.rarity === 'uncommon' ? 'bg-green-200 text-green-800' : ''}
              ${relic.rarity === 'rare' ? 'bg-blue-200 text-blue-800' : ''}
              ${relic.rarity === 'epic' ? 'bg-purple-200 text-purple-800' : ''}
              ${relic.rarity === 'legendary' ? 'bg-yellow-200 text-yellow-800' : ''}
            `}>
              {relic.rarity}
            </span>
          )}
          
          {relic.obtained_at && (
            <span className="text-gray-500">
              {new Date(relic.obtained_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {relic.description && (
          <p className="text-xs text-gray-600 line-clamp-2">
            {relic.description}
          </p>
        )}

        {/* Status indicator */}
        <div className="text-xs font-medium">
          {relic.isUnlocked ? (
            <span className="text-green-600">
              {downloading ? 'Downloading...' : 'Click to download'}
            </span>
          ) : (
            <span className="text-gray-500">Locked</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RelicsGallery({ className = '' }: RelicsGalleryProps) {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const {
    relics,
    unlockedRelics,
    lockedRelics,
    loading,
    error,
    unlockedCount,
    totalCount,
    refetch
  } = useUserRelics(user?.id);

  useEffect(() => {
    let mounted = true;

    async function getUser() {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (mounted && session?.user) {
          console.log('[RelicsGallery] User session found:', session.user.id);
          setUser({ id: session.user.id });
        } else {
          console.log('[RelicsGallery] No user session found');
        }
      } catch (error) {
        console.error('[RelicsGallery] Error getting user:', error);
      }
    }

    getUser();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          console.log('[RelicsGallery] Auth state changed:', event, session?.user?.id);
          setUser(session?.user ? { id: session.user.id } : null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Listen for relics:refresh event to update after Element of Day claim
  useEffect(() => {
    const handleRelicsRefresh = () => {
      console.log('[RelicsGallery] Received relics:refresh event, refetching...');
      refetch();
    };
    window.addEventListener('relics:refresh', handleRelicsRefresh);
    return () => window.removeEventListener('relics:refresh', handleRelicsRefresh);
  }, [refetch]);

  // Log when relics data changes
  useEffect(() => {
    if (!loading && user) {
      console.log('[RelicsGallery] Relics data updated:', {
        total: totalCount,
        unlocked: unlockedCount,
        locked: lockedRelics.length,
        unlockedCodes: unlockedRelics.map(r => r.code),
      });
    }
  }, [relics, loading, user, totalCount, unlockedCount, lockedRelics, unlockedRelics]);

  const handleRelicDownload = (relic: RelicWithStatus) => {
    console.log(`Downloaded relic: ${relic.label}`);
  };

  if (!user) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <p className="text-gray-600">Sign in to view your relic collection</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <div className="inline-flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading your relics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <p className="text-red-600">Error loading relics: {error}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Relic Collection</h2>
          <p className="text-gray-600">
            {unlockedCount} of {totalCount} relics unlocked
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-gray-500">Collection Progress</div>
          <div className="text-lg font-semibold">
            {totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ 
            width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` 
          }}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-4 border-b">
        <button className="px-4 py-2 font-medium text-blue-600 border-b-2 border-blue-600">
          All ({totalCount})
        </button>
        <button className="px-4 py-2 font-medium text-gray-600 hover:text-gray-900">
          Unlocked ({unlockedCount})
        </button>
        <button className="px-4 py-2 font-medium text-gray-600 hover:text-gray-900">
          Locked ({lockedRelics.length})
        </button>
      </div>

      {/* Relics Grid */}
      {relics.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No relics available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {relics.map((relic) => (
            <RelicCard
              key={relic.id}
              relic={relic}
              onDownload={handleRelicDownload}
            />
          ))}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">How to Unlock Relics</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Explore different planets in the Heartverse</li>
          <li>• Redeem secret phrases during live streams</li>
          <li>• Reach heartcoin milestones</li>
          <li>• Complete special achievements</li>
          <li>• Participate in community events</li>
        </ul>
      </div>
    </div>
  );
}