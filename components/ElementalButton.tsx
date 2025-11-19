"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { sfx } from "@/lib/sfx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  onHoverSound?: () => void;
  onCloseBlueDisplay?: () => void;
  onOpenBlueDisplay?: () => void;
  onBeamColorChange?: (color: string) => void;
};

export default function ElementalButton({ asChild = false, children, onClick, onHoverSound, onCloseBlueDisplay, onOpenBlueDisplay, onBeamColorChange, ...rest }: Props) {
  const [open, setOpen] = useState(false);
  
  // Pong game state
  const [showPong, setShowPong] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 50 });
  const [ballVelocity, setBallVelocity] = useState({ x: 2, y: 1.5 });
  const [paddlePosition, setPaddlePosition] = useState(50);
  const [score, setScore] = useState(0);
  const [activeQuadrant, setActiveQuadrant] = useState<string | null>(null);
  const [gameRunning, setGameRunning] = useState(false);
  const pongRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>;

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

  // Pong game logic
  const startPong = useCallback(() => {
    setShowPong(true);
    setGameRunning(true);
    setBallPosition({ x: 50, y: 50 });
    setBallVelocity({ x: Math.random() > 0.5 ? 2 : -2, y: Math.random() > 0.5 ? 1.5 : -1.5 });
    setScore(0);
    setActiveQuadrant(null);
  }, []);

  const stopPong = useCallback(() => {
    setGameRunning(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  // Determine which quadrant the ball is in
  const getQuadrant = useCallback((x: number, y: number) => {
    if (x < 50 && y < 50) return 'darkness'; // top-left
    if (x >= 50 && y < 50) return 'heart'; // top-right
    if (x < 50 && y >= 50) return 'water'; // bottom-left
    if (x >= 50 && y >= 50) return 'lightning'; // bottom-right
    return null;
  }, []);

  // Pong animation loop
  const animatePong = useCallback(() => {
    if (!gameRunning) return;

    setBallPosition(prev => {
      const newX = prev.x + ballVelocity.x;
      const newY = prev.y + ballVelocity.y;
      
      let newVelX = ballVelocity.x;
      let newVelY = ballVelocity.y;
      
      // Bounce off walls
      if (newX <= 2 || newX >= 98) {
        newVelX = -newVelX;
        try { sfx.play('hover', 0.3); } catch {}
      }
      if (newY <= 2 || newY >= 98) {
        newVelY = -newVelY;
        try { sfx.play('hover', 0.3); } catch {}
      }
      
      setBallVelocity({ x: newVelX, y: newVelY });
      
      const constrainedX = Math.max(2, Math.min(98, newX));
      const constrainedY = Math.max(2, Math.min(98, newY));
      
      // Check quadrant
      const currentQuadrant = getQuadrant(constrainedX, constrainedY);
      if (currentQuadrant !== activeQuadrant) {
        setActiveQuadrant(currentQuadrant);
        if (currentQuadrant) {
          try { sfx.play('click', 0.4); } catch {}
          setScore(prev => prev + 1);
        }
      }
      
      return { x: constrainedX, y: constrainedY };
    });

    animationRef.current = requestAnimationFrame(animatePong);
  }, [gameRunning, ballVelocity, activeQuadrant, getQuadrant]);

  // Handle mouse movement for paddle (if needed)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!gameRunning || !pongRef.current) return;
    
    const rect = pongRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
    setPaddlePosition(Math.max(10, Math.min(90, mouseX)));
  }, [gameRunning]);

  // Start animation when game starts
  useEffect(() => {
    if (gameRunning) {
      animationRef.current = requestAnimationFrame(animatePong);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameRunning, animatePong]);

  // Handle quadrant clicks
  const handleQuadrantClick = useCallback((quadrant: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try { sfx.play('click', 0.6); } catch {}
    
    // Display quadrant text based on element
    const quadrantTexts = {
      darkness: "🌑 DARKNESS: Mystery, shadow, and transformation. Growth rises from struggle.",
      heart: "🩷 HEART: Emotion, vulnerability, and connection. Love and compassion unite us.",
      lightning: "⚡ LIGHTNING: Energy, passion, and awakening. Sudden clarity strikes.",
      water: "💧 WATER: Flow, adaptability, and healing. Change moves like tides."
    };
    
    alert(quadrantTexts[quadrant as keyof typeof quadrantTexts] || "Unknown element");
  }, []);

  return (
    <>
      <button
        onClick={handleClick} 
        onMouseEnter={onHoverSound}
        className="p-1 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/20 w-12 h-10"
        style={{
          boxShadow: '0 0 20px rgba(147, 51, 234, 0.4), 0 0 40px rgba(147, 51, 234, 0.2)',
          transition: 'all 0.3s ease',
          ...rest.style
        }}
        onMouseEnter={(e) => {
          if (onHoverSound) onHoverSound();
          e.currentTarget.style.boxShadow = '0 0 30px rgba(147, 51, 234, 0.8), 0 0 50px rgba(147, 51, 234, 0.5), 0 0 70px rgba(147, 51, 234, 0.3)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 0 20px rgba(147, 51, 234, 0.4), 0 0 40px rgba(147, 51, 234, 0.2)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        {...rest}
      >
        <img
          src="/elements/elementals.png"
          alt="Elementals"
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
            ELEMENTAL POWERS
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
          <div className="text-center space-y-4">
            <div 
              className="text-sm mb-4"
              style={{ 
                color: '#E879F9', 
                textShadow: '0 0 4px rgba(232,121,249,0.6)' 
              }}
            >
              Harness the power of the elements within the Heartverse
            </div>
            
            {!showPong ? (
              <>
                {/* Element Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div 
                    className="p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-105"
                    style={{ 
                      borderColor: 'rgba(148,0,211,0.4)', 
                      background: 'rgba(148,0,211,0.1)',
                      boxShadow: '0 0 10px rgba(148,0,211,0.3)'
                    }}
                    onClick={(e) => handleQuadrantClick('darkness', e)}
                  >
                    <div style={{ color: '#9400D3', fontWeight: 'bold', marginBottom: '4px' }}>🌑 DARKNESS</div>
                    <div style={{ color: '#DDA0DD', fontSize: '12px' }}>Mystery & Transformation</div>
                  </div>
                  
                  <div 
                    className="p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-105"
                    style={{ 
                      borderColor: 'rgba(255,105,180,0.4)', 
                      background: 'rgba(255,105,180,0.1)',
                      boxShadow: '0 0 10px rgba(255,105,180,0.3)'
                    }}
                    onClick={(e) => handleQuadrantClick('heart', e)}
                  >
                    <div style={{ color: '#FF69B4', fontWeight: 'bold', marginBottom: '4px' }}>🩷 HEART</div>
                    <div style={{ color: '#FFB4D6', fontSize: '12px' }}>Emotion & Connection</div>
                  </div>
                  
                  <div 
                    className="p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-105"
                    style={{ 
                      borderColor: 'rgba(0,191,255,0.4)', 
                      background: 'rgba(0,191,255,0.1)',
                      boxShadow: '0 0 10px rgba(0,191,255,0.3)'
                    }}
                    onClick={(e) => handleQuadrantClick('water', e)}
                  >
                    <div style={{ color: '#00BFFF', fontWeight: 'bold', marginBottom: '4px' }}>💧 WATER</div>
                    <div style={{ color: '#87CEEB', fontSize: '12px' }}>Flow & Adaptation</div>
                  </div>
                  
                  <div 
                    className="p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-105"
                    style={{ 
                      borderColor: 'rgba(255,215,0,0.4)', 
                      background: 'rgba(255,215,0,0.1)',
                      boxShadow: '0 0 10px rgba(255,215,0,0.3)'
                    }}
                    onClick={(e) => handleQuadrantClick('lightning', e)}
                  >
                    <div style={{ color: '#FFD700', fontWeight: 'bold', marginBottom: '4px' }}>⚡ LIGHTNING</div>
                    <div style={{ color: '#FFED4A', fontSize: '12px' }}>Energy & Speed</div>
                  </div>
                </div>

                {/* Pong Game Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startPong();
                  }}
                  className="w-full p-3 rounded-lg border-2 border-purple-500/50 bg-purple-600/20 hover:bg-purple-600/30 transition-all duration-200 hover:scale-105"
                  style={{
                    boxShadow: '0 0 15px rgba(147,51,234,0.5)',
                    color: '#E879F9',
                    fontWeight: 'bold'
                  }}
                >
                  🎮 PLAY ELEMENTAL PONG
                </button>
              </>
            ) : (
              <>
                {/* Pong Game Area */}
                <div
                  ref={pongRef}
                  className="relative w-full aspect-square border-2 border-purple-500/50 rounded-lg bg-black/30"
                  style={{
                    height: '280px',
                    boxShadow: '0 0 20px rgba(147,51,234,0.4), inset 0 0 20px rgba(147,51,234,0.2)'
                  }}
                  onMouseMove={handleMouseMove}
                >
                  {/* Quadrant backgrounds */}
                  <div 
                    className="absolute top-0 left-0 w-1/2 h-1/2 transition-all duration-200"
                    style={{ 
                      background: activeQuadrant === 'darkness' ? 'rgba(148,0,211,0.3)' : 'rgba(148,0,211,0.1)',
                      boxShadow: activeQuadrant === 'darkness' ? '0 0 20px rgba(148,0,211,0.6)' : 'none'
                    }}
                    onClick={(e) => handleQuadrantClick('darkness', e)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-purple-300 font-bold text-xs">
                      🌑 DARKNESS
                    </div>
                  </div>
                  <div 
                    className="absolute top-0 right-0 w-1/2 h-1/2 transition-all duration-200"
                    style={{ 
                      background: activeQuadrant === 'heart' ? 'rgba(255,105,180,0.3)' : 'rgba(255,105,180,0.1)',
                      boxShadow: activeQuadrant === 'heart' ? '0 0 20px rgba(255,105,180,0.6)' : 'none'
                    }}
                    onClick={(e) => handleQuadrantClick('heart', e)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-pink-300 font-bold text-xs">
                      🩷 HEART
                    </div>
                  </div>
                  <div 
                    className="absolute bottom-0 left-0 w-1/2 h-1/2 transition-all duration-200"
                    style={{ 
                      background: activeQuadrant === 'water' ? 'rgba(0,191,255,0.3)' : 'rgba(0,191,255,0.1)',
                      boxShadow: activeQuadrant === 'water' ? '0 0 20px rgba(0,191,255,0.6)' : 'none'
                    }}
                    onClick={(e) => handleQuadrantClick('water', e)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-blue-300 font-bold text-xs">
                      💧 WATER
                    </div>
                  </div>
                  <div 
                    className="absolute bottom-0 right-0 w-1/2 h-1/2 transition-all duration-200"
                    style={{ 
                      background: activeQuadrant === 'lightning' ? 'rgba(255,215,0,0.3)' : 'rgba(255,215,0,0.1)',
                      boxShadow: activeQuadrant === 'lightning' ? '0 0 20px rgba(255,215,0,0.6)' : 'none'
                    }}
                    onClick={(e) => handleQuadrantClick('lightning', e)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-yellow-300 font-bold text-xs">
                      ⚡ LIGHTNING
                    </div>
                  </div>

                  {/* Dividing lines */}
                  <div className="absolute top-0 left-1/2 w-px h-full bg-purple-400/30"></div>
                  <div className="absolute top-1/2 left-0 w-full h-px bg-purple-400/30"></div>

                  {/* Ball */}
                  <div
                    className="absolute w-3 h-3 bg-white rounded-full transition-all duration-75"
                    style={{
                      left: `${ballPosition.x}%`,
                      top: `${ballPosition.y}%`,
                      transform: 'translate(-50%, -50%)',
                      boxShadow: '0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(147,51,234,0.6)',
                      background: activeQuadrant === 'darkness' ? '#9400D3' :
                                 activeQuadrant === 'heart' ? '#FF69B4' :
                                 activeQuadrant === 'water' ? '#00BFFF' :
                                 activeQuadrant === 'lightning' ? '#FFD700' : '#FFFFFF'
                    }}
                  />
                </div>

                {/* Game Controls */}
                <div className="flex justify-between items-center mt-4">
                  <div className="text-purple-300 font-bold">
                    Score: {score}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={stopPong}
                      className="px-3 py-1 bg-red-600/20 border border-red-500/40 rounded text-red-300 hover:bg-red-600/30 transition-all"
                    >
                      Stop
                    </button>
                    <button
                      onClick={() => {
                        setShowPong(false);
                        stopPong();
                      }}
                      className="px-3 py-1 bg-purple-600/20 border border-purple-500/40 rounded text-purple-300 hover:bg-purple-600/30 transition-all"
                    >
                      Back
                    </button>
                  </div>
                </div>

                {activeQuadrant && (
                  <div 
                    className="text-xs mt-2 p-2 rounded"
                    style={{ 
                      color: activeQuadrant === 'darkness' ? '#DDA0DD' :
                             activeQuadrant === 'heart' ? '#FFB4D6' :
                             activeQuadrant === 'water' ? '#87CEEB' :
                             activeQuadrant === 'lightning' ? '#FFED4A' : '#FFFFFF',
                      background: activeQuadrant === 'darkness' ? 'rgba(148,0,211,0.1)' :
                                 activeQuadrant === 'heart' ? 'rgba(255,105,180,0.1)' :
                                 activeQuadrant === 'water' ? 'rgba(0,191,255,0.1)' :
                                 activeQuadrant === 'lightning' ? 'rgba(255,215,0,0.1)' : 'transparent',
                      border: `1px solid ${activeQuadrant === 'darkness' ? 'rgba(148,0,211,0.3)' :
                                          activeQuadrant === 'heart' ? 'rgba(255,105,180,0.3)' :
                                          activeQuadrant === 'water' ? 'rgba(0,191,255,0.3)' :
                                          activeQuadrant === 'lightning' ? 'rgba(255,215,0,0.3)' : 'transparent'}`
                    }}
                  >
                    Ball in {activeQuadrant.toUpperCase()} quadrant
                  </div>
                )}
              </>
            )}
            
            <div 
              className="text-xs mt-4"
              style={{ 
                color: 'rgba(255,255,255,0.7)', 
                fontStyle: 'italic' 
              }}
            >
              Master your elemental affinity to unlock unique abilities and experiences
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  );
}