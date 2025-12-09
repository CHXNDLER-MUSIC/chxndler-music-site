// Theme configuration for the Cockpit HUD and related components
export const THEME = {
  colors: {
    surface: 'rgba(20, 20, 25, 0.95)',
    text: '#ffffff',
    borderHud: 'rgba(255, 255, 255, 0.15)',
    hudTop: 'rgba(15, 15, 20, 0.98)',
    railHover: 'rgba(40, 40, 50, 0.95)',
    progressTrack: 'rgba(255, 255, 255, 0.1)',
  },
  
  shadow: {
    deepHud: '0 8px 32px rgba(0, 0, 0, 0.6)',
    innerHud: 'inset 0 1px 2px rgba(255, 255, 255, 0.1)',
    deepHover: '0 12px 48px rgba(0, 0, 0, 0.8)',
    rimAccentHover: 'inset 0 0 0 1px rgba(255, 255, 255, 0.2)',
    innerPrimary: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
    rimAccent: '0 0 0 1px rgba(255, 255, 255, 0.1)',
  },
  
  radii: {
    btn: 8,
    hud: 12,
    cover: 6,
  },
  
  sizes: {
    cover: {
      w: 48,
      h: 48,
    },
  },
  
  blur: {
    hud: 'blur(16px) saturate(1.2)',
  },
};