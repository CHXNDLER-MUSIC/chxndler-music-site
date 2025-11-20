"use client";

import { useState, useCallback } from "react";
import { sfx } from "@/lib/sfx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  onHoverSound?: () => void;
  onCloseBlueDisplay?: () => void;
  onOpenBlueDisplay?: () => void;
  onBeamColorChange?: (color: string) => void;
  element?: string | null; // Current user element from profile
};

export default function ElementalButton({ asChild = false, children, onClick, onHoverSound, onCloseBlueDisplay, onOpenBlueDisplay, onBeamColorChange, element, ...rest }: Props) {
  const [open, setOpen] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [committedElement, setCommittedElement] = useState<string | null>(null);
  

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    try { onClick?.(e); } catch {}
    if (!e.defaultPrevented) {
      e.preventDefault();
      try { sfx.play('click', 0.8); } catch {}
      // Trigger purple/elemental light beam
      try { onBeamColorChange?.('purple'); } catch {}
      // Close blue display first
      try { onCloseBlueDisplay?.(); } catch {}
      setOpen(true);
    }
  };


  // Handle element selection
  const selectElement = useCallback((element: string) => {
    try { sfx.play('click', 0.6); } catch {}
    setSelectedElement(element);
  }, []);

  return (
    <>
      <button
        onClick={handleClick} 
        onMouseEnter={onHoverSound}
        className="p-1 rounded-lg transition-all duration-200 w-12 h-10"
        style={{
          transition: 'all 0.3s ease',
          ...rest.style
        }}
        onMouseEnter={(e) => {
          if (onHoverSound) onHoverSound();
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        {...rest}
      >
        <img
          src={element ? `/elements/${element}.png` : "/elements/elementals.png"}
          alt={element ? element.charAt(0).toUpperCase() + element.slice(1) : "Elementals"}
          className="w-full h-full object-cover rounded"
          draggable={false}
        />
      </button>
      
      {/* Hologram base glow - wider and stronger */}
      {open && (
        <div 
          className="fixed inset-0 z-[2147483646] flex items-center justify-center"
          style={{
            pointerEvents: 'none',
            paddingTop: '400px'
          }}
        >
          <div
            style={{
              width: 'min(120vw, 700px)',
              height: '200px',
              background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(147,51,234,0.7) 0%, rgba(147,51,234,0.4) 30%, rgba(147,51,234,0.1) 60%, transparent 100%)',
              filter: 'blur(100px)'
            }}
          />
        </div>
      )}
      
      {/* Elementals Modal - holographic popup */}
      {open && (
        <div 
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
          style={{
            paddingTop: '300px'
          }}
        >
          <div
            className="elementals-hologram-container"
            style={{
              width: 'min(92vw, 700px)',
              height: '40vh',
              padding: '10px 14px 14px 14px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(147,51,234,0.55)',
              boxShadow: '0 -8px 25px rgba(147,51,234,0.4), 0 -4px 15px rgba(147,51,234,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(147,51,234,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              color: '#9333EA',
              position: 'relative'
            }}
        >
          {/* Soft bottom glow pseudo element */}
          <div 
            className="absolute"
            style={{
              bottom: '-15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '120%',
              height: '30px',
              background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(147,51,234,0.6) 0%, rgba(147,51,234,0.3) 40%, transparent 80%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
          
          {/* Top bloom glow - simulates hologram light rising through panel */}
          <div 
            className="absolute"
            style={{
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80%',
              height: '20px',
              background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(147,51,234,0.4) 0%, rgba(147,51,234,0.2) 50%, transparent 100%)',
              filter: 'blur(25px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
          
          {/* Close button */}
          <button
            onClick={() => {
              try { sfx.play('close', 0.8); } catch {}
              setOpen(false);
              // Show blue display when closing elementals popup
              try { onOpenBlueDisplay?.(); } catch {}
            }}
            className="absolute top-2 right-4 text-purple-400 hover:text-purple-200 cursor-pointer w-8 h-8 rounded-full border border-purple-400/80 flex items-center justify-center"
            style={{ 
              fontSize: '16px',
              boxShadow: '0 0 15px rgba(147,51,234,0.8), 0 0 25px rgba(147,51,234,0.5), 0 0 35px rgba(147,51,234,0.3)',
              textShadow: '0 0 8px rgba(147,51,234,0.8), 0 0 15px rgba(147,51,234,0.6)',
              background: 'rgba(147,51,234,0.1)',
              backdropFilter: 'blur(2px)'
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
          
          {/* Header */}
          <div 
            className="text-center mb-4"
            style={{ 
              color: '#9333EA', 
              textShadow: '0 0 8px rgba(147,51,234,0.6)', 
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            THE ELEMENTS OF THE HEARTVERSE
          </div>
          
          {/* Thin purple neon line */}
          <div 
            className="w-full h-px mb-4"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(147,51,234,0.8) 20%, rgba(147,51,234,1) 50%, rgba(147,51,234,0.8) 80%, transparent)',
              boxShadow: '0 0 4px rgba(147,51,234,0.6)'
            }}
          />

          {/* Content */}
          <div className="flex gap-4 h-full">
            {/* Left Side - Elemental Image */}
            <div style={{ width: '40%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '10px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: 150 }}>
                <img
                  src="/elements/elemental.png"
                  alt="Elemental"
                  style={{ 
                    display: 'block', 
                    width: '100%', 
                    height: 'auto', 
                    background: 'transparent',
                    filter: hoveredElement === 'darkness' ? 'drop-shadow(10px 10px 20px #9400D3)' :
                           hoveredElement === 'heart' ? 'drop-shadow(-10px 10px 20px #FF69B4)' :
                           hoveredElement === 'water' ? 'drop-shadow(10px -10px 20px #00BFFF)' :
                           hoveredElement === 'lightning' ? 'drop-shadow(-10px -10px 20px #FFD700)' : 'none',
                    transition: 'filter 0.3s ease'
                  }}
                />
                
                {/* Quadrant overlay buttons */}
                <button 
                  aria-label="Darkness" 
                  title="Darkness" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectElement('darkness');
                  }} 
                  onMouseEnter={() => {
                    setHoveredElement('darkness');
                    try { sfx.play('hover', 0.25); } catch {}
                  }}
                  onMouseLeave={() => setHoveredElement(null)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '50%',
                    height: '50%',
                    background: hoveredElement !== 'darkness' && hoveredElement ? 'rgba(148,0,211,0.3)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.3s ease',
                    clipPath: 'polygon(0 0, 100% 0, 0 100%)'
                  }}
                  data-element="darkness"
                />
                <button 
                  aria-label="Heart" 
                  title="Heart" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectElement('heart');
                  }} 
                  onMouseEnter={() => {
                    setHoveredElement('heart');
                    try { sfx.play('hover', 0.25); } catch {}
                  }}
                  onMouseLeave={() => setHoveredElement(null)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '50%',
                    height: '50%',
                    background: hoveredElement !== 'heart' && hoveredElement ? 'rgba(255,105,180,0.3)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.3s ease',
                    clipPath: 'polygon(100% 0, 100% 100%, 0 0)'
                  }}
                  data-element="heart"
                />
                <button 
                  aria-label="Water" 
                  title="Water" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectElement('water');
                  }} 
                  onMouseEnter={() => {
                    setHoveredElement('water');
                    try { sfx.play('hover', 0.25); } catch {}
                  }}
                  onMouseLeave={() => setHoveredElement(null)}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '50%',
                    height: '50%',
                    background: hoveredElement !== 'water' && hoveredElement ? 'rgba(0,191,255,0.3)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.3s ease',
                    clipPath: 'polygon(0 100%, 100% 100%, 0 0)'
                  }}
                  data-element="water"
                />
                <button 
                  aria-label="Lightning" 
                  title="Lightning" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectElement('lightning');
                  }} 
                  onMouseEnter={() => {
                    setHoveredElement('lightning');
                    try { sfx.play('hover', 0.25); } catch {}
                  }}
                  onMouseLeave={() => setHoveredElement(null)}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '50%',
                    height: '50%',
                    background: hoveredElement !== 'lightning' && hoveredElement ? 'rgba(255,215,0,0.3)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.3s ease',
                    clipPath: 'polygon(100% 100%, 100% 0, 0 100%)'
                  }}
                  data-element="lightning"
                />
              </div>
            </div>

            {/* Right Side - Content */}
            <div style={{ width: '60%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              {/* Element Info Display */}
              {hoveredElement && (
                <div 
                  className="text-center p-3 rounded-lg border transition-all duration-300"
                  style={{ 
                    borderColor: hoveredElement === 'darkness' ? 'rgba(148,0,211,0.4)' :
                                hoveredElement === 'heart' ? 'rgba(255,105,180,0.4)' :
                                hoveredElement === 'water' ? 'rgba(0,191,255,0.4)' :
                                hoveredElement === 'lightning' ? 'rgba(255,215,0,0.4)' : 'transparent',
                    background: hoveredElement === 'darkness' ? 'rgba(148,0,211,0.1)' :
                               hoveredElement === 'heart' ? 'rgba(255,105,180,0.1)' :
                               hoveredElement === 'water' ? 'rgba(0,191,255,0.1)' :
                               hoveredElement === 'lightning' ? 'rgba(255,215,0,0.1)' : 'transparent',
                    boxShadow: hoveredElement === 'darkness' ? '0 0 15px rgba(148,0,211,0.3)' :
                              hoveredElement === 'heart' ? '0 0 15px rgba(255,105,180,0.3)' :
                              hoveredElement === 'water' ? '0 0 15px rgba(0,191,255,0.3)' :
                              hoveredElement === 'lightning' ? '0 0 15px rgba(255,215,0,0.3)' : 'none',
                    marginBottom: '16px'
                  }}
                >
                  <div 
                    style={{ 
                      color: hoveredElement === 'darkness' ? '#9400D3' :
                             hoveredElement === 'heart' ? '#FF69B4' :
                             hoveredElement === 'water' ? '#00BFFF' :
                             hoveredElement === 'lightning' ? '#FFD700' : '#FFFFFF',
                      fontWeight: 'bold',
                      marginBottom: '8px',
                      fontSize: '16px',
                      textShadow: hoveredElement === 'darkness' ? '0 0 8px rgba(148,0,211,0.8)' :
                                 hoveredElement === 'heart' ? '0 0 8px rgba(255,105,180,0.8)' :
                                 hoveredElement === 'water' ? '0 0 8px rgba(0,191,255,0.8)' :
                                 hoveredElement === 'lightning' ? '0 0 8px rgba(255,215,0,0.8)' : 'none'
                    }}
                  >
                    {hoveredElement === 'darkness' ? '🌑 DARKNESS' :
                     hoveredElement === 'heart' ? '🩷 HEART' :
                     hoveredElement === 'water' ? '💧 WATER' :
                     hoveredElement === 'lightning' ? '⚡ LIGHTNING' : ''}
                  </div>
                  <div 
                    style={{ 
                      color: hoveredElement === 'darkness' ? '#DDA0DD' :
                             hoveredElement === 'heart' ? '#FFB4D6' :
                             hoveredElement === 'water' ? '#87CEEB' :
                             hoveredElement === 'lightning' ? '#FFED4A' : '#FFFFFF',
                      fontSize: '12px'
                    }}
                  >
                    {hoveredElement === 'darkness' ? 'Mystery & Transformation' :
                     hoveredElement === 'heart' ? 'Emotion & Connection' :
                     hoveredElement === 'water' ? 'Flow & Adaptation' :
                     hoveredElement === 'lightning' ? 'Energy & Speed' : ''}
                  </div>
                </div>
              )}
              
              {/* Default message when no element is hovered */}
              {!hoveredElement && (
                <div 
                  className="text-center p-3"
                  style={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    fontSize: '14px',
                    fontStyle: 'italic',
                    marginBottom: '16px'
                  }}
                >
                  Hover over the elemental quadrants to explore each element's power
                </div>
              )}
              
              {/* Selected Element Display */}
              {selectedElement && (
                <div 
                  className="text-center p-4 rounded-lg border-2 mb-4"
                  style={{ 
                    borderColor: selectedElement === 'darkness' ? 'rgba(148,0,211,0.6)' :
                                selectedElement === 'heart' ? 'rgba(255,105,180,0.6)' :
                                selectedElement === 'water' ? 'rgba(0,191,255,0.6)' :
                                selectedElement === 'lightning' ? 'rgba(255,215,0,0.6)' : 'transparent',
                    background: selectedElement === 'darkness' ? 'rgba(148,0,211,0.15)' :
                               selectedElement === 'heart' ? 'rgba(255,105,180,0.15)' :
                               selectedElement === 'water' ? 'rgba(0,191,255,0.15)' :
                               selectedElement === 'lightning' ? 'rgba(255,215,0,0.15)' : 'transparent',
                    boxShadow: selectedElement === 'darkness' ? '0 0 20px rgba(148,0,211,0.4)' :
                              selectedElement === 'heart' ? '0 0 20px rgba(255,105,180,0.4)' :
                              selectedElement === 'water' ? '0 0 20px rgba(0,191,255,0.4)' :
                              selectedElement === 'lightning' ? '0 0 20px rgba(255,215,0,0.4)' : 'none'
                  }}
                >
                  <div 
                    style={{ 
                      color: selectedElement === 'darkness' ? '#9400D3' :
                             selectedElement === 'heart' ? '#FF69B4' :
                             selectedElement === 'water' ? '#00BFFF' :
                             selectedElement === 'lightning' ? '#FFD700' : '#FFFFFF',
                      fontWeight: 'bold',
                      fontSize: '18px',
                      marginBottom: '8px',
                      textShadow: selectedElement === 'darkness' ? '0 0 10px rgba(148,0,211,1)' :
                                 selectedElement === 'heart' ? '0 0 10px rgba(255,105,180,1)' :
                                 selectedElement === 'water' ? '0 0 10px rgba(0,191,255,1)' :
                                 selectedElement === 'lightning' ? '0 0 10px rgba(255,215,0,1)' : 'none'
                    }}
                  >
                    SELECTED: {selectedElement.toUpperCase()}
                  </div>
                  <div 
                    style={{ 
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '12px'
                    }}
                  >
                    You have chosen the path of {selectedElement}. This element will guide your journey through the Heartverse.
                  </div>
                </div>
              )}
              
              {/* COMMIT Button */}
              <div className="text-center mt-auto">
                <button
                  onClick={() => {
                    try { sfx.play('click', 0.8); } catch {}
                    if (selectedElement) {
                      setCommittedElement(selectedElement);
                    }
                    setOpen(false);
                    try { onOpenBlueDisplay?.(); } catch {}
                  }}
                  className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold rounded-lg transition-all duration-200 hover:scale-105"
                  style={{
                    boxShadow: '0 0 20px rgba(255, 255, 255, 0.4), 0 0 40px rgba(255, 255, 255, 0.2)',
                    textShadow: '0 0 8px rgba(255, 255, 255, 0.8)',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.7), 0 0 50px rgba(255, 255, 255, 0.4)';
                    e.currentTarget.style.textShadow = '0 0 12px rgba(255, 255, 255, 1), 0 0 20px rgba(255, 255, 255, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.4), 0 0 40px rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.textShadow = '0 0 8px rgba(255, 255, 255, 0.8)';
                  }}
                >
                  COMMIT
                </button>
                
                <div 
                  className="text-xs mt-3"
                  style={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    fontStyle: 'italic' 
                  }}
                >
                  Master your elemental affinity to unlock unique abilities
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  );
}