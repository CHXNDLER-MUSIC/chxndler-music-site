"use client";

import { ElementIcon } from '@/lib/elementIcons';
import { getElementColor } from '@/lib/supabase/chat';

/**
 * UserList Component
 * Shows active users in the chat with element-themed styling
 */
export default function UserList({ users, onUserClick, loading }) {
  console.log('🔥 UserList received:', { users, userCount: users?.length, loading });
  
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

  if (users.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-2">
        <div 
          className="w-8 h-8 rounded-full bg-cyan-400/20 border border-cyan-400/50 flex items-center justify-center mb-2"
        >
          <span className="text-cyan-400 text-xs">👥</span>
        </div>
        <p className="text-xs text-white/40 text-center">No users yet</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-2 space-y-2">
      {/* Header */}
      <div className="text-center mb-3">
        <p 
          className="text-xs font-semibold"
          style={{
            color: '#00FFFF',
            textShadow: '0 0 8px rgba(0, 255, 255, 0.6)'
          }}
        >
          ONLINE
        </p>
        <div className="w-8 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent mx-auto mt-1" />
      </div>

      {/* User List */}
      {users.map((user) => (
        <UserListItem
          key={user.id}
          user={user}
          onClick={() => onUserClick(user.id)}
        />
      ))}
    </div>
  );
}

/**
 * Individual User List Item
 */
function UserListItem({ user, onClick }) {
  const elementColor = getElementColor(user.element);
  const displayName = user.name || 'Anonymous';

  return (
    <button
      onClick={onClick}
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
      }}
      onMouseLeave={(e) => {
        e.target.style.background = 'rgba(255, 255, 255, 0.05)';
        e.target.style.boxShadow = `0 0 10px ${elementColor}30`;
        e.target.style.borderColor = `${elementColor}40`;
      }}
    >
      <div className="flex flex-col items-center space-y-1">
        {/* Avatar */}
        <div 
          className="relative w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: `${elementColor}20`,
            border: `2px solid ${elementColor}`,
            boxShadow: `0 0 15px ${elementColor}60`
          }}
        >
          {user.avatar_badge_id ? (
            // Custom badge avatar (you'll need to fetch badge details)
            <div 
              className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center"
              style={{ color: elementColor }}
            >
              🏆
            </div>
          ) : user.element ? (
            // Element icon
            <ElementIcon 
              name={user.element} 
              width={20} 
              height={20}
              className="filter brightness-0 saturate-100%"
              style={{
                filter: `brightness(0) saturate(100%) invert(1)`,
                opacity: 0.9
              }}
            />
          ) : (
            // Default avatar
            <div 
              className="w-5 h-5 rounded-full"
              style={{ 
                background: `linear-gradient(45deg, ${elementColor}, #FFFFFF)`,
                opacity: 0.8
              }}
            />
          )}

          {/* Online indicator */}
          <div 
            className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-black"
            style={{
              background: 'linear-gradient(45deg, #00FF00, #32CD32)',
              boxShadow: '0 0 6px rgba(0, 255, 0, 0.8)'
            }}
          />
        </div>

        {/* Username */}
        <p 
          className="text-xs font-medium text-center leading-tight truncate w-full"
          style={{
            color: elementColor,
            textShadow: `0 0 6px ${elementColor}80`,
            maxWidth: '60px'
          }}
        >
          {displayName.length > 8 ? displayName.slice(0, 7) + '…' : displayName}
        </p>
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