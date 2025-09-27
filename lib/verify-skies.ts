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
  console.log('🎬 Running dynamic sky verification for all tracks...\n');
  
  // Test dynamic discovery functions
  console.group('🔍 Dynamic Discovery Tests:');
  
  // Test parsing
  const testFilenames = ['pokemon.mp4', 'were-just-friends-acoustic.mp4', 'ocean-girl-remix.mp4'];
  console.log('Filename parsing:');
  testFilenames.forEach(filename => {
    const parsed = parseSkySpoiler(filename);
    console.log(`  ${filename} → slug: "${parsed.slug}", variant: ${parsed.variant || 'none'}`);
  });
  
  // Test individual track discovery
  console.log('\nIndividual track discovery:');
  ['pokemon', 'ocean-girl', 'were-just-friends', 'nonexistent-track'].forEach(slug => {
    const skyMapping = findSkyVideoForTrack(slug);
    const hasVideo = hasAvailableSkyVideo(slug);
    console.log(`  ${slug}: ${hasVideo ? '✅' : '❌'} ${skyMapping ? skyMapping.mp4 : 'No video found'}`);
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
  console.log(`\n📊 Coverage: ${coverage.covered}/${coverage.total} tracks (${coverage.coverage.toFixed(1)}%)`);
  
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
  console.log('Testing variant preferences:');
  const friendsSky = findSkyVideoForTrack('were-just-friends', 'acoustic');
  console.log(`  were-just-friends (prefer acoustic): ${friendsSky?.mp4} (variant: ${friendsSky?.variant})`);
  
  const friendsDefault = findSkyVideoForTrack('were-just-friends');
  console.log(`  were-just-friends (default): ${friendsDefault?.mp4} (variant: ${friendsDefault?.variant || 'none'})`);
  
  // Test partial matches
  console.log('\nTesting partial matches:');
  const houseSky = findSkyVideoForTrack('house-party');
  console.log(`  house-party: ${houseSky?.mp4}`);
  
  console.groupEnd();
}

// Export for use in components or debugging
export { verifyAllTrackSkies, verifySkyForTrack, testSkyDiscoveryEdgeCases };