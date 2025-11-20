// Badge system with streaks, achievements, and element-based progression

export type BadgeCategory = 'achievement' | 'streak' | 'element_streak';

export type Element = 
  | 'fire' | 'water' | 'earth' | 'air' 
  | 'light' | 'shadow' | 'ice' | 'lightning'
  | 'nature' | 'spirit' | 'cosmic' | 'void' | 'heart';

export type AchievementType = 
  | 'first_listen'
  | 'first_soul_sky' 
  | 'first_card_purchase'
  | 'first_livestream'
  | 'first_show'
  | 'first_merch';

export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: BadgeCategory;
  element?: Element;
  achievementType?: AchievementType;
  streakDays?: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  unlocked: boolean;
  unlockedAt?: Date;
}

export interface UserProgress {
  currentStreak: number;
  longestStreak: number;
  element: Element;
  achievements: Record<AchievementType, boolean>;
  lastVisit?: Date;
}

// Achievement badges
export const achievementBadges: Badge[] = [
  {
    id: 'first_listen',
    name: 'FIRST LISTEN',
    description: 'Listened to your first track in the Heartverse',
    emoji: '🎵',
    category: 'achievement',
    achievementType: 'first_listen',
    rarity: 'common',
    unlocked: false
  },
  {
    id: 'soul_sky_explorer',
    name: 'SOUL SKY EXPLORER',
    description: 'Discovered your first SOUL Sky experience',
    emoji: '🌌',
    category: 'achievement',
    achievementType: 'first_soul_sky',
    rarity: 'rare',
    unlocked: false
  },
  {
    id: 'digital_collector',
    name: 'DIGITAL COLLECTOR',
    description: 'Purchased your first digital card',
    emoji: '🃏',
    category: 'achievement',
    achievementType: 'first_card_purchase',
    rarity: 'rare',
    unlocked: false
  },
  {
    id: 'live_witness',
    name: 'LIVE WITNESS',
    description: 'Attended your first livestream performance',
    emoji: '📺',
    category: 'achievement',
    achievementType: 'first_livestream',
    rarity: 'epic',
    unlocked: false
  },
  {
    id: 'show_attendee',
    name: 'SHOW ATTENDEE',
    description: 'Experienced your first live show',
    emoji: '🎤',
    category: 'achievement',
    achievementType: 'first_show',
    rarity: 'legendary',
    unlocked: false
  },
  {
    id: 'merch_supporter',
    name: 'MERCH SUPPORTER',
    description: 'Purchased your first merchandise item',
    emoji: '👕',
    category: 'achievement',
    achievementType: 'first_merch',
    rarity: 'rare',
    unlocked: false
  }
];

// General streak badges (non-element specific)
export const streakBadges: Badge[] = [
  {
    id: 'streak_3',
    name: 'CONSISTENT',
    description: '3 days in a row',
    emoji: '🔥',
    category: 'streak',
    streakDays: 3,
    rarity: 'common',
    unlocked: false
  },
  {
    id: 'streak_7',
    name: 'DEDICATED',
    description: 'One week strong',
    emoji: '⭐',
    category: 'streak',
    streakDays: 7,
    rarity: 'rare',
    unlocked: false
  },
  {
    id: 'streak_30',
    name: 'DEVOTED',
    description: 'A full month of visits',
    emoji: '💫',
    category: 'streak',
    streakDays: 30,
    rarity: 'epic',
    unlocked: false
  },
  {
    id: 'streak_100',
    name: 'LEGENDARY',
    description: '100 days of dedication',
    emoji: '👑',
    category: 'streak',
    streakDays: 100,
    rarity: 'legendary',
    unlocked: false
  },
  {
    id: 'streak_365',
    name: 'ETERNAL',
    description: 'A full year of commitment',
    emoji: '♾️',
    category: 'streak',
    streakDays: 365,
    rarity: 'mythic',
    unlocked: false
  }
];

// Element-specific streak badges (12 per element)
export const elementBadges: Record<Element, Badge[]> = {
  fire: [
    { id: 'fire_1', name: 'SPARK', description: 'First flame ignited', emoji: '🔥', category: 'element_streak', element: 'fire', streakDays: 1, rarity: 'common', unlocked: false },
    { id: 'fire_3', name: 'EMBER', description: '3 days of burning passion', emoji: '🧡', category: 'element_streak', element: 'fire', streakDays: 3, rarity: 'common', unlocked: false },
    { id: 'fire_7', name: 'BLAZE', description: 'Week-long inferno', emoji: '🔥', category: 'element_streak', element: 'fire', streakDays: 7, rarity: 'rare', unlocked: false },
    { id: 'fire_14', name: 'WILDFIRE', description: 'Unstoppable burning spirit', emoji: '🌋', category: 'element_streak', element: 'fire', streakDays: 14, rarity: 'rare', unlocked: false },
    { id: 'fire_21', name: 'INFERNO', description: 'Three weeks of pure fire', emoji: '🔥', category: 'element_streak', element: 'fire', streakDays: 21, rarity: 'epic', unlocked: false },
    { id: 'fire_30', name: 'PHOENIX', description: 'Risen from the flames', emoji: '🐦‍🔥', category: 'element_streak', element: 'fire', streakDays: 30, rarity: 'epic', unlocked: false },
    { id: 'fire_60', name: 'FLAME LORD', description: 'Master of the burning path', emoji: '👑', category: 'element_streak', element: 'fire', streakDays: 60, rarity: 'legendary', unlocked: false },
    { id: 'fire_90', name: 'ETERNAL FLAME', description: 'Unextinguishable spirit', emoji: '🕯️', category: 'element_streak', element: 'fire', streakDays: 90, rarity: 'legendary', unlocked: false },
    { id: 'fire_120', name: 'SUN BEARER', description: 'Bearer of solar energy', emoji: '☀️', category: 'element_streak', element: 'fire', streakDays: 120, rarity: 'legendary', unlocked: false },
    { id: 'fire_180', name: 'STAR FORGE', description: 'Creator of stellar fire', emoji: '⭐', category: 'element_streak', element: 'fire', streakDays: 180, rarity: 'mythic', unlocked: false },
    { id: 'fire_270', name: 'COSMIC FLAME', description: 'Fire that burns across galaxies', emoji: '🌟', category: 'element_streak', element: 'fire', streakDays: 270, rarity: 'mythic', unlocked: false },
    { id: 'fire_365', name: 'PRIMORDIAL FIRE', description: 'The first and eternal flame', emoji: '🔥', category: 'element_streak', element: 'fire', streakDays: 365, rarity: 'mythic', unlocked: false }
  ],
  water: [
    { id: 'water_1', name: 'DROPLET', description: 'First touch of water', emoji: '💧', category: 'element_streak', element: 'water', streakDays: 1, rarity: 'common', unlocked: false },
    { id: 'water_3', name: 'STREAM', description: '3 days flowing forward', emoji: '🌊', category: 'element_streak', element: 'water', streakDays: 3, rarity: 'common', unlocked: false },
    { id: 'water_7', name: 'RIVER', description: 'Week of flowing wisdom', emoji: '🏞️', category: 'element_streak', element: 'water', streakDays: 7, rarity: 'rare', unlocked: false },
    { id: 'water_14', name: 'RAPIDS', description: 'Rushing with determination', emoji: '🌊', category: 'element_streak', element: 'water', streakDays: 14, rarity: 'rare', unlocked: false },
    { id: 'water_21', name: 'WATERFALL', description: 'Powerful cascade of dedication', emoji: '💦', category: 'element_streak', element: 'water', streakDays: 21, rarity: 'epic', unlocked: false },
    { id: 'water_30', name: 'LAKE', description: 'Deep and tranquil presence', emoji: '🏔️', category: 'element_streak', element: 'water', streakDays: 30, rarity: 'epic', unlocked: false },
    { id: 'water_60', name: 'SEA MASTER', description: 'Commander of vast waters', emoji: '🌊', category: 'element_streak', element: 'water', streakDays: 60, rarity: 'legendary', unlocked: false },
    { id: 'water_90', name: 'OCEAN SOUL', description: 'Spirit as deep as the ocean', emoji: '🌊', category: 'element_streak', element: 'water', streakDays: 90, rarity: 'legendary', unlocked: false },
    { id: 'water_120', name: 'TIDAL FORCE', description: 'Power that moves the seas', emoji: '🌀', category: 'element_streak', element: 'water', streakDays: 120, rarity: 'legendary', unlocked: false },
    { id: 'water_180', name: 'MOON TIDE', description: 'Connected to lunar cycles', emoji: '🌙', category: 'element_streak', element: 'water', streakDays: 180, rarity: 'mythic', unlocked: false },
    { id: 'water_270', name: 'COSMIC OCEAN', description: 'Waters of infinite space', emoji: '🌌', category: 'element_streak', element: 'water', streakDays: 270, rarity: 'mythic', unlocked: false },
    { id: 'water_365', name: 'PRIMORDIAL TIDE', description: 'The source of all waters', emoji: '🌊', category: 'element_streak', element: 'water', streakDays: 365, rarity: 'mythic', unlocked: false }
  ],
  earth: [
    { id: 'earth_1', name: 'SEEDLING', description: 'First roots planted', emoji: '🌱', category: 'element_streak', element: 'earth', streakDays: 1, rarity: 'common', unlocked: false },
    { id: 'earth_3', name: 'SPROUT', description: '3 days of steady growth', emoji: '🌿', category: 'element_streak', element: 'earth', streakDays: 3, rarity: 'common', unlocked: false },
    { id: 'earth_7', name: 'SAPLING', description: 'Week of grounded presence', emoji: '🌲', category: 'element_streak', element: 'earth', streakDays: 7, rarity: 'rare', unlocked: false },
    { id: 'earth_14', name: 'TREE', description: 'Strong and rooted', emoji: '🌳', category: 'element_streak', element: 'earth', streakDays: 14, rarity: 'rare', unlocked: false },
    { id: 'earth_21', name: 'FOREST', description: 'Community of strength', emoji: '🌲', category: 'element_streak', element: 'earth', streakDays: 21, rarity: 'epic', unlocked: false },
    { id: 'earth_30', name: 'MOUNTAIN', description: 'Unshakeable foundation', emoji: '⛰️', category: 'element_streak', element: 'earth', streakDays: 30, rarity: 'epic', unlocked: false },
    { id: 'earth_60', name: 'STONE GUARDIAN', description: 'Protector of sacred ground', emoji: '🗿', category: 'element_streak', element: 'earth', streakDays: 60, rarity: 'legendary', unlocked: false },
    { id: 'earth_90', name: 'CRYSTAL HEART', description: 'Pure and enduring spirit', emoji: '💎', category: 'element_streak', element: 'earth', streakDays: 90, rarity: 'legendary', unlocked: false },
    { id: 'earth_120', name: 'TITAN', description: 'Force of nature itself', emoji: '🏔️', category: 'element_streak', element: 'earth', streakDays: 120, rarity: 'legendary', unlocked: false },
    { id: 'earth_180', name: 'WORLD TREE', description: 'Connection to all life', emoji: '🌍', category: 'element_streak', element: 'earth', streakDays: 180, rarity: 'mythic', unlocked: false },
    { id: 'earth_270', name: 'PLANET KEEPER', description: 'Guardian of worlds', emoji: '🪐', category: 'element_streak', element: 'earth', streakDays: 270, rarity: 'mythic', unlocked: false },
    { id: 'earth_365', name: 'GAIA SOUL', description: 'One with the planet itself', emoji: '🌍', category: 'element_streak', element: 'earth', streakDays: 365, rarity: 'mythic', unlocked: false }
  ],
  air: [
    { id: 'air_1', name: 'BREEZE', description: 'First gentle wind', emoji: '🌬️', category: 'element_streak', element: 'air', streakDays: 1, rarity: 'common', unlocked: false },
    { id: 'air_3', name: 'GUST', description: '3 days of swift movement', emoji: '💨', category: 'element_streak', element: 'air', streakDays: 3, rarity: 'common', unlocked: false },
    { id: 'air_7', name: 'WIND', description: 'Week of flowing freedom', emoji: '🌪️', category: 'element_streak', element: 'air', streakDays: 7, rarity: 'rare', unlocked: false },
    { id: 'air_14', name: 'GALE', description: 'Powerful force of nature', emoji: '🌊', category: 'element_streak', element: 'air', streakDays: 14, rarity: 'rare', unlocked: false },
    { id: 'air_21', name: 'STORM', description: 'Unleashed tempest energy', emoji: '⛈️', category: 'element_streak', element: 'air', streakDays: 21, rarity: 'epic', unlocked: false },
    { id: 'air_30', name: 'TORNADO', description: 'Spiraling force of change', emoji: '🌪️', category: 'element_streak', element: 'air', streakDays: 30, rarity: 'epic', unlocked: false },
    { id: 'air_60', name: 'SKY WALKER', description: 'Master of the heavens', emoji: '☁️', category: 'element_streak', element: 'air', streakDays: 60, rarity: 'legendary', unlocked: false },
    { id: 'air_90', name: 'WIND SPIRIT', description: 'Essence of pure freedom', emoji: '🪶', category: 'element_streak', element: 'air', streakDays: 90, rarity: 'legendary', unlocked: false },
    { id: 'air_120', name: 'HURRICANE', description: 'Unstoppable atmospheric force', emoji: '🌀', category: 'element_streak', element: 'air', streakDays: 120, rarity: 'legendary', unlocked: false },
    { id: 'air_180', name: 'ATMOSPHERE', description: 'Breath of the world', emoji: '🌍', category: 'element_streak', element: 'air', streakDays: 180, rarity: 'mythic', unlocked: false },
    { id: 'air_270', name: 'SOLAR WIND', description: 'Cosmic currents rider', emoji: '☀️', category: 'element_streak', element: 'air', streakDays: 270, rarity: 'mythic', unlocked: false },
    { id: 'air_365', name: 'PRIMORDIAL BREATH', description: 'The first wind that stirred creation', emoji: '🌬️', category: 'element_streak', element: 'air', streakDays: 365, rarity: 'mythic', unlocked: false }
  ],
  light: [
    { id: 'light_1', name: 'GLIMMER', description: 'First ray of hope', emoji: '✨', category: 'element_streak', element: 'light', streakDays: 1, rarity: 'common', unlocked: false },
    { id: 'light_3', name: 'GLOW', description: '3 days of inner radiance', emoji: '💫', category: 'element_streak', element: 'light', streakDays: 3, rarity: 'common', unlocked: false },
    { id: 'light_7', name: 'SHINE', description: 'Week of brilliant presence', emoji: '⭐', category: 'element_streak', element: 'light', streakDays: 7, rarity: 'rare', unlocked: false },
    { id: 'light_14', name: 'BEAM', description: 'Focused ray of dedication', emoji: '🌟', category: 'element_streak', element: 'light', streakDays: 14, rarity: 'rare', unlocked: false },
    { id: 'light_21', name: 'RADIANCE', description: 'Illuminating all around', emoji: '☀️', category: 'element_streak', element: 'light', streakDays: 21, rarity: 'epic', unlocked: false },
    { id: 'light_30', name: 'AURORA', description: 'Dancing lights of wonder', emoji: '🌈', category: 'element_streak', element: 'light', streakDays: 30, rarity: 'epic', unlocked: false },
    { id: 'light_60', name: 'LIGHT BEARER', description: 'Bringer of illumination', emoji: '🕯️', category: 'element_streak', element: 'light', streakDays: 60, rarity: 'legendary', unlocked: false },
    { id: 'light_90', name: 'PRISM SOUL', description: 'Reflecting all colors of light', emoji: '🔮', category: 'element_streak', element: 'light', streakDays: 90, rarity: 'legendary', unlocked: false },
    { id: 'light_120', name: 'NOVA', description: 'Explosive burst of brilliance', emoji: '💥', category: 'element_streak', element: 'light', streakDays: 120, rarity: 'legendary', unlocked: false },
    { id: 'light_180', name: 'STARLIGHT', description: 'Eternal beacon in darkness', emoji: '⭐', category: 'element_streak', element: 'light', streakDays: 180, rarity: 'mythic', unlocked: false },
    { id: 'light_270', name: 'GALAXY CORE', description: 'Heart of cosmic radiance', emoji: '🌌', category: 'element_streak', element: 'light', streakDays: 270, rarity: 'mythic', unlocked: false },
    { id: 'light_365', name: 'PRIMORDIAL LIGHT', description: 'The first light that banished darkness', emoji: '✨', category: 'element_streak', element: 'light', streakDays: 365, rarity: 'mythic', unlocked: false }
  ],
  shadow: [
    { id: 'shadow_1', name: 'WHISPER', description: 'First step into shadow', emoji: '🌑', category: 'element_streak', element: 'shadow', streakDays: 1, rarity: 'common', unlocked: false },
    { id: 'shadow_3', name: 'SHADE', description: '3 days of mysterious presence', emoji: '🌚', category: 'element_streak', element: 'shadow', streakDays: 3, rarity: 'common', unlocked: false },
    { id: 'shadow_7', name: 'DUSK', description: 'Week between light and dark', emoji: '🌆', category: 'element_streak', element: 'shadow', streakDays: 7, rarity: 'rare', unlocked: false },
    { id: 'shadow_14', name: 'ECLIPSE', description: 'Temporary darkness over light', emoji: '🌘', category: 'element_streak', element: 'shadow', streakDays: 14, rarity: 'rare', unlocked: false },
    { id: 'shadow_21', name: 'MIDNIGHT', description: 'Deep in the heart of darkness', emoji: '🌃', category: 'element_streak', element: 'shadow', streakDays: 21, rarity: 'epic', unlocked: false },
    { id: 'shadow_30', name: 'VOID WALKER', description: 'Traveler between worlds', emoji: '🕳️', category: 'element_streak', element: 'shadow', streakDays: 30, rarity: 'epic', unlocked: false },
    { id: 'shadow_60', name: 'SHADOW LORD', description: 'Master of hidden realms', emoji: '👤', category: 'element_streak', element: 'shadow', streakDays: 60, rarity: 'legendary', unlocked: false },
    { id: 'shadow_90', name: 'PHANTOM', description: 'Existence beyond physical form', emoji: '👻', category: 'element_streak', element: 'shadow', streakDays: 90, rarity: 'legendary', unlocked: false },
    { id: 'shadow_120', name: 'DARK MATTER', description: 'Unseen force that shapes reality', emoji: '⚫', category: 'element_streak', element: 'shadow', streakDays: 120, rarity: 'legendary', unlocked: false },
    { id: 'shadow_180', name: 'BLACK HOLE', description: 'Gravity well of infinite depth', emoji: '🕳️', category: 'element_streak', element: 'shadow', streakDays: 180, rarity: 'mythic', unlocked: false },
    { id: 'shadow_270', name: 'COSMIC VOID', description: 'Space between the stars', emoji: '🌌', category: 'element_streak', element: 'shadow', streakDays: 270, rarity: 'mythic', unlocked: false },
    { id: 'shadow_365', name: 'PRIMORDIAL DARKNESS', description: 'The void before creation', emoji: '🌑', category: 'element_streak', element: 'shadow', streakDays: 365, rarity: 'mythic', unlocked: false }
  ],
  ice: [
    { id: 'ice_1', name: 'FROST', description: 'First touch of cold', emoji: '❄️', category: 'element_streak', element: 'ice', streakDays: 1, rarity: 'common', unlocked: false },
    { id: 'ice_3', name: 'CHILL', description: '3 days of cool determination', emoji: '🧊', category: 'element_streak', element: 'ice', streakDays: 3, rarity: 'common', unlocked: false },
    { id: 'ice_7', name: 'FREEZE', description: 'Week of crystalline focus', emoji: '❄️', category: 'element_streak', element: 'ice', streakDays: 7, rarity: 'rare', unlocked: false },
    { id: 'ice_14', name: 'CRYSTAL', description: 'Pure and structured beauty', emoji: '💎', category: 'element_streak', element: 'ice', streakDays: 14, rarity: 'rare', unlocked: false },
    { id: 'ice_21', name: 'BLIZZARD', description: 'Storm of frozen power', emoji: '🌨️', category: 'element_streak', element: 'ice', streakDays: 21, rarity: 'epic', unlocked: false },
    { id: 'ice_30', name: 'GLACIER', description: 'Slow but unstoppable force', emoji: '🏔️', category: 'element_streak', element: 'ice', streakDays: 30, rarity: 'epic', unlocked: false },
    { id: 'ice_60', name: 'FROST KING', description: 'Ruler of the frozen realm', emoji: '👑', category: 'element_streak', element: 'ice', streakDays: 60, rarity: 'legendary', unlocked: false },
    { id: 'ice_90', name: 'ABSOLUTE ZERO', description: 'Temperature where motion stops', emoji: '🌡️', category: 'element_streak', element: 'ice', streakDays: 90, rarity: 'legendary', unlocked: false },
    { id: 'ice_120', name: 'PERMAFROST', description: 'Eternally frozen ground', emoji: '🧊', category: 'element_streak', element: 'ice', streakDays: 120, rarity: 'legendary', unlocked: false },
    { id: 'ice_180', name: 'ICE AGE', description: 'Bringer of epochal change', emoji: '🏔️', category: 'element_streak', element: 'ice', streakDays: 180, rarity: 'mythic', unlocked: false },
    { id: 'ice_270', name: 'COSMIC FROST', description: 'Cold of interstellar space', emoji: '🌌', category: 'element_streak', element: 'ice', streakDays: 270, rarity: 'mythic', unlocked: false },
    { id: 'ice_365', name: 'PRIMORDIAL ICE', description: 'The first freeze in creation', emoji: '❄️', category: 'element_streak', element: 'ice', streakDays: 365, rarity: 'mythic', unlocked: false }
  ],
  lightning: [
    { id: 'lightning_1', name: 'SPARK', description: 'First electrical charge', emoji: '⚡', category: 'element_streak', element: 'lightning', streakDays: 1, rarity: 'common', unlocked: false },
    { id: 'lightning_3', name: 'ZAP', description: '3 days of electric energy', emoji: '💥', category: 'element_streak', element: 'lightning', streakDays: 3, rarity: 'common', unlocked: false },
    { id: 'lightning_7', name: 'BOLT', description: 'Week of shocking presence', emoji: '⚡', category: 'element_streak', element: 'lightning', streakDays: 7, rarity: 'rare', unlocked: false },
    { id: 'lightning_14', name: 'CHARGE', description: 'Building electrical potential', emoji: '🔋', category: 'element_streak', element: 'lightning', streakDays: 14, rarity: 'rare', unlocked: false },
    { id: 'lightning_21', name: 'THUNDER', description: 'Sound of raw power', emoji: '🌩️', category: 'element_streak', element: 'lightning', streakDays: 21, rarity: 'epic', unlocked: false },
    { id: 'lightning_30', name: 'STORM FRONT', description: 'Leading edge of the tempest', emoji: '⛈️', category: 'element_streak', element: 'lightning', streakDays: 30, rarity: 'epic', unlocked: false },
    { id: 'lightning_60', name: 'THUNDER GOD', description: 'Wielder of celestial electricity', emoji: '👑', category: 'element_streak', element: 'lightning', streakDays: 60, rarity: 'legendary', unlocked: false },
    { id: 'lightning_90', name: 'PLASMA SOUL', description: 'Fourth state of matter mastery', emoji: '🌟', category: 'element_streak', element: 'lightning', streakDays: 90, rarity: 'legendary', unlocked: false },
    { id: 'lightning_120', name: 'SUPERNOVA', description: 'Stellar explosion of energy', emoji: '💫', category: 'element_streak', element: 'lightning', streakDays: 120, rarity: 'legendary', unlocked: false },
    { id: 'lightning_180', name: 'PULSAR', description: 'Cosmic lighthouse beacon', emoji: '🌟', category: 'element_streak', element: 'lightning', streakDays: 180, rarity: 'mythic', unlocked: false },
    { id: 'lightning_270', name: 'QUANTUM STORM', description: 'Energy at subatomic level', emoji: '⚛️', category: 'element_streak', element: 'lightning', streakDays: 270, rarity: 'mythic', unlocked: false },
    { id: 'lightning_365', name: 'PRIMORDIAL SPARK', description: 'The first electrical impulse', emoji: '⚡', category: 'element_streak', element: 'lightning', streakDays: 365, rarity: 'mythic', unlocked: false }
  ],
  nature: [
    { id: 'nature_1', name: 'SEED', description: 'Beginning of natural growth', emoji: '🌰', category: 'element_streak', element: 'nature', streakDays: 1, rarity: 'common', unlocked: false },
    { id: 'nature_3', name: 'BUD', description: '3 days of organic development', emoji: '🌸', category: 'element_streak', element: 'nature', streakDays: 3, rarity: 'common', unlocked: false },
    { id: 'nature_7', name: 'BLOOM', description: 'Week of flourishing life', emoji: '🌺', category: 'element_streak', element: 'nature', streakDays: 7, rarity: 'rare', unlocked: false },
    { id: 'nature_14', name: 'GROVE', description: 'Community of living beings', emoji: '🌳', category: 'element_streak', element: 'nature', streakDays: 14, rarity: 'rare', unlocked: false },
    { id: 'nature_21', name: 'ECOSYSTEM', description: 'Balanced web of life', emoji: '🦋', category: 'element_streak', element: 'nature', streakDays: 21, rarity: 'epic', unlocked: false },
    { id: 'nature_30', name: 'BIOSPHERE', description: 'Zone of all life', emoji: '🌍', category: 'element_streak', element: 'nature', streakDays: 30, rarity: 'epic', unlocked: false },
    { id: 'nature_60', name: 'DRUID', description: 'Keeper of natural wisdom', emoji: '🧙‍♂️', category: 'element_streak', element: 'nature', streakDays: 60, rarity: 'legendary', unlocked: false },
    { id: 'nature_90', name: 'MOTHER NATURE', description: 'Embodiment of life force', emoji: '🌿', category: 'element_streak', element: 'nature', streakDays: 90, rarity: 'legendary', unlocked: false },
    { id: 'nature_120', name: 'SYMBIOSIS', description: 'Perfect harmony with all life', emoji: '🤝', category: 'element_streak', element: 'nature', streakDays: 120, rarity: 'legendary', unlocked: false },
    { id: 'nature_180', name: 'EVOLUTION', description: 'Driver of species development', emoji: '🧬', category: 'element_streak', element: 'nature', streakDays: 180, rarity: 'mythic', unlocked: false },
    { id: 'nature_270', name: 'GENESIS GARDEN', description: 'Origin of all natural life', emoji: '🌺', category: 'element_streak', element: 'nature', streakDays: 270, rarity: 'mythic', unlocked: false },
    { id: 'nature_365', name: 'LIFE ITSELF', description: 'The very essence of existence', emoji: '🌱', category: 'element_streak', element: 'nature', streakDays: 365, rarity: 'mythic', unlocked: false }
  ],
  spirit: [
    { id: 'spirit_1', name: 'SOUL SPARK', description: 'First awakening of spirit', emoji: '✨', category: 'element_streak', element: 'spirit', streakDays: 1, rarity: 'common', unlocked: false },
    { id: 'spirit_3', name: 'AURA', description: '3 days of spiritual presence', emoji: '🌟', category: 'element_streak', element: 'spirit', streakDays: 3, rarity: 'common', unlocked: false },
    { id: 'spirit_7', name: 'MEDITATION', description: 'Week of inner contemplation', emoji: '🧘', category: 'element_streak', element: 'spirit', streakDays: 7, rarity: 'rare', unlocked: false },
    { id: 'spirit_14', name: 'ENLIGHTENMENT', description: 'Higher understanding achieved', emoji: '💡', category: 'element_streak', element: 'spirit', streakDays: 14, rarity: 'rare', unlocked: false },
    { id: 'spirit_21', name: 'TRANSCENDENCE', description: 'Rising above material realm', emoji: '🕊️', category: 'element_streak', element: 'spirit', streakDays: 21, rarity: 'epic', unlocked: false },
    { id: 'spirit_30', name: 'NIRVANA', description: 'State of perfect peace', emoji: '☮️', category: 'element_streak', element: 'spirit', streakDays: 30, rarity: 'epic', unlocked: false },
    { id: 'spirit_60', name: 'SAGE', description: 'Master of spiritual wisdom', emoji: '👴', category: 'element_streak', element: 'spirit', streakDays: 60, rarity: 'legendary', unlocked: false },
    { id: 'spirit_90', name: 'BUDDHA NATURE', description: 'Innate capacity for awakening', emoji: '🧘‍♂️', category: 'element_streak', element: 'spirit', streakDays: 90, rarity: 'legendary', unlocked: false },
    { id: 'spirit_120', name: 'COSMIC CONSCIOUSNESS', description: 'Awareness of universal connection', emoji: '🌌', category: 'element_streak', element: 'spirit', streakDays: 120, rarity: 'legendary', unlocked: false },
    { id: 'spirit_180', name: 'DIVINE SPARK', description: 'Fragment of universal spirit', emoji: '💫', category: 'element_streak', element: 'spirit', streakDays: 180, rarity: 'mythic', unlocked: false },
    { id: 'spirit_270', name: 'ETERNAL SOUL', description: 'Timeless essence beyond death', emoji: '♾️', category: 'element_streak', element: 'spirit', streakDays: 270, rarity: 'mythic', unlocked: false },
    { id: 'spirit_365', name: 'SOURCE CONSCIOUSNESS', description: 'The original awareness from which all springs', emoji: '🕉️', category: 'element_streak', element: 'spirit', streakDays: 365, rarity: 'mythic', unlocked: false }
  ],
  cosmic: [
    { id: 'cosmic_1', name: 'STARDUST', description: 'First particles of space', emoji: '✨', category: 'element_streak', element: 'cosmic', streakDays: 1, rarity: 'common', unlocked: false },
    { id: 'cosmic_3', name: 'NEBULA', description: '3 days of stellar nursery', emoji: '🌌', category: 'element_streak', element: 'cosmic', streakDays: 3, rarity: 'common', unlocked: false },
    { id: 'cosmic_7', name: 'ASTEROID', description: 'Week of space wandering', emoji: '☄️', category: 'element_streak', element: 'cosmic', streakDays: 7, rarity: 'rare', unlocked: false },
    { id: 'cosmic_14', name: 'PLANET', description: 'Orbital stability achieved', emoji: '🪐', category: 'element_streak', element: 'cosmic', streakDays: 14, rarity: 'rare', unlocked: false },
    { id: 'cosmic_21', name: 'SOLAR SYSTEM', description: 'Gravitational harmony', emoji: '☀️', category: 'element_streak', element: 'cosmic', streakDays: 21, rarity: 'epic', unlocked: false },
    { id: 'cosmic_30', name: 'GALAXY', description: 'Billions of stars united', emoji: '🌌', category: 'element_streak', element: 'cosmic', streakDays: 30, rarity: 'epic', unlocked: false },
    { id: 'cosmic_60', name: 'COSMIC GUARDIAN', description: 'Protector of galactic order', emoji: '👽', category: 'element_streak', element: 'cosmic', streakDays: 60, rarity: 'legendary', unlocked: false },
    { id: 'cosmic_90', name: 'DARK ENERGY', description: 'Force expanding the universe', emoji: '🌌', category: 'element_streak', element: 'cosmic', streakDays: 90, rarity: 'legendary', unlocked: false },
    { id: 'cosmic_120', name: 'BIG BANG', description: 'Origin point of everything', emoji: '💥', category: 'element_streak', element: 'cosmic', streakDays: 120, rarity: 'legendary', unlocked: false },
    { id: 'cosmic_180', name: 'MULTIVERSE', description: 'Infinite realities explorer', emoji: '♾️', category: 'element_streak', element: 'cosmic', streakDays: 180, rarity: 'mythic', unlocked: false },
    { id: 'cosmic_270', name: 'COSMIC ARCHITECT', description: 'Designer of universal laws', emoji: '🏗️', category: 'element_streak', element: 'cosmic', streakDays: 270, rarity: 'mythic', unlocked: false },
    { id: 'cosmic_365', name: 'COSMIC CONSCIOUSNESS', description: 'Awareness of all existence', emoji: '🧠', category: 'element_streak', element: 'cosmic', streakDays: 365, rarity: 'mythic', unlocked: false }
  ],
  void: [
    { id: 'void_1', name: 'EMPTINESS', description: 'First touch of nothingness', emoji: '⚫', category: 'element_streak', element: 'void', streakDays: 1, rarity: 'common', unlocked: false },
    { id: 'void_3', name: 'SILENCE', description: '3 days of peaceful quiet', emoji: '🤫', category: 'element_streak', element: 'void', streakDays: 3, rarity: 'common', unlocked: false },
    { id: 'void_7', name: 'STILLNESS', description: 'Week without motion', emoji: '🧘‍♂️', category: 'element_streak', element: 'void', streakDays: 7, rarity: 'rare', unlocked: false },
    { id: 'void_14', name: 'VACUUM', description: 'Space devoid of matter', emoji: '🕳️', category: 'element_streak', element: 'void', streakDays: 14, rarity: 'rare', unlocked: false },
    { id: 'void_21', name: 'ABYSS', description: 'Bottomless depth of nothing', emoji: '🌑', category: 'element_streak', element: 'void', streakDays: 21, rarity: 'epic', unlocked: false },
    { id: 'void_30', name: 'NOTHINGNESS', description: 'Complete absence of being', emoji: '⬛', category: 'element_streak', element: 'void', streakDays: 30, rarity: 'epic', unlocked: false },
    { id: 'void_60', name: 'VOID WALKER', description: 'Traveler through emptiness', emoji: '👤', category: 'element_streak', element: 'void', streakDays: 60, rarity: 'legendary', unlocked: false },
    { id: 'void_90', name: 'NULL ENTITY', description: 'Being that both exists and doesn\'t', emoji: '❓', category: 'element_streak', element: 'void', streakDays: 90, rarity: 'legendary', unlocked: false },
    { id: 'void_120', name: 'ENTROPY', description: 'Force that returns all to chaos', emoji: '💀', category: 'element_streak', element: 'void', streakDays: 120, rarity: 'legendary', unlocked: false },
    { id: 'void_180', name: 'HEAT DEATH', description: 'Final state of the universe', emoji: '❄️', category: 'element_streak', element: 'void', streakDays: 180, rarity: 'mythic', unlocked: false },
    { id: 'void_270', name: 'BEFORE TIME', description: 'State preceding existence', emoji: '⏳', category: 'element_streak', element: 'void', streakDays: 270, rarity: 'mythic', unlocked: false },
    { id: 'void_365', name: 'ABSOLUTE VOID', description: 'The eternal emptiness beyond all', emoji: '⚫', category: 'element_streak', element: 'void', streakDays: 365, rarity: 'mythic', unlocked: false }
  ],
  heart: [
    { id: 'heart_1', name: 'HEARTBEAT', description: 'First pulse of emotion', emoji: '💗', category: 'element_streak', element: 'heart', streakDays: 1, rarity: 'common', unlocked: false },
    { id: 'heart_3', name: 'WARMTH', description: '3 days of loving connection', emoji: '💕', category: 'element_streak', element: 'heart', streakDays: 3, rarity: 'common', unlocked: false },
    { id: 'heart_7', name: 'COMPASSION', description: 'Week of caring presence', emoji: '💖', category: 'element_streak', element: 'heart', streakDays: 7, rarity: 'rare', unlocked: false },
    { id: 'heart_14', name: 'EMPATHY', description: 'Understanding others deeply', emoji: '💝', category: 'element_streak', element: 'heart', streakDays: 14, rarity: 'rare', unlocked: false },
    { id: 'heart_21', name: 'DEVOTION', description: 'Three weeks of unwavering love', emoji: '💘', category: 'element_streak', element: 'heart', streakDays: 21, rarity: 'epic', unlocked: false },
    { id: 'heart_30', name: 'SOULMATE', description: 'Deep spiritual connection', emoji: '💞', category: 'element_streak', element: 'heart', streakDays: 30, rarity: 'epic', unlocked: false },
    { id: 'heart_60', name: 'LOVE BEARER', description: 'Spreader of infinite love', emoji: '💓', category: 'element_streak', element: 'heart', streakDays: 60, rarity: 'legendary', unlocked: false },
    { id: 'heart_90', name: 'HEART GUARDIAN', description: 'Protector of all emotions', emoji: '❤️‍🔥', category: 'element_streak', element: 'heart', streakDays: 90, rarity: 'legendary', unlocked: false },
    { id: 'heart_120', name: 'UNCONDITIONAL', description: 'Love without boundaries', emoji: '❤️‍🩹', category: 'element_streak', element: 'heart', streakDays: 120, rarity: 'legendary', unlocked: false },
    { id: 'heart_180', name: 'COSMIC LOVE', description: 'Love that spans the universe', emoji: '💫', category: 'element_streak', element: 'heart', streakDays: 180, rarity: 'mythic', unlocked: false },
    { id: 'heart_270', name: 'ETERNAL BOND', description: 'Connection beyond time and space', emoji: '♾️', category: 'element_streak', element: 'heart', streakDays: 270, rarity: 'mythic', unlocked: false },
    { id: 'heart_365', name: 'PURE LOVE', description: 'The essence of all emotion and connection', emoji: '❤️', category: 'element_streak', element: 'heart', streakDays: 365, rarity: 'mythic', unlocked: false }
  ]
};

// Helper functions
export function getAllBadges(): Badge[] {
  const allElementBadges = Object.values(elementBadges).flat();
  return [...achievementBadges, ...streakBadges, ...allElementBadges];
}

export function getBadgesByElement(element: Element): Badge[] {
  return elementBadges[element] || [];
}

export function getBadgesByCategory(category: BadgeCategory): Badge[] {
  const allBadges = getAllBadges();
  return allBadges.filter(badge => badge.category === category);
}

export function getUnlockedBadges(userProgress: UserProgress): Badge[] {
  const allBadges = getAllBadges();
  return allBadges.filter(badge => badge.unlocked);
}

export function checkStreakBadgeUnlock(userProgress: UserProgress): Badge[] {
  const newlyUnlocked: Badge[] = [];
  
  // Check general streak badges
  streakBadges.forEach(badge => {
    if (!badge.unlocked && userProgress.currentStreak >= (badge.streakDays || 0)) {
      badge.unlocked = true;
      badge.unlockedAt = new Date();
      newlyUnlocked.push(badge);
    }
  });
  
  // Check element-specific streak badges
  const elementBadgesList = elementBadges[userProgress.element] || [];
  elementBadgesList.forEach(badge => {
    if (!badge.unlocked && userProgress.currentStreak >= (badge.streakDays || 0)) {
      badge.unlocked = true;
      badge.unlockedAt = new Date();
      newlyUnlocked.push(badge);
    }
  });
  
  return newlyUnlocked;
}

export function checkAchievementBadgeUnlock(achievementType: AchievementType): Badge | null {
  const badge = achievementBadges.find(b => b.achievementType === achievementType);
  if (badge && !badge.unlocked) {
    badge.unlocked = true;
    badge.unlockedAt = new Date();
    return badge;
  }
  return null;
}

export function getRarityColor(rarity: Badge['rarity']): string {
  switch (rarity) {
    case 'common': return '#FFFFFF';
    case 'rare': return '#0099FF';
    case 'epic': return '#9900FF';
    case 'legendary': return '#FF6600';
    case 'mythic': return '#FFD700';
    default: return '#FFFFFF';
  }
}

export function getRarityGlow(rarity: Badge['rarity']): string {
  switch (rarity) {
    case 'common': return 'rgba(255,255,255,0.3)';
    case 'rare': return 'rgba(0,153,255,0.4)';
    case 'epic': return 'rgba(153,0,255,0.4)';
    case 'legendary': return 'rgba(255,102,0,0.4)';
    case 'mythic': return 'rgba(255,215,0,0.5)';
    default: return 'rgba(255,255,255,0.3)';
  }
}