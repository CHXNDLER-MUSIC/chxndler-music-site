export function getElementColor(elementId: string): number {
  switch (elementId) {
    case 'HEART': return 0xff6b9d;
    case 'WATER': return 0x4fc3f7;
    case 'LIGHTNING': return 0xffeb3b;
    case 'DARKNESS': return 0x9c27b0;
    default: return 0x888888;
  }
}

export function getElementEmissive(elementId: string): number {
  switch (elementId) {
    case 'HEART': return 0x330a15;
    case 'WATER': return 0x0a1a33;
    case 'LIGHTNING': return 0x332a0a;
    case 'DARKNESS': return 0x1a0a33;
    default: return 0x111111;
  }
}

export function getElementGlowColor(elementId: string): number {
  switch (elementId) {
    case 'HEART': return 0xff1493;    // Bright pink light
    case 'WATER': return 0x4169e1;    // Bright blue light  
    case 'LIGHTNING': return 0xffff00; // Bright yellow light
    case 'DARKNESS': return 0xffffff;  // Bright white light
    default: return 0x888888;
  }
}

export function getElementLightColor(elementId: string): number {
  switch (elementId) {
    case 'HEART': return 0xff69b4;    // Pink light emission
    case 'WATER': return 0x87ceeb;    // Blue light emission
    case 'LIGHTNING': return 0xffd700; // Yellow light emission  
    case 'DARKNESS': return 0xffffff;  // White light emission
    default: return 0x888888;
  }
}