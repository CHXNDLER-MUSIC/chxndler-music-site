"use client";

import { useState } from 'react';

interface ElementalRowsProps {
  active: boolean;
}

const ELEMENT_ROWS = [
  { name: 'HEART', color: '#FF69B4', image: '/elements/heart.webp' },
  { name: 'WATER', color: '#00BFFF', image: '/elements/water.webp' },
  { name: 'LIGHTNING', color: '#FFD700', image: '/elements/lightning.webp' },
  { name: 'DARKNESS', color: '#9400D3', image: '/elements/darkness.webp' }
];

export default function ElementalRows({ active }: ElementalRowsProps) {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  // Handle element row click
  const handleElementClick = (elementName: string) => {
    if (!active) return; // Don't allow interactions when disabled
    
    // Play click sound
    try {
      const audio = new Audio('/audio/click.mp3');
      audio.volume = 0.3;
      audio.play().catch(error => {
        console.log('Click audio play failed:', error);
      });
    } catch (error) {
      console.log('Click audio creation failed:', error);
    }
    
    // Toggle selection - if clicking the same element, deselect it
    setSelectedElement(prev => prev === elementName ? null : elementName);
  };

  return (
    <div className="space-y-0">
      {ELEMENT_ROWS.map((element) => {
        const isSelected = selectedElement === element.name;
        const dimmed = !active;
        
        return (
          <div
            key={element.name}
            className={`
              flex items-center py-1 rounded-lg border backdrop-blur-sm transition-all duration-300 
              ${active ? 'hover:border-white/40 cursor-pointer' : 'cursor-not-allowed'}
              ${dimmed ? 'opacity-40' : 'opacity-100'}
            `}
            style={{
              borderColor: isSelected ? `${element.color}` : `${element.color}${dimmed ? '20' : '40'}`,
              boxShadow: isSelected && active
                ? `0 0 25px ${element.color}80, 0 0 50px ${element.color}40` 
                : `0 0 15px ${element.color}${dimmed ? '10' : '20'}`,
              background: isSelected && active
                ? `linear-gradient(90deg, ${element.color}20, ${element.color}10)` 
                : `linear-gradient(90deg, rgba(0,0,0,${dimmed ? '0.2' : '0.4'}), rgba(0,0,0,${dimmed ? '0.1' : '0.2'}))`
            }}
            onClick={() => handleElementClick(element.name)}
            onMouseEnter={() => {
              if (!active) return;
              try {
                const audio = new Audio('/audio/hover.mp3');
                audio.volume = 0.3;
                audio.play().catch(error => {
                  console.log('Hover audio play failed:', error);
                });
              } catch (error) {
                console.log('Hover audio creation failed:', error);
              }
            }}
          >
            {/* Element image on left */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
              <img
                src={element.image}
                alt={element.name}
                className={`w-6 h-6 object-cover ${dimmed ? 'opacity-50' : 'opacity-100'}`}
                draggable={false}
              />
            </div>

            {/* Element name */}
            <div className="flex-1">
              <h4 
                className="text-sm font-bold"
                style={{
                  color: isSelected && active ? '#FFFFFF' : element.color,
                  opacity: dimmed ? 0.6 : 1,
                  textShadow: isSelected && active
                    ? `0 0 15px ${element.color}, 0 0 30px ${element.color}` 
                    : `0 0 10px ${element.color}${dimmed ? '40' : '80'}`
                }}
              >
                {element.name}
              </h4>
            </div>

            {/* Right indicator */}
            <div className="flex items-center space-x-2 text-white/40">
            </div>
          </div>
        );
      })}
    </div>
  );
}