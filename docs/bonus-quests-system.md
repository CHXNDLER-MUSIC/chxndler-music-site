# Bonus Quests System Implementation

This document explains the implementation of the dynamic bonus quests system for the Heartverse Heart Coins modal.

## Overview

The bonus quests system provides a rotating set of quests that users can complete to earn Heart Coins and other rewards. The system supports:

- **One rotating featured quest** (changes as user completes them)
- **Two permanent core quests** (INVITE_FRIEND and ATTEND_LIVESTREAM)
- **One-time completion tracking** per user
- **Dynamic quest filtering** based on user progress

## Database Schema

### `bonus_quests` table
```sql
CREATE TABLE bonus_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_key text UNIQUE NOT NULL, -- e.g. 'LISTEN_ELEMENT_SONG'
  title text NOT NULL,
  description text NOT NULL, 
  category text NOT NULL, -- 'LISTENING', 'SUPPORT', 'COMMUNITY'
  is_active boolean DEFAULT true,
  is_core boolean DEFAULT false, -- true for INVITE_FRIEND, ATTEND_LIVESTREAM
  sort_order int2 NOT NULL,
  max_times_per_day int2 DEFAULT 1,
  max_total_completions int2, -- NULL = unlimited, 1 = one-time only
  reward_heartcoins int2 DEFAULT 0,
  reward_element_card boolean DEFAULT false,
  reward_notes text, -- e.g. "(1 max per day)" or "+1–5 HEART coins"
  created_at timestamptz DEFAULT now()
);
```

### `user_bonus_quests` table
```sql
CREATE TABLE user_bonus_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  bonus_quest_id uuid NOT NULL REFERENCES bonus_quests(id),
  times_completed int2 DEFAULT 0,
  last_completed_at timestamptz,
  UNIQUE(user_id, bonus_quest_id)
);
```

## System Components

### 1. TypeScript Types (`/types/bonusQuests.ts`)
- `BonusQuestRow` - Database row type for bonus_quests table
- `UserBonusQuestRow` - Database row type for user_bonus_quests table  
- `BonusQuestWithCompletion` - Extended type with completion status
- `QuestCompletionResult` - Return type for quest completion

### 2. Utility Functions (`/lib/bonusQuests.ts`)
- `getBonusQuestsForUser(userId)` - Fetches filtered quests for user
- `completeBonusQuest(userId, quest)` - Handles quest completion and rewards
- `canCompleteQuest(quest)` - Checks if user can complete a quest

### 3. React Hook (`/hooks/useBonusQuests.ts`)
- `useBonusQuests()` - Manages quest state, loading, and completion
- Automatically fetches quests when user authenticates
- Provides `completeQuest` function for UI interactions

### 4. UI Integration (`/components/HeartCoinButton.tsx`)
- Dynamic quest rendering in BONUS QUESTS tab
- Integration with existing Heart Coins reward system
- Loading states and error handling

## Quest Selection Algorithm

The system shows exactly 3 quests to each user:

1. **One Featured Quest** (rotating):
   - First available non-core quest (`is_core = false`)
   - Ordered by `sort_order` ascending
   - Filtered out if user has reached `max_total_completions`

2. **Two Core Quests** (permanent):
   - `INVITE_FRIEND` and `ATTEND_LIVESTREAM` 
   - Always visible (unless user has reached limits)
   - Ordered by `sort_order`

## One-Time Quest Behavior

Quests with `max_total_completions = 1` implement "one-time-ever" behavior:

1. Quest appears for user initially
2. User completes quest → earns rewards
3. Quest disappears from that user's list
4. Next quest in rotation becomes the featured quest
5. Quest remains visible for other users who haven't completed it

Example progression for a user:
```
Initial:     [LISTEN_ELEMENT_SONG, INVITE_FRIEND, ATTEND_LIVESTREAM]
After #1:    [LISTEN_FEATURED_SONG, INVITE_FRIEND, ATTEND_LIVESTREAM]  
After #2:    [FOLLOW_SPOTIFY, INVITE_FRIEND, ATTEND_LIVESTREAM]
After #3:    [FOLLOW_TIKTOK, INVITE_FRIEND, ATTEND_LIVESTREAM]
```

## Setup Instructions

### 1. Create Database Tables
Run the SQL schema above to create the required tables.

### 2. Seed Initial Data
Use `/database/bonus-quests-seed.sql` to populate initial bonus quests.

### 3. Configure Existing Reward Systems
Update the quest completion handler to integrate with your existing systems:

```typescript
// In useBonusQuests.ts, update the completeBonusQuest call:
const result = await completeBonusQuest(
  currentUserId,
  quest,
  // Hook up your existing heart coins handler
  (amount: number) => {
    updateUserHeartCoins(amount); // Your existing function
  },
  // Hook up your existing element card handler  
  () => {
    awardElementCard(); // Your existing function
  }
);
```

### 4. Special Quest Implementations

For quest-specific logic, add handlers in `completeBonusQuest()`:

```typescript
// Example: LISTEN_ELEMENT_SONG verification
if (quest.quest_key === 'LISTEN_ELEMENT_SONG') {
  // Verify user actually played their elemental song
  const hasPlayedSong = await verifyElementalSongPlay(userId);
  if (!hasPlayedSong) {
    return { success: false, message: 'Please play your elemental song first' };
  }
  
  // Award elemental card
  await awardElementalCard(userId);
}

// Example: FOLLOW_SPOTIFY verification  
if (quest.quest_key === 'FOLLOW_SPOTIFY') {
  // TODO: Implement OAuth verification or simple button confirmation
  console.log('User clicked Follow Spotify - implement verification as needed');
}
```

## Adding New Quest Types

1. **Add quest to database**:
```sql
INSERT INTO bonus_quests (
  quest_key, title, description, category,
  is_active, is_core, sort_order,
  max_times_per_day, max_total_completions,
  reward_heartcoins, reward_element_card, reward_notes
) VALUES (
  'NEW_QUEST_KEY',
  'Quest Title', 
  'Quest description',
  'CATEGORY',
  true, false, 20, -- sort_order determines rotation position
  1, 1, -- daily limit, total limit
  5, false, '+5 (one time only)'
);
```

2. **Add special logic** (if needed):
```typescript
// In completeBonusQuest function
if (quest.quest_key === 'NEW_QUEST_KEY') {
  // Add any special verification or rewards
}
```

3. **Update quest button text** (if needed):
```typescript
// In HeartCoinButton.tsx quest rendering
{quest.quest_key === 'NEW_QUEST_KEY' 
  ? 'CUSTOM BUTTON TEXT'
  : 'COMPLETE'}
```

## Error Handling

The system includes comprehensive error handling:

- **Database errors**: Logged and graceful fallbacks
- **Authentication errors**: Clear user messaging  
- **Quest completion failures**: Detailed error messages
- **Loading states**: Visual feedback during async operations

## Testing the System

1. **Test quest rotation**: Complete one-time quests and verify new ones appear
2. **Test completion limits**: Ensure one-time quests disappear after completion
3. **Test reward integration**: Verify Heart Coins and cards are properly awarded
4. **Test error cases**: Try completing quests multiple times, with invalid users, etc.

## Performance Considerations

- Quests are fetched once when the modal opens
- Completion triggers a refetch to update the UI
- Database queries are optimized with proper indexing
- Loading states prevent multiple simultaneous completions

## Future Enhancements

Potential additions to the system:

- **Daily rotation**: Change featured quest daily instead of by completion
- **Time-limited quests**: Quests that expire after a certain period
- **Progressive unlocks**: Quests that unlock after completing others
- **Reward multipliers**: Special events with bonus rewards
- **Quest streaks**: Bonus rewards for consecutive completions