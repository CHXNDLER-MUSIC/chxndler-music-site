"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
};

export default function NameInputModal({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      await onSubmit(name.trim());
      onClose();
      try { window.dispatchEvent(new CustomEvent('heartverse:entered')); } catch {}
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Hologram base glow */}
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{
          zIndex: 2147483648,
          pointerEvents: 'none',
          paddingTop: '200px'
        }}
      >
        <div
          style={{
            width: 'min(120vw, 700px)',
            height: '200px',
            background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(0,255,255,0.7) 0%, rgba(0,255,255,0.4) 30%, rgba(0,255,255,0.1) 60%, transparent 100%)',
            filter: 'blur(100px)'
          }}
        />
      </div>
      
      {/* Name Input Modal - holographic popup */}
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{
          zIndex: 2147483648,
          marginTop: '-120px'
        }}
      >
        <div
          className="name-modal-container"
          style={{
            width: 'min(92vw, 600px)',
            minHeight: '30vh',
            padding: '10px 14px 14px 14px',
            borderRadius: 18,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(0,255,255,0.55)',
            boxShadow: '0 -8px 25px rgba(0,255,255,0.4), 0 -4px 15px rgba(0,255,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(0,255,255,0.45)',
            backdropFilter: 'blur(12px) saturate(140%)',
            color: '#00FFFF',
            position: 'relative'
          }}
        >
        {/* Soft bottom glow */}
        <div 
          className="absolute"
          style={{
            bottom: '-15px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '120%',
            height: '30px',
            background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(0,255,255,0.6) 0%, rgba(0,255,255,0.3) 40%, transparent 80%)',
            filter: 'blur(30px)',
            pointerEvents: 'none',
            zIndex: -1
          }}
        />
        
        {/* Top bloom glow */}
        <div 
          className="absolute"
          style={{
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            height: '20px',
            background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(0,255,255,0.4) 0%, rgba(0,255,255,0.2) 50%, transparent 100%)',
            filter: 'blur(25px)',
            pointerEvents: 'none',
            zIndex: -1
          }}
        />

        {/* Header */}
        <div 
          className="text-center mb-6"
          style={{ 
            color: '#00FFFF', 
            textShadow: '0 0 8px rgba(0,255,255,0.6)', 
            fontSize: '18px',
            fontWeight: 'bold'
          }}
        >
          WHAT SHOULD WE CALL YOU?
        </div>
        
        {/* Thin neon line */}
        <div 
          className="w-full h-px mb-6"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.8) 20%, rgba(0,255,255,1) 50%, rgba(0,255,255,0.8) 80%, transparent)',
            boxShadow: '0 0 4px rgba(0,255,255,0.6)'
          }}
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Input */}
          <div>
            <label htmlFor="name-input" className="block text-sm font-medium text-center mb-3" style={{ color: '#00FFFF', textShadow: '0 0 4px rgba(0,255,255,0.6)' }}>
              Enter your name
            </label>
            <input
              id="name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              disabled={loading}
              className="block w-full rounded-md border px-3 py-3 text-sm shadow-sm focus:outline-none disabled:opacity-50"
              style={{
                border: '1px solid rgba(0,255,255,0.4)',
                background: 'rgba(0,0,0,0.3)',
                color: '#00FFFF',
                textShadow: '0 0 4px rgba(0,255,255,0.6)',
                backdropFilter: 'blur(4px)',
                textAlign: 'center'
              }}
              autoFocus
            />
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-medium transition disabled:opacity-50"
            style={{
              background: 'rgba(0,255,255,0.15)',
              border: '1px solid rgba(0,255,255,0.5)',
              color: '#00FFFF',
              textShadow: '0 0 8px rgba(0,255,255,0.8), 0 0 16px rgba(0,255,255,0.6), 0 0 24px rgba(0,255,255,0.4)',
              boxShadow: loading || !name.trim()
                ? 'none' 
                : '0 0 15px rgba(0,255,255,0.4), 0 0 25px rgba(0,255,255,0.2)'
            }}
          >
            {loading ? "UPDATING..." : "ENTER THE HEARTVERSE"}
          </button>
        </form>
        </div>
      </div>
    </>,
    document.body
  );
}
