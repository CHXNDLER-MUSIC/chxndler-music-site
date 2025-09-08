# Follow-Up Tasks

## 1. Fix Git LFS/PNG Corruption Issue

**Priority:** Medium (build is unblocked, but static imports would be better for performance)

**Problem:** PNG files in `/public/elements/` are Git LFS pointer files or corrupted, causing Next.js static import failures during build.

**Current Workaround:** Reverted to string paths (`"/elements/chxndler.png"`) instead of static imports.

**Ideal Solution:** Fix the root cause so we can restore static imports for better optimization.

### Steps to Fix:
1. **Check Git LFS status:** Run `git lfs ls-files` to see which files are in LFS
2. **Verify PNG files:** Check if PNG files in `/public/elements/` are actual images or pointer files
3. **Fix options:**
   - If Git LFS: Ensure LFS is properly configured and files are pulled (`git lfs pull`)
   - If corrupted: Replace with valid PNG files
   - If mis-labeled: Verify file extensions match actual format

### After fixing, restore static imports:
```js
// In lib/elementIcons.js - RESTORE AFTER PNG FIX
import chxndlerIcon from '../public/elements/chxndler.png';
import heartIcon from '../public/elements/heart.png';
// ... etc

export const elementIcons = {
  chxndler: chxndlerIcon, // Static import (better performance)
  heart: heartIcon,
  // ...
};
```

### Files that need updating when PNG issue is fixed:
- `lib/elementIcons.js` - Restore static imports
- `components/HoloHubMenu.tsx` - Use imported icon
- `components/HoloJoinButton.tsx` - Use imported icon  
- `components/HoloJoinPopout.tsx` - Use imported icon

**Benefits of fixing:**
- Better performance with Next.js optimized images
- Content hashing for cache busting
- Bundle optimization
- Fewer runtime network requests