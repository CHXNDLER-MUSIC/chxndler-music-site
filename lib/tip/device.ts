// Tiny, dependency-free UA classification. Coarse on purpose — we only want a
// device bucket and a browser family for aggregate analytics, nothing
// fingerprintable.

export type DeviceCategory = 'mobile' | 'tablet' | 'desktop';

export function deviceCategoryFromUA(ua: string): DeviceCategory {
  const s = ua.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))|kindle|silk|playbook/.test(s)) return 'tablet';
  if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry|bb10|opera mini/.test(s)) return 'mobile';
  return 'desktop';
}

export function browserFromUA(ua: string): string {
  const s = ua.toLowerCase();
  if (/edg\//.test(s)) return 'Edge';
  if (/opr\/|opera/.test(s)) return 'Opera';
  if (/firefox|fxios/.test(s)) return 'Firefox';
  if (/crios/.test(s)) return 'Chrome';
  if (/chrome|chromium/.test(s)) return 'Chrome';
  if (/safari/.test(s)) return 'Safari';
  return 'Other';
}
