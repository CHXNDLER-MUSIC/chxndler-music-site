# Heartverse Card Gating System

This document describes the implementation of the tier-based card and audio gating system for the Heartverse project.

## Overview

The gating system controls access to cards, songs, and content based on:
1. **Release status** - Some cards are unreleased (`coming_soon`)
2. **User tier** - Users must have the required tier to access content
3. **Ownership** - Users who own cards can always access them

## Database Changes

### 1. Profiles Table
```sql
-- Add tier column with constraints
ALTER TABLE profiles ADD COLUMN tier TEXT NOT NULL DEFAULT 'wanderer';
ALTER TABLE profiles ADD CONSTRAINT profiles_tier_check 
  CHECK (tier IN ('wanderer', 'dreamer', 'lover', 'guide'));
```

### 2. Cards Table
```sql
-- Add gating columns
ALTER TABLE cards ADD COLUMN is_released BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE cards ADD COLUMN min_tier TEXT NOT NULL DEFAULT 'wanderer';
ALTER TABLE cards ADD CONSTRAINT cards_min_tier_check 
  CHECK (min_tier IN ('wanderer', 'dreamer', 'lover', 'guide'));
```

### 3. User Cards Table
The existing `user_cards` table already has the required structure:
- `user_id` - References the user
- `card_id` - References the card
- Unique constraint on `(user_id, card_id)`

## Core Components

### 1. Tier System (`utils/tier.ts`)
- Defines tier hierarchy: `wanderer` < `dreamer` < `lover` < `guide`
- Provides utilities for tier comparison and display names

### 2. Card Gating Logic (`utils/cardGating.ts`)
- `getCardGateState()` - Returns the access state for a card
- States: `"comingSoon" | "lockedTier" | "available" | "owned"`

### 3. Audio Gating (`utils/audioGating.ts`)
- `canPlayAudio()` - Checks if a user can play a song/audio
- Returns detailed access results with reasons

## Usage Examples

### In React Components

```tsx
import { getCardGateState, getTierDisplayName } from '@/types/card';
import { useAudioGate } from '@/components/AudioGateWrapper';

// Card gating
const gateState = getCardGateState(card, profile, userCards);

// Audio gating
const audioResult = useAudioGate({
  title: "Song Title",
  slug: "song-slug", 
  is_released: true,
  min_tier: "lover"
});
```

### Gating States

1. **`owned`** - User owns the card, full access
2. **`available`** - User meets tier requirement, can purchase/access
3. **`lockedTier`** - User's tier is too low
4. **`comingSoon`** - Card/content not released yet

## UI Behavior

### Digital Binder
- **Coming Soon**: Cards are blurred with "Coming Soon" overlay
- **Locked Tier**: Cards show "Reach [Tier] to unlock" 
- **Available**: Normal display with purchase options
- **Owned**: Green checkmark, "In Collection" badge

### Store Modal
- **Coming Soon**: "Coming Soon" disabled button
- **Locked Tier**: "Requires [Tier] Tier" disabled button  
- **Available**: Normal purchase buttons
- **Owned**: "Owned" button + "View in Binder" link

### Audio Players
- **Blocked**: 🔒 icon, disabled button, error message
- **Available**: Normal play/pause functionality

## Integration Points

### 1. BinderModal.tsx
- Uses `getCardState()` helper to check each card
- Shows appropriate UI states for each gating level
- Purchase buttons only appear for available cards

### 2. StoreModal.tsx  
- Checks gating before allowing purchases
- Updates button states and error messages
- Prevents Stripe/HeartCoin checkout for gated items

### 3. SimpleMediaPlayer.tsx
- Uses `useAudioGate()` hook to check playback access
- Shows lock icon and error messages for blocked audio
- Prevents `onToggle()` calls for gated content

### 4. AudioGateWrapper.tsx
- Reusable component for wrapping any audio-related UI
- Can show custom fallback content or default blocked messages

## Testing the System

### Manual Testing
1. **Database Setup**: Run the SQL migration files
2. **Test Data**: Create cards with different `min_tier` and `is_released` values
3. **User Testing**: Test with users having different tier levels
4. **Component Testing**: Verify UI states match the gating logic

### Test Scenarios
1. Wanderer user trying to access Lover-tier content → Should show "locked"
2. User trying to access unreleased content → Should show "coming soon"
3. User accessing owned content → Should show "owned" state
4. User meeting tier requirements → Should show purchase/access options

## Migration Instructions

1. **Run Database Migrations**:
   ```sql
   \i UPDATE_PROFILES_TIER_COLUMN.sql
   \i UPDATE_CARDS_GATING_COLUMNS.sql
   ```

2. **Update Existing Data**:
   - Set appropriate `is_released` values for cards
   - Set `min_tier` values based on content strategy
   - Update user `tier` values from existing `journey_tag`

3. **Test Components**:
   - Digital Binder: Verify card states display correctly
   - Store: Confirm purchase restrictions work
   - Audio: Test playback restrictions

## Configuration

### Card Configuration
Each card should have:
```sql
UPDATE cards SET 
  is_released = true,
  min_tier = 'wanderer' -- or 'dreamer', 'lover', 'guide'
WHERE card_name = 'CARD_NAME';
```

### User Tier Updates
```sql
UPDATE profiles SET 
  tier = 'lover' -- or appropriate tier
WHERE id = 'user_id';
```

## Future Enhancements

1. **Dynamic Tier Unlocking** - API endpoints for tier progression
2. **Timed Releases** - Scheduled release dates for cards
3. **Bundle Access** - Special access rules for content bundles
4. **Preview Mode** - Limited preview for locked content
5. **Achievement System** - Unlock tiers through achievements

## Troubleshooting

### Common Issues
1. **Hydration Errors**: Ensure gating logic runs client-side only
2. **Missing Tiers**: Check database constraints and valid tier values  
3. **Cache Issues**: Clear user card cache after purchases
4. **Permission Errors**: Verify user has required tier in database

### Debug Tools
- Console log gating results: `console.log(getCardGateState(...))`
- Check user cards: `console.log(profile.cards)`
- Verify tier: `console.log(profile.tier)`