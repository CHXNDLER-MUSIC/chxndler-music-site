# Click Analytics System

This system automatically tracks all user clicks across your music website and provides detailed analytics through an easy-to-access dashboard.

## ✅ What Gets Tracked Automatically

**Your Key Buttons & Actions**:
- 📱 Social Media: Instagram, TikTok, YouTube, Spotify, Apple Music  
- 📡 Navigation: Comms, Join Aliens button
- 🎵 Music Interactions: Song selections, album cover clicks
- 🎨 All other clickable elements with smart labeling

## 🚀 Quick Access Methods

**Option 1: Floating Button** *(Easiest)*  
Look for the blue "📊 Click Analytics" button in the bottom-right corner

**Option 2: Keyboard Shortcut** *(Fastest)*  
Press `Ctrl+Shift+A` (or `Cmd+Shift+A` on Mac) from anywhere

**Option 3: Direct URL**  
Visit `/analytics` or add `?analytics` to any page URL

## 📊 Dashboard Features

- **Smart Labels**: See "🎧 Spotify" instead of technical element names
- **Top Clicked Elements**: Ranked list of most popular buttons/links  
- **Recent Activity**: Timeline of latest clicks with full context
- **Hourly Patterns**: See when users are most active
- **Page Analytics**: Which pages get the most interaction
- **Click Heatmap Data**: Exact click positions and context

## What Data is Collected

For each click, the system captures:

- **Element Information**:
  - Tag name (button, a, div, etc.)
  - CSS classes and ID
  - Text content (first 100 characters)
  - Link URLs if applicable
  - ARIA labels and roles

- **Position Data**:
  - Click coordinates (x, y)
  - Screen coordinates
  - Viewport dimensions

- **Context**:
  - Timestamp
  - Page URL and title
  - User agent string

## Privacy & Storage

- Data is stored locally in `localStorage`
- Maximum of 1000 clicks retained (oldest auto-deleted)
- No data is sent to external servers
- Users can clear data anytime via the dashboard
- To disable tracking on specific elements, add `data-no-track` attribute

## Dashboard Features

- **Overview Statistics**: Total clicks, unique elements, pages visited
- **Most Clicked Elements**: Ranked list of popular UI elements
- **Activity Timeline**: Recent clicks with full details
- **Hourly Distribution**: Click patterns throughout the day
- **Page Analysis**: Most active pages
- **Click Details**: Inspect individual clicks with full context

## Technical Implementation

- `lib/analytics.ts`: Core tracking functions and data types
- `hooks/useClickTracking.ts`: React hook for global click listening
- `components/ClickTracker.tsx`: Auto-tracking component
- `components/AnalyticsDashboard.tsx`: Main dashboard interface
- `components/AnalyticsWidget.tsx`: Floating access button

## Integration with External Analytics

Click data is automatically sent to:
- Google Analytics 4 (if configured)
- Meta Pixel (if configured)

The events are sent with cleaned parameters optimized for each platform.