"use client";

import { useEffect } from 'react';
import { useAudio } from '@/app/providers/AudioProvider';
import { sfx } from '@/lib/sfx';
import { useUIState } from '@/lib/use-ui-state';

const GlobalKeyboardHandler = () => {
  const audioManager = useAudio();
  const { userClickedStart } = useUIState();

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle spacebar when not focused on input elements and START button has been clicked
      if (event.code === 'Space' && !isInputFocused(event.target as Element) && userClickedStart) {
        event.preventDefault(); // Prevent page scroll
        // Play flip sound when starting playback, pause sound when pausing
        try { 
          if (audioManager.playing) {
            sfx.play('pause', 0.6);
          } else {
            sfx.play('flip', 0.6);
          }
        } catch {}
        audioManager.togglePlayPause();
      }
    };

    // Check if the target element is an input, textarea, or contenteditable
    const isInputFocused = (target: Element | null): boolean => {
      if (!target) return false;
      
      const tagName = target.tagName.toLowerCase();
      const isContentEditable = target.getAttribute('contenteditable') === 'true';
      
      return (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        isContentEditable ||
        target.closest('[contenteditable="true"]') !== null
      );
    };

    // Add the event listener
    document.addEventListener('keydown', handleKeyPress);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [audioManager, userClickedStart]);

  // This component doesn't render anything
  return null;
};

export default GlobalKeyboardHandler;