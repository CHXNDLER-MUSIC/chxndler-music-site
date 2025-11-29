# Heartverse Tour Integration Guide

## 1. Wrap your app with TourProvider

In your `app/layout.tsx`, wrap your app with the `TourProvider`:

```tsx
import { TourProvider } from '@/components/tour/HeartverseTour';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // You'll need to manage menu state to connect with tour actions
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMenuAction = (action: 'open-menu' | 'close-menu') => {
    if (action === 'open-menu') {
      setIsMenuOpen(true);
    } else {
      setIsMenuOpen(false);
    }
  };

  return (
    <html lang="en">
      <body>
        <TourProvider onMenuAction={handleMenuAction}>
          {/* Your app content */}
          <Header isMenuOpen={isMenuOpen} onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} />
          {children}
        </TourProvider>
      </body>
    </html>
  );
}
```

## 2. Add data-tour-id attributes to your elements

Add these attributes to the elements the tour needs to target:

### Hamburger menu button:
```tsx
<button data-tour-id="hamburger" onClick={onMenuToggle}>
  {/* Your hamburger icon */}
</button>
```

### Menu items (when menu is open):
```tsx
<nav>
  <a href="/about" data-tour-id="menu-about">ABOUT</a>
  <a href="/journey" data-tour-id="menu-journey">Journey</a>
  <a href="/journal" data-tour-id="menu-journal">Journal</a>
  <a href="/binder" data-tour-id="menu-binder">Binder</a>
  <a href="/badges" data-tour-id="menu-badges">Badges</a>
  <a href="/signal" data-tour-id="menu-signal">Signal</a>
</nav>
```

### Heart Coins display:
```tsx
<div data-tour-id="heartcoins" className="heart-coins-display">
  {/* Your Heart Coins UI */}
</div>
```

## 3. Use the tour in your Profile component

```tsx
import { useHeartverseTour } from '@/components/tour/HeartverseTour';

export function ProfilePopover() {
  const { startTour } = useHeartverseTour();

  return (
    <div className="profile-popover">
      {/* Other profile content */}
      <button 
        onClick={startTour}
        className="tour-button"
      >
        Start Tour
      </button>
    </div>
  );
}
```

## 4. Styling Notes

The tour uses these TailwindCSS classes for the spaceship aesthetic:
- `bg-gray-900/95 backdrop-blur-lg` for translucent panels
- `border-green-500/30` for subtle glowing borders  
- `bg-gradient-to-r from-green-400 to-blue-400` for holographic effects
- Pulsing animation for element highlights
- Responsive design that works on mobile and desktop

## 5. Customization

You can modify the tour steps in `HeartverseTour.tsx`:
- Edit the `tourSteps` array to change copy, targets, or flow
- Adjust positioning with the `position` property
- Add new actions in the `action` property
- Customize styling in the `TourOverlay` component