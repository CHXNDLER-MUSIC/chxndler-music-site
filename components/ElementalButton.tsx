"use client";

import { useState, useCallback, useEffect } from "react";
import { sfx } from "@/lib/sfx";
import { useProfile } from "@/contexts/ProfileContext";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  onHoverSound?: () => void;
  onCloseBlueDisplay?: () => void;
  onOpenBlueDisplay?: () => void;
  onBeamColorChange?: (color: string) => void;
  element?: string | null; // Current user element from profile
  onElementSelect?: (element: string) => void; // Callback when user selects new element
  // UI state, should NOT hit the DOM
  isActive?: boolean;
};

export default function ElementalButton({ asChild = false, children, onClick, onHoverSound, onCloseBlueDisplay, onOpenBlueDisplay, onBeamColorChange, element, onElementSelect, isActive = false, ...restProps }: Props) {
  const { profile, user, refreshProfile } = useProfile();
  const [open, setOpen] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [committedElement, setCommittedElement] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Initialize and sync committedElement with the profile element
  useEffect(() => {
    if (element) {
      setCommittedElement(element);
    }
  }, [element]);

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
        className="p-1 rounded-lg transition-all duration-200 w-14 h-12"
        style={{
          transition: 'all 0.3s ease',
          ...restProps.style
        }}
        onMouseEnter={(e) => {
          if (onHoverSound) onHoverSound();
          e.currentTarget.style.transform = 'scale(1.18)';
          e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(147,51,234,0.9)) drop-shadow(0 0 16px rgba(147,51,234,0.5)) brightness(1.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.filter = '';
        }}
        // Spread only safe DOM props (filtered)
        {...restProps}
      >
        <img
          src={committedElement ? `/elements/${committedElement}.webp` : (element ? `/elements/${element}.webp` : "/elements/elementals.webp")}
          alt={committedElement ? committedElement.charAt(0).toUpperCase() + committedElement.slice(1) : (element ? element.charAt(0).toUpperCase() + element.slice(1) : "Elemental")}
          className="w-full h-full object-contain rounded"
          draggable={false}
        />
      </button>
      
      {/* Hologram base glow - wider and stronger */}
      {open && (
        <div 
          className="fixed inset-0 z-[2147483646] flex items-center justify-center"
          style={{
            pointerEvents: 'none',
            paddingTop: '265px'
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
            paddingTop: '265px'
          }}
        >
          <div
            className="elementals-hologram-container"
            style={{
              width: 'min(92vw, 700px)',
              height: '40vh',
              padding: '8px 12px 0px 12px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(147,51,234,0.55)',
              boxShadow: '0 -8px 25px rgba(147,51,234,0.4), 0 -4px 15px rgba(147,51,234,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(147,51,234,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              color: '#9333EA',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'visible'
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
            className="text-center mb-2"
            style={{ 
              color: '#9333EA', 
              textShadow: '0 0 8px rgba(147,51,234,0.6)', 
              fontSize: '16px',
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


          {/* Explore text across whole display */}
          <div 
            className="text-center mb-3"
            style={{ 
              color: '#FFFFFF', 
              fontSize: '14px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textShadow: '0 0 10px #FFFFFF, 0 0 20px #FFFFFF, 0 0 30px #FFFFFF'
            }}
          >
            explore each element's power
          </div>

          {/* Content */}
          <div className="flex gap-4" style={{marginBottom: '0px', paddingBottom: '0px', height: 'calc(100% - 80px)'}}>
            {/* Four Elements Box */}
            <div style={{ width: '40%', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '0px', paddingBottom: '0px', marginBottom: '0px', height: '100%' }}>
              
              <div 
                className="grid grid-cols-2 gap-2 p-3 rounded-lg border"
                style={{
                  borderColor: 'rgba(147,51,234,0.4)',
                  background: 'rgba(147,51,234,0.1)',
                  boxShadow: '0 0 15px rgba(147,51,234,0.3)',
                  marginBottom: '8px'
                }}
              >
                {/* Darkness - Top Left */}
                <button 
                  aria-label="Darkness" 
                  title="Darkness" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectElement('darkness');
                  }} 
                  className="w-16 h-16 rounded-lg border-2 transition-all duration-300 flex items-center justify-center"
                  style={{
                    borderColor: selectedElement === 'darkness' ? 'rgba(255,255,255,0.8)' : 'rgba(148,0,211,0.3)',
                    background: selectedElement === 'darkness' ? 'rgba(255,255,255,0.2)' : 'rgba(148,0,211,0.05)',
                    boxShadow: selectedElement === 'darkness' ? '0 0 20px rgba(255,255,255,0.6)' : 'none'
                  }}
                >
                  <img
                    src="/elements/darkness.webp"
                    alt="Darkness"
                    className="w-12 h-12 object-contain"
                    draggable={false}
                  />
                </button>

                {/* Heart - Top Right */}
                <button 
                  aria-label="Heart" 
                  title="Heart" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectElement('heart');
                  }} 
                  className="w-16 h-16 rounded-lg border-2 transition-all duration-300 flex items-center justify-center"
                  style={{
                    borderColor: selectedElement === 'heart' ? 'rgba(255,105,180,0.8)' : 'rgba(255,105,180,0.3)',
                    background: selectedElement === 'heart' ? 'rgba(255,105,180,0.2)' : 'rgba(255,105,180,0.05)',
                    boxShadow: selectedElement === 'heart' ? '0 0 20px rgba(255,105,180,0.6)' : 'none'
                  }}
                >
                  <img
                    src="/elements/heart.webp"
                    alt="Heart"
                    className="w-12 h-12 object-contain"
                    draggable={false}
                  />
                </button>

                {/* Water - Bottom Left */}
                <button 
                  aria-label="Water" 
                  title="Water" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectElement('water');
                  }} 
                  className="w-16 h-16 rounded-lg border-2 transition-all duration-300 flex items-center justify-center"
                  style={{
                    borderColor: selectedElement === 'water' ? 'rgba(0,191,255,0.8)' : 'rgba(0,191,255,0.3)',
                    background: selectedElement === 'water' ? 'rgba(0,191,255,0.2)' : 'rgba(0,191,255,0.05)',
                    boxShadow: selectedElement === 'water' ? '0 0 20px rgba(0,191,255,0.6)' : 'none'
                  }}
                >
                  <img
                    src="/elements/water.webp"
                    alt="Water"
                    className="w-12 h-12 object-contain"
                    draggable={false}
                  />
                </button>

                {/* Lightning - Bottom Right */}
                <button 
                  aria-label="Lightning" 
                  title="Lightning" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectElement('lightning');
                  }} 
                  className="w-16 h-16 rounded-lg border-2 transition-all duration-300 flex items-center justify-center"
                  style={{
                    borderColor: selectedElement === 'lightning' ? 'rgba(255,215,0,0.8)' : 'rgba(255,215,0,0.3)',
                    background: selectedElement === 'lightning' ? 'rgba(255,215,0,0.2)' : 'rgba(255,215,0,0.05)',
                    boxShadow: selectedElement === 'lightning' ? '0 0 20px rgba(255,215,0,0.6)' : 'none'
                  }}
                >
                  <img
                    src="/elements/lightning.webp"
                    alt="Lightning"
                    className="w-12 h-12 object-contain"
                    draggable={false}
                  />
                </button>
              </div>

              {/* Small gap before commit button */}
              <div style={{height: '12px'}}></div>

              {/* COMMIT Button - Bottom of container */}
              <div className="w-full flex-shrink-0" style={{marginBottom: '11px'}}>
                <button
                  onClick={async () => {
                    if (!selectedElement || saving) return;

                    try { sfx.play('click', 0.8); } catch {}
                    // Play star.mp3 when ALIGN button is clicked
                    try {
                      const audio = new Audio('/audio/star.mp3');
                      audio.play().catch(e => { if (process.env.NODE_ENV !== "production") console.log('Star audio play failed:', e); });
                    } catch {}

                    // Save to database if user is logged in (do NOT send updated_at)
                    if (user && profile) {
                      setSaving(true);
                      try {
                        const { error } = await supabaseBrowser
                          .from('profiles')
                          .update({
                            element: selectedElement,
                            profile_image_url: `/elements/${selectedElement}.webp`
                          })
                          .eq('id', user.id);

                        if (error) {
                          console.error('Error updating profile element:', error);
                          setSaving(false);
                          return;
                        }

                        // Refresh profile context
                        await refreshProfile();

                        try { sfx.play('flip', 0.6); } catch {}
                        try { sfx.play('success', 0.8); } catch {}
                      } catch (error) {
                        console.error('Error aligning with element:', error);
                        setSaving(false);
                        return;
                      }
                      setSaving(false);
                    }

                    setCommittedElement(selectedElement);
                    // Notify parent component if callback provided
                    if (onElementSelect) {
                      onElementSelect(selectedElement);
                    }

                    setOpen(false);
                    try { onOpenBlueDisplay?.(); } catch {}
                  }}
                  disabled={saving || !selectedElement}
                  className="w-full py-2 bg-white/10 hover:bg-white/20 border-2 border-white/60 text-white font-bold rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    boxShadow: '0 0 25px rgba(255, 255, 255, 0.8), 0 0 50px rgba(255, 255, 255, 0.5), 0 0 75px rgba(255, 255, 255, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.2)',
                    textShadow: '0 0 12px rgba(255, 255, 255, 1), 0 0 20px rgba(255, 255, 255, 0.8)',
                    fontSize: '12px',
                    marginBottom: '0px'
                  }}
                  onMouseEnter={(e) => {
                    // Play hover.mp3 sound on ALIGN button hover
                    const audio = new Audio('/audio/hover.mp3');
                    audio.play().catch(e => { if (process.env.NODE_ENV !== "production") console.log('Hover audio play failed:', e); });
                    e.currentTarget.style.boxShadow = '0 0 35px rgba(255, 255, 255, 1), 0 0 70px rgba(255, 255, 255, 0.7), 0 0 105px rgba(255, 255, 255, 0.4), inset 0 0 15px rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.textShadow = '0 0 15px rgba(255, 255, 255, 1), 0 0 25px rgba(255, 255, 255, 0.9), 0 0 35px rgba(255, 255, 255, 0.7)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 255, 255, 0.8), 0 0 50px rgba(255, 255, 255, 0.5), 0 0 75px rgba(255, 255, 255, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.textShadow = '0 0 12px rgba(255, 255, 255, 1), 0 0 20px rgba(255, 255, 255, 0.8)';
                  }}
                >
                  {saving ? 'ALIGNING...' : 'ALIGN'}
                </button>
              </div>
              
            </div>

            {/* Right Side - Content */}
            <div style={{ width: '60%', display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Element Info Display */}
              {hoveredElement && (
                <div 
                  className="text-center p-3 rounded-lg border transition-all duration-300"
                  style={{ 
                    borderColor: hoveredElement === 'darkness' ? 'rgba(255,255,255,0.4)' :
                                hoveredElement === 'heart' ? 'rgba(255,105,180,0.4)' :
                                hoveredElement === 'water' ? 'rgba(0,191,255,0.4)' :
                                hoveredElement === 'lightning' ? 'rgba(255,215,0,0.4)' : 'transparent',
                    background: hoveredElement === 'darkness' ? 'rgba(255,255,255,0.1)' :
                               hoveredElement === 'heart' ? 'rgba(255,105,180,0.1)' :
                               hoveredElement === 'water' ? 'rgba(0,191,255,0.1)' :
                               hoveredElement === 'lightning' ? 'rgba(255,215,0,0.1)' : 'transparent',
                    boxShadow: hoveredElement === 'darkness' ? '0 0 15px rgba(255,255,255,0.3)' :
                              hoveredElement === 'heart' ? '0 0 15px rgba(255,105,180,0.3)' :
                              hoveredElement === 'water' ? '0 0 15px rgba(0,191,255,0.3)' :
                              hoveredElement === 'lightning' ? '0 0 15px rgba(255,215,0,0.3)' : 'none',
                    marginBottom: '16px'
                  }}
                >
                  <div 
                    style={{ 
                      color: hoveredElement === 'darkness' ? '#FFFFFF' :
                             hoveredElement === 'heart' ? '#FF69B4' :
                             hoveredElement === 'water' ? '#00BFFF' :
                             hoveredElement === 'lightning' ? '#FFD700' : '#FFFFFF',
                      fontWeight: 'bold',
                      marginBottom: '8px',
                      fontSize: '16px',
                      textShadow: hoveredElement === 'darkness' ? '0 0 8px rgba(255,255,255,0.8)' :
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
                      fontSize: '12px',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      lineHeight: '1.3'
                    }}
                  >
                    {hoveredElement === 'darkness' ? 'Mystery & Transformation' :
                     hoveredElement === 'heart' ? 'HEART embodies emotion, vulnerability, and connection. It symbolizes love, compassion, and the courage to stay open. HEART songs are tender, raw, and real, pulling you into the spaces where feeling becomes truth and connection begins.' :
                     hoveredElement === 'water' ? 'Flow & Adaptation' :
                     hoveredElement === 'lightning' ? 'LIGHTNING holds energy, passion, and awakening. It represents breakthroughs, inspiration, and sudden clarity. These songs are fast, alive, and electric, striking with intensity and capturing the rush of change when everything shifts at once.' : ''}
                  </div>
                </div>
              )}
              
              {/* Selected Element Display */}
              {selectedElement && (
                <div 
                  className="text-center p-2 rounded-lg border-2 mb-2 overflow-auto flex-1"
                  style={{ 
                    borderColor: selectedElement === 'darkness' ? 'rgba(255,255,255,0.6)' :
                                selectedElement === 'heart' ? 'rgba(255,105,180,0.6)' :
                                selectedElement === 'water' ? 'rgba(0,191,255,0.6)' :
                                selectedElement === 'lightning' ? 'rgba(255,215,0,0.6)' : 'transparent',
                    background: selectedElement === 'darkness' ? 'rgba(255,255,255,0.15)' :
                               selectedElement === 'heart' ? 'rgba(255,105,180,0.15)' :
                               selectedElement === 'water' ? 'rgba(0,191,255,0.15)' :
                               selectedElement === 'lightning' ? 'rgba(255,215,0,0.15)' : 'transparent',
                    boxShadow: selectedElement === 'darkness' ? '0 0 20px rgba(255,255,255,0.4)' :
                              selectedElement === 'heart' ? '0 0 20px rgba(255,105,180,0.4)' :
                              selectedElement === 'water' ? '0 0 20px rgba(0,191,255,0.4)' :
                              selectedElement === 'lightning' ? '0 0 20px rgba(255,215,0,0.4)' : 'none',
                    minHeight: 0
                  }}
                >
                  <div 
                    style={{ 
                      color: selectedElement === 'darkness' ? '#FFFFFF' :
                             selectedElement === 'heart' ? '#FF69B4' :
                             selectedElement === 'water' ? '#00BFFF' :
                             selectedElement === 'lightning' ? '#FFD700' : '#FFFFFF',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      marginBottom: '8px',
                      textShadow: selectedElement === 'darkness' ? '0 0 10px rgba(255,255,255,1)' :
                                 selectedElement === 'heart' ? '0 0 10px rgba(255,105,180,1)' :
                                 selectedElement === 'water' ? '0 0 10px rgba(0,191,255,1)' :
                                 selectedElement === 'lightning' ? '0 0 10px rgba(255,215,0,1)' : 'none'
                    }}
                  >
                    {selectedElement === 'heart' ? 'Heart = love and connection' : 
                     selectedElement === 'lightning' ? 'Lightning = passion and courage' :
                     selectedElement === 'water' ? 'Water = emotional truth and authenticity' :
                     selectedElement === 'darkness' ? 'Darkness = honesty about pain, imperfection, and inner worlds' : `SELECTED: ${selectedElement.toUpperCase()}`}
                  </div>
                  <div 
                    style={{ 
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '11px',
                      textShadow: 'none',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      lineHeight: '1.3',
                      maxHeight: '100px',
                      overflow: 'auto'
                    }}
                  >
                    {selectedElement === 'lightning' ? 
                      'LIGHTNING holds energy, passion, and awakening. It represents breakthroughs, inspiration, and sudden clarity. These songs are fast, alive, and electric, striking with intensity and capturing the rush of change when everything shifts at once.' :
                      selectedElement === 'heart' ? 
                      'HEART embodies emotion, vulnerability, and connection. It symbolizes love, compassion, and the courage to stay open. HEART songs are tender, raw, and real, pulling you into the spaces where feeling becomes truth and connection begins.' :
                      selectedElement === 'water' ?
                      'Soft yet powerful, WATER represents flow, adaptability, and emotional depth. It carries themes of change, healing, and trusting life\'s current. WATER songs move like tides, calm and cleansing, inviting you to release control and let the moment guide you.' :
                      selectedElement === 'darkness' ?
                      'DARKNESS carries mystery, shadow, and transformation. It symbolizes the unknown and the growth that rises from struggle. These songs dive into heartbreak, isolation, and truth, revealing that darkness is not the enemy but the place where transformation starts and light returns.' :
                      `You have chosen the path of ${selectedElement}. This element will guide your journey through the Heartverse.`
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  );
}
