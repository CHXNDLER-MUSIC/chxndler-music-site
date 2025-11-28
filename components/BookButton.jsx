"use client";

import { useState } from 'react';
import YourBook from './YourBook';
import { sfx } from '@/lib/sfx';

export default function BookButton() {
  const [isBookOpen, setIsBookOpen] = useState(false);

  const handleBookClick = () => {
    sfx.play('click', 0.6);
    setIsBookOpen(true);
  };

  const handleBookClose = () => {
    setIsBookOpen(false);
  };

  return (
    <>
      <button 
        className="w-8 h-8 sm:w-10 sm:h-10 opacity-80 hover:opacity-100 transition-opacity cursor-pointer group"
        aria-label="Open Your Book"
        title="Your Book"
        onClick={handleBookClick}
      >
        <img 
          src="/elements/binder.webp" 
          alt="Your Book" 
          className="w-full h-full object-contain group-hover:scale-110 transition-transform"
        />
      </button>
      
      <YourBook isOpen={isBookOpen} onClose={handleBookClose} />
    </>
  );
}
