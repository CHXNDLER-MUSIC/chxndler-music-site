# Heartverse Solar System

## Overview

The Heartverse Solar System is a new 3D visualization that organizes songs by their elemental types around large elemental planets, with the Core Heart at the center.

## Components

### HeartverseSolarSystem.tsx
Main component that renders the complete solar system:
- **Core Heart Planet**: Center of the system (existing HeartPlanet component)
- **Four Elemental Planets**: Large planets positioned in corners (Heart, Water, Lightning, Darkness)
- **Song Planets**: Smaller planets orbiting their respective elemental planets
- **Starfield Background**: Subtle star field backdrop

### ElementalPlanet.tsx
Renders large elemental planets with:
- Element-specific colors and shaders
- Animated atmospheric effects
- Glowing effects and rim lighting
- Responsive sizing

### SongPlanet.tsx
Renders individual song planets with:
- Element-based coloring
- Hover effects and scaling
- Click handling for song selection
- Responsive sizing

### HeartverseSystemWrapper.tsx
Integration wrapper that:
- Handles Canvas setup and lighting
- Manages responsive design
- Integrates with player store
- Provides performance optimizations

## Usage

### Basic Implementation
```tsx
import HeartverseSystemWrapper from "@/components/holo/HeartverseSystemWrapper";

<HeartverseSystemWrapper 
  showAll={true}
  onSongClick={(songId) => console.log('Selected:', songId)}
/>
```

### Testing
Use the `TestPlanets` component to compare the original system with the new Heartverse system:
- Visit the app and open browser console
- Type: `window.showTestPlanets = true` to enable test mode
- Toggle between "Original System" and "Heartverse System"

## Features

✅ **Central Core Heart**: Beautiful 3D heart planet at system center
✅ **Elemental Grouping**: Songs organized by element (heart, water, lightning, darkness)  
✅ **Large Elemental Planets**: Distinct visual anchors for each element type
✅ **Orbital Song Planets**: Smaller planets orbiting their element
✅ **Responsive Design**: Mobile-optimized positioning and sizing
✅ **Interactive**: Clickable song planets for future modal integration
✅ **Performance Optimized**: Demand-based rendering and mobile optimizations
✅ **Starfield Background**: Subtle space atmosphere

## Layout

```
        [Water]     [Heart]
           |           |
       Song Planets  Song Planets
           
              [Core Heart]
                (Center)
           
       Song Planets  Song Planets
           |           |
      [Lightning]  [Darkness]
```

## Integration

To integrate into existing codebase:
1. Import `HeartverseSystemWrapper` instead of `PlanetSystem`
2. Songs are automatically grouped by their `element` property
3. Uses existing `buildPlanetSongs()` function and player store
4. Maintains compatibility with current click handlers

## Responsive Features

- **Mobile**: Closer planet positioning, reduced orbit radii, lower DPR for performance
- **Desktop**: Full layout with extended orbits and higher visual quality
- **Tablet**: Balanced settings between mobile and desktop

## Element Colors

- **Heart**: Pink (#FC54AF) 
- **Water**: Blue (#38B6FF)
- **Lightning**: Yellow (#F2EF1D)
- **Darkness**: Dark Purple (#1a0033)