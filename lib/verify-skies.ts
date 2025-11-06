/**
 * Sky verification utility - can be run to check track/sky mappings
 * Now includes dynamic discovery testing
 */

import { tracks } from './songs-consolidated';
import { verifyAllTrackSkies, verifySkyForTrack, getAllSkyMappings, skyFor } from './sky';
import { 
  findSkyVideoForTrack, 
  getAllDiscoveredSkyMappings, 
  getSkyVideoCoverage,
  parseSkySpoiler,
  hasAvailableSkyVideo
} from './sky-discovery';

export function runSkyVerification() {
  // console output removed
  
  // Test dynamic discovery functions
  console.group('🔍 Dynamic Discovery Tests:');
  
  // Test parsing
  const testFilenames = ['pokemon.mp4', 'were-just-friends-acoustic.mp4', 'ocean-girl-remix.mp4'];
  // console output removed
  testFilenames.forEach(filename => {
    const parsed = parseSkySpoiler(filename);
    // console output removed
  });
  
  // Test individual track discovery
  // console output removed
  ['pokemon', 'ocean-girl', 'were-just-friends', 'nonexistent-track'].forEach(slug => {
    const skyMapping = findSkyVideoForTrack(slug);
    const hasVideo = hasAvailableSkyVideo(slug);
    // console output removed
  });
  
  console.groupEnd();
  
  // Test skyFor function with dynamic discovery
  console.group('🎯 skyFor() Function Tests:');
  ['pokemon', 'ocean-girl', 'were-just-friends', 'alien-house-party', 'house-party', 'unknown-song'].forEach(slug => {
    const sky = skyFor(slug);
    console.log(`  ${slug} → ${sky.key} (${sky.mp4})`);
  });
  console.groupEnd();
  
  // Overall coverage analysis
  const coverage = getSkyVideoCoverage(tracks.map(t => t.slug));
  // console output removed
  
  // Verify all tracks (this will also show detailed console output)
  const summary = verifyAllTrackSkies(tracks);
  
  return {
    summary,
    coverage,
    discoveredMappings: getAllDiscoveredSkyMappings()
  };
}

// Test function for specific edge cases
export function testSkyDiscoveryEdgeCases() {
  console.group('🧪 Sky Discovery Edge Case Tests:');
  
  // Test variant preferences
  // console output removed
  const friendsSky = findSkyVideoForTrack('were-just-friends', 'acoustic');
  // console output removed
  
  const friendsDefault = findSkyVideoForTrack('were-just-friends');
  // console output removed
  
  // Test partial matches
  // console output removed
  const houseSky = findSkyVideoForTrack('house-party');
  // console output removed
  
  console.groupEnd();
}

// Export for use in components or debugging
export { verifyAllTrackSkies, verifySkyForTrack, testSkyDiscoveryEdgeCases };
