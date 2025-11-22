"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { supabaseClient } from "@/lib/supabaseClient";
import { useUIStore } from "@/store/useUIStore";
import { useProfile } from "@/contexts/ProfileContext";
import type { Element } from "@/lib/planets";
import { ELEMENT_COLORS } from "@/lib/planets";

const ELEMENTS: { key: Element; name: string; label: string; description: string; icon: string }[] = [
  { key: "heart", name: "HEART", label: "Heart", description: "Love, passion, and connection", icon: "/elements/heart.png" },
  { key: "lightning", name: "LIGHTNING", label: "Lightning", description: "Energy, power, and innovation", icon: "/elements/lightning.png" },
  { key: "water", name: "WATER", label: "Water", description: "Flow, adaptability, and depth", icon: "/elements/water.png" },
  { key: "darkness", name: "DARKNESS", label: "Darkness", description: "Mystery, introspection, and rebirth", icon: "/elements/darkness.png" },
];

export default function WhatElementAreYouModal() {
  const { showElementSelection, closeElementSelection, triggerProfileRefresh } = useUIStore();
  const { updateProfileNameAndElement, profile } = useProfile();
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedElement) return;
    
    const selectedElementData = ELEMENTS.find(el => el.key === selectedElement);
    if (!selectedElementData) return;
    
    const currentName = profile?.name;
    if (!currentName) {
      setError("Name is required. Please go back and enter your name first.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Use the new updateProfileNameAndElement method with pretty label
      await updateProfileNameAndElement(currentName, selectedElementData.label);
      
      console.log('🎉 Profile completed! Element selected:', selectedElementData.label);
      closeElementSelection();
      // Trigger profile refresh to update the UI with new element
      triggerProfileRefresh();
    } catch (e: any) {
      setError(e?.message || "Failed to save element selection");
    } finally {
      setLoading(false);
    }
  }

  if (!showElementSelection) return null;
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
      
      {/* Element Selection Modal */}
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{
          zIndex: 2147483648,
          marginTop: '-160px'
        }}
      >
        <div
          className="onboarding-hologram-container"
          style={{
            width: 'min(92vw, 600px)',
            minHeight: '40vh',
            padding: '20px 24px 24px 24px',
            borderRadius: 18,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(0,255,255,0.55)',
            boxShadow: '0 -8px 25px rgba(0,255,255,0.4), 0 -4px 15px rgba(0,255,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(0,255,255,0.45)',
            backdropFilter: 'blur(12px) saturate(140%)',
            color: '#00FFFF',
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
          className="text-center mb-4"
          style={{ 
            color: '#00FFFF', 
            textShadow: '0 0 8px rgba(0,255,255,0.6)', 
            fontSize: '18px',
            fontWeight: 'bold'
          }}
        >
          WHAT ELEMENT ARE YOU?
        </div>
        
        {/* Thin cyan neon line */}
        <div 
          className="w-full h-px mb-6"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.8) 20%, rgba(0,255,255,1) 50%, rgba(0,255,255,0.8) 80%, transparent)',
            boxShadow: '0 0 4px rgba(0,255,255,0.6)'
          }}
        />

        <p className="relative text-sm mb-2 text-center" style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0,255,255,0.6)' }}>
          Choose your elemental affinity in the Heartverse
        </p>
        
        <p className="relative text-xs mb-6 text-center" style={{ color: '#FFFFFF', textShadow: '0 0 4px rgba(255,255,255,0.6)' }}>
          You can change this later
        </p>

        {error && (
          <div className="relative mb-4 rounded-md bg-red-50/10 border border-red-200/40 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Element Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {ELEMENTS.map((element) => (
              <button
                key={element.key}
                type="button"
                onClick={() => setSelectedElement(element.key)}
                disabled={loading}
                className="p-4 rounded-lg border transition-all text-left disabled:opacity-50"
                style={{
                  border: selectedElement === element.key 
                    ? `2px solid ${element.key === 'darkness' ? '#FFFFFF' : ELEMENT_COLORS[element.key]}` 
                    : '1px solid rgba(0,255,255,0.3)',
                  background: selectedElement === element.key 
                    ? `${element.key === 'darkness' ? '#FFFFFF' : ELEMENT_COLORS[element.key]}20` 
                    : 'rgba(0,0,0,0.2)',
                  backdropFilter: 'blur(4px)',
                  boxShadow: selectedElement === element.key 
                    ? `0 0 15px ${element.key === 'darkness' ? '#FFFFFF' : ELEMENT_COLORS[element.key]}40` 
                    : 'none'
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <img 
                    src={element.icon} 
                    alt={element.name}
                    className="w-8 h-8"
                    style={{
                      filter: selectedElement === element.key 
                        ? `drop-shadow(0 0 4px ${element.key === 'darkness' ? '#FFFFFF' : ELEMENT_COLORS[element.key]})` 
                        : 'drop-shadow(0 0 2px #00FFFF)'
                    }}
                  />
                  <div 
                    className="font-medium"
                    style={{
                      color: selectedElement === element.key 
                        ? (element.key === 'darkness' ? '#FFFFFF' : ELEMENT_COLORS[element.key])
                        : '#00FFFF',
                      textShadow: `0 0 8px ${selectedElement === element.key 
                        ? (element.key === 'darkness' ? '#FFFFFF' : ELEMENT_COLORS[element.key])
                        : '#00FFFF'}60`
                    }}
                  >
                    {element.label}
                  </div>
                </div>
                <div 
                  className="text-xs"
                  style={{
                    color: selectedElement === element.key 
                      ? (element.key === 'darkness' ? '#FFFFFF' : ELEMENT_COLORS[element.key])
                      : '#00FFFF80',
                    textShadow: 'none'
                  }}
                >
                  {element.description}
                </div>
              </button>
            ))}
          </div>
          
          <button
            type="submit"
            disabled={loading || !selectedElement}
            className="w-full inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-medium transition disabled:opacity-50"
            style={{
              background: 'rgba(0,255,255,0.15)',
              border: '1px solid rgba(0,255,255,0.5)',
              color: '#00FFFF',
              textShadow: '0 0 8px rgba(0,255,255,0.8), 0 0 16px rgba(0,255,255,0.6), 0 0 24px rgba(0,255,255,0.4)',
              boxShadow: loading || !selectedElement
                ? 'none' 
                : '0 0 15px rgba(0,255,255,0.4), 0 0 25px rgba(0,255,255,0.2)'
            }}
          >
            {loading ? "SAVING..." : "ENTER THE HEARTVERSE"}
          </button>
        </form>
        </div>
      </div>
    </>,
    document.body
  );
}