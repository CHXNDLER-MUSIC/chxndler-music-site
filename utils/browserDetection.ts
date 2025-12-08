export const isSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const ua = window.navigator.userAgent;
  const vendor = window.navigator.vendor;
  
  // Check for Safari specifically (not Chrome-based browsers)
  return /Safari/.test(ua) && /Apple Computer/.test(vendor) && !/Chrome/.test(ua);
};

export const supportsVideoBlendModes = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Safari doesn't properly support mix-blend-mode on video elements
  return !isSafari();
};