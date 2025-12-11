"use client";

import { useEffect } from 'react';
import { useAudio } from '@/app/providers/AudioProvider';

const GlobalKeyboardHandler = () => {
  const audioManager = useAudio();

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle spacebar when not focused on input elements
      if (event.code === 'Space' && !isInputFocused(event.target as Element)) {
        event.preventDefault(); // Prevent page scroll
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
  }, [audioManager]);

  // This component doesn't render anything
  return null;
};

export default GlobalKeyboardHandler;