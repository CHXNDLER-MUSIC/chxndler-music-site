"use client";

import { ElementIcon } from '@/lib/elementIcons';
import { getElementColor } from '@/lib/supabase/chat';
import { sfx } from '@/lib/sfx';

// Import the global alien name function from ChatPanel
const getGlobalAlienName = () => {
  // Check if we already have a stored name
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('alienName');
    if (stored) {
      return stored;
    }
  }
  
  // Generate new alien name only if none exists
  const alienNumber = Math.floor(Math.random() * 99999999) + 1;
  const paddedNumber = alienNumber.toString().padStart(8, '0');
  const newAlienName = `ALIEN${paddedNumber}`;
  
  // Store in session storage
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('alienName', newAlienName);
  }
  
  return newAlienName;
};

/**
 * UserList Component
 * Shows active users in the chat with element-themed styling
 */
export default function UserList({ users, onUserClick, loading, currentUserProfile }) {
  console.log('🔥 UserList received:', { users, userCount: users?.length, loading });
  
  // Force add an anonymous user if no users exist - use global alien name for consistency
  const displayUsers = users?.length > 0 ? users : [{
    id: 'anonymous',
    name: getGlobalAlienName(), // Use the global alien name function for consistency
    element: 'alien',
    avatar_badge_id: null,
    last_seen: new Date().toISOString()
  }];
  
  console.log('🔥 DisplayUsers final:', displayUsers);
  
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
    <div className="h-full overflow-y-auto p-2 space-y-2">

      {/* User List */}
      {displayUsers?.length > 0 ? displayUsers.map((user) => (
        <UserListItem
          key={user.id}
          user={user}
          onClick={() => onUserClick(user.id)}
          currentUserProfile={currentUserProfile}
        />
      )) : (
        /* Emergency fallback - always show at least one alien user */
        <UserListItem
          key="emergency-alien"
          user={{
            id: 'anonymous',
            name: getGlobalAlienName(), // Use the global alien name function for consistency
            element: 'alien',
            avatar_badge_id: null,
            last_seen: new Date().toISOString()
          }}
          onClick={() => onUserClick('anonymous')}
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
      className="w-full p-2 rounded-lg transition-all duration-200 hover:scale-105 group"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: `1px solid ${elementColor}40`,
        boxShadow: `0 0 10px ${elementColor}30`
      }}
      onMouseEnter={(e) => {
        e.target.style.background = `${elementColor}15`;
        e.target.style.boxShadow = `0 0 20px ${elementColor}50`;
        e.target.style.borderColor = `${elementColor}60`;
        try { sfx.play('hover', 0.3); } catch {}
      }}
      onMouseLeave={(e) => {
        e.target.style.background = 'rgba(255, 255, 255, 0.05)';
        e.target.style.boxShadow = `0 0 10px ${elementColor}30`;
        e.target.style.borderColor = `${elementColor}40`;
      }}
    >
      <div className="flex flex-col items-center space-y-1">
        {/* Username with icon */}
        <div className="flex items-center space-x-1 w-full justify-center">
          {/* Small user icon */}
          {user.id === 'anonymous' ? (
            <img src="/elements/alien.webp" alt="Alien" className="w-3 h-3 flex-shrink-0" />
          ) : user?.profile_image_url ? (
            <img 
              src={user.profile_image_url} 
              alt="Profile" 
              className="w-3 h-3 rounded-full flex-shrink-0 object-cover"
              style={{
                border: '1px solid rgba(242, 239, 29, 0.5)',
                boxShadow: '0 0 4px rgba(242, 239, 29, 0.3)'
              }}
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
              className="w-3 h-3 flex-shrink-0 object-cover rounded-full"
              style={{
                border: '1px solid rgba(242, 239, 29, 0.5)',
                boxShadow: '0 0 4px rgba(242, 239, 29, 0.3)'
              }}
            />
          )}
          
          <p 
            className="text-xs font-medium leading-tight truncate"
            style={{
              color: elementColor,
              textShadow: `0 0 6px ${elementColor}80`,
              maxWidth: '90px'
            }}
          >
            {displayName.length > 14 ? displayName.slice(0, 13) + '…' : displayName}
          </p>
          
          {/* User's chosen element */}
          {user.element && user.element !== 'alien' && (
            <ElementIcon 
              name={user.element}
              width={12}
              height={12}
              className="flex-shrink-0 ml-1"
              style={{
                filter: `drop-shadow(0 0 4px ${elementColor}60)`
              }}
            />
          )}
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
