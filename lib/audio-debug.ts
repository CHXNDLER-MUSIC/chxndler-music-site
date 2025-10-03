// Audio debugging utilities for the Heartbverse

export const testAudioFile = async (src: string): Promise<{
  success: boolean;
  error?: string;
  duration?: number;
  readyState?: number;
}> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    
    const cleanup = () => {
      audio.removeEventListener('canplaythrough', onCanPlayThrough);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
    
    const onCanPlayThrough = () => {
      cleanup();
      resolve({
        success: true,
        duration: audio.duration,
        readyState: audio.readyState
      });
    };
    
    const onError = () => {
      cleanup();
      resolve({
        success: false,
        error: audio.error?.message || `Error code: ${audio.error?.code}`,
        readyState: audio.readyState
      });
    };
    
    const onLoadedMetadata = () => {
      console.log(`🎵 Loaded metadata for ${src}:`, {
        duration: audio.duration,
        readyState: audio.readyState
      });
    };
    
    audio.addEventListener('canplaythrough', onCanPlayThrough, { once: true });
    audio.addEventListener('error', onError, { once: true });
    audio.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
    
    // Set timeout for slow networks
    setTimeout(() => {
      cleanup();
      resolve({
        success: false,
        error: 'Timeout loading audio file',
        readyState: audio.readyState
      });
    }, 15000);
    
    audio.src = src;
    audio.load();
  });
};

export const testAllAudioFiles = async (): Promise<void> => {
  console.log('🎵 Testing all audio files...');
  
  const audioFiles = [
    '/tracks/ocean-girl.mp3',
    '/tracks/paris.mp3', 
    '/tracks/brain-freeze.mp3',
    '/tracks/baby.mp3',
    '/tracks/be-my-bee.mp3',
    '/tracks/game-boy-heart.mp3',
    '/tracks/kid-forever.mp3',
    '/tracks/pokemon.mp3',
    '/tracks/house-party.mp3',
    '/tracks/collide.mp3',
    '/tracks/we\'re-just-friends.mp3',
    '/tracks/we\'re-just-friends-dmvrco-remix.mp3',
    '/tracks/we\'re-just-friends-mickey-jas-remix.mp3',
    '/tracks/ocean-girl-acoustic.mp3',
    '/tracks/ocean-girl-remix.mp3'
  ];
  
  const results = [];
  
  for (const file of audioFiles) {
    console.log(`🎵 Testing: ${file}`);
    const result = await testAudioFile(file);
    results.push({ file, ...result });
    
    if (result.success) {
      console.log(`✅ ${file} - Duration: ${result.duration?.toFixed(2)}s`);
    } else {
      console.error(`❌ ${file} - Error: ${result.error}`);
    }
  }
  
  console.log('🎵 Audio test results:', results);
  return results;
};

// Expose testing functions globally for browser console access
if (typeof window !== 'undefined') {
  (window as any).testAudio = testAudioFile;
  (window as any).testAllAudio = testAllAudioFiles;
}