"use client";

import { ElementIcon } from '@/lib/elementIcons';
import { getElementColor } from '@/lib/supabase/chat';
import { sfx } from '@/lib/sfx';
import safeKey from '@/utils/safeKey';
import { getOrCreateGuestNameSync } from '@/lib/supabase/guest';

// Debug flag
const DEBUG = process.env.NODE_ENV === 'development';

// Get guest username from localStorage (stable identity across sessions) - SYNCHRONOUS
const getGlobalAlienName = () => {
  if (typeof window !== 'undefined') {
    return getOrCreateGuestNameSync();
  }
  return 'ALIEN000000';
};

// We now generate stable keys per item render using safeKey

/**
 * UserList Component
 * Shows active users in the chat with element-themed styling
 */
export default function UserList({ users, onUserClick, loading, currentUserProfile }) {
  DEBUG && console.log('🔥 UserList received:', { users, userCount: users?.length, loading });

  // Force add a guest user if no users exist - use persistent guest username
  const guestUsername = getGlobalAlienName();
  const rawUsers = users?.length > 0 ? users : [{
    id: `guest-${guestUsername}`,
    name: guestUsername,
    element: 'alien',
    avatar_badge_id: null,
    last_seen: new Date().toISOString()
  }];

  // Use raw users; keys are generated per-item with safeKey during render
  const displayUsers = rawUsers || [];

  // Debug logging for key issues
  if (DEBUG) {
    const keys = displayUsers.map((u, i) => safeKey('user', u.id, u.name, i));
    const keySet = new Set(keys);
    const emptyKeys = keys.filter(k => !k).length;
    const duplicateCount = keys.length - keySet.size;
    if (emptyKeys > 0 || duplicateCount > 0) {
      console.warn(`⚠️ UserList key issues: ${emptyKeys} empty keys, ${duplicateCount} duplicates`);
    }
  }

  DEBUG && console.log('🔥 DisplayUsers final:', displayUsers);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-2">
        <div
          className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"
        />
        <p className="text-xs text-white/60 mt-2 text-center">Loading users...</p>
      </div>
    );
  }

  // Always show the user list - don't check for empty users

  return (
    <div className="h-full overflow-y-auto px-0.5 py-2 space-y-2">

      {/* User List */}
      {displayUsers?.length > 0 ? displayUsers.map((user, i) => (
        <UserListItem
          key={safeKey('user', user.id, user.name, i)}
          user={user}
          onClick={() => onUserClick(user.id)}
          currentUserProfile={currentUserProfile}
        />
      )) : (
        /* Emergency fallback - always show at least one guest user */
        <UserListItem
          key={safeKey('user', `guest-${guestUsername}`, guestUsername, 0)}
          user={{
            id: `guest-${guestUsername}`,
            name: guestUsername,
            element: 'alien',
            avatar_badge_id: null,
            last_seen: new Date().toISOString()
          }}
          onClick={() => onUserClick(`guest-${guestUsername}`)}
          currentUserProfile={currentUserProfile}
        />
      )}
    </div>
  );
}

/**
 * Individual User List Item
 */
function UserListItem({ user, onClick, currentUserProfile }) {
  const elementColor = getElementColor(user.element);
  const displayName = user.name || 'Anonymous';

  return (
    <button
      onClick={() => {
        try {
          const audio = new Audio('/audio/click.mp3');
          audio.volume = 0.3;
          audio.play().catch(error => {
            console.log('Click audio play failed:', error);
          });
        } catch (error) {
          console.log('Click audio creation failed:', error);
        }
        onClick();
      }}
      className="w-full px-0.5 py-2 rounded-lg transition-all duration-200 hover:scale-105 group"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: `2px solid ${elementColor}CC`,
        boxShadow: `0 0 20px ${elementColor}80`
      }}
      onMouseEnter={(e) => {
        e.target.style.background = `${elementColor}15`;
        e.target.style.boxShadow = `0 0 25px ${elementColor}90`;
        e.target.style.borderColor = `${elementColor}FF`;
        try { sfx.play('hover', 0.3); } catch {}
      }}
      onMouseLeave={(e) => {
        e.target.style.background = 'rgba(255, 255, 255, 0.05)';
        e.target.style.boxShadow = `0 0 20px ${elementColor}80`;
        e.target.style.borderColor = `${elementColor}CC`;
      }}
    >
      <div className="flex flex-col items-center space-y-1">
        {/* Username with icon */}
        <div className="flex items-center space-x-1 w-full justify-center">
          {/* Small user icon */}
          {user.id === 'anonymous' || (typeof user.id === 'string' && user.id.startsWith('guest-')) ? (
            <img src="/elements/alien.webp" alt="Alien" className="w-5 h-5 flex-shrink-0" />
          ) : user?.profile_image_url ? (
            <img
              src={user.profile_image_url}
              alt="Profile"
              className="w-5 h-5 rounded-full flex-shrink-0 object-cover"
              style={{}}
              onError={(e) => {
                const target = e.target;
                if (target && target.parentElement) {
                  target.parentElement.innerHTML = '';
                  const img = document.createElement('img');
                  const el = (user.element || '').toLowerCase();
                  img.src = el ? `/elements/${el}.webp` : '/elements/chxndler.webp';
                  img.alt = 'Element';
                  img.className = 'w-3 h-3 flex-shrink-0 object-cover';
                  target.parentElement.appendChild(img);
                }
              }}
            />
          ) : (
            <img
              src={user?.element ? `/elements/${String(user.element).toLowerCase()}.webp` : '/elements/chxndler.webp'}
              alt="Element"
              className="w-5 h-5 flex-shrink-0 object-cover rounded-full"
              style={{}}
            />
          )}

          <p
            className="text-base font-bold leading-tight truncate"
            style={{
              color: elementColor,
              maxWidth: '120px'
            }}
          >
            {displayName.length > 18 ? displayName.slice(0, 17) + '…' : displayName}
          </p>
        </div>
      </div>
    </button>
  );
}

/**
 * User Count Badge (optional - for header)
 */
export function UserCountBadge({ count, className = '' }) {
  return (
    <div
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${className}`}
      style={{
        background: 'rgba(0, 255, 255, 0.2)',
        border: '1px solid rgba(0, 255, 255, 0.5)',
        color: '#00FFFF',
        textShadow: '0 0 8px rgba(0, 255, 255, 0.8)'
      }}
    >
      <span className="mr-1">👥</span>
      {count}
    </div>
  );
}
