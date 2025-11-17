"use client";

import { motion } from 'framer-motion';
import { sfx } from '@/lib/sfx';

interface HeartCardSuccessProps {
  isOpen: boolean;
  onClose: () => void;
  shippingAddress?: {
    fullName: string;
    streetAddress: string;
    apartment?: string;
    city: string;
    stateRegion: string;
    zipPostal: string;
    country: string;
  };
}

export default function HeartCardSuccess({
  isOpen,
  onClose,
  shippingAddress
}: HeartCardSuccessProps) {
  
  const handleClose = () => {
    try { sfx.play('close', 0.4); } catch {}
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative w-full max-w-md bg-black/90 backdrop-blur-lg border border-[#19E3FF]/60 rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.35)] text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#19E3FF]/20 via-transparent to-[#FC54AF]/20 pointer-events-none" />
        
        {/* Content */}
        <div className="relative p-8 text-center">
          {/* Success icon */}
          <div className="mb-6 flex justify-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle, rgba(25,227,255,0.3), rgba(25,227,255,0.1))',
                boxShadow: '0 0 20px rgba(25,227,255,0.8), 0 0 40px rgba(25,227,255,0.6)'
              }}
            >
              <svg 
                className="w-8 h-8 text-[#19E3FF]" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
          </div>

          {/* Success message */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#19E3FF] mb-3">
              Thank you!
            </h2>
            <p className="text-lg text-[#CFF7FF] leading-relaxed">
              Your Heart Card is on its way
            </p>
          </div>

          {/* Shipping address summary */}
          {shippingAddress && (
            <div className="mb-6 p-4 bg-black/40 border border-[#19E3FF]/20 rounded-lg">
              <h3 className="text-sm font-semibold text-[#9EEBFF] mb-2">Shipping to:</h3>
              <div className="text-sm text-[#CFF7FF] space-y-1 text-left">
                <div className="font-medium">{shippingAddress.fullName}</div>
                <div>{shippingAddress.streetAddress}</div>
                {shippingAddress.apartment && (
                  <div>{shippingAddress.apartment}</div>
                )}
                <div>
                  {shippingAddress.city}, {shippingAddress.stateRegion} {shippingAddress.zipPostal}
                </div>
                <div>{shippingAddress.country}</div>
              </div>
            </div>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            onMouseEnter={() => { try { sfx.play('hover', 0.45); } catch {} }}
            className="w-full py-3 px-6 rounded-lg font-bold text-black bg-gradient-to-r from-[#F2EF1D] to-[#FFC700] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(242,239,29,0.8)]"
            style={{
              boxShadow: '0 0 20px rgba(242,239,29,0.6), inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -8px 16px rgba(0,0,0,0.22)'
            }}
          >
            Continue
          </button>
        </div>

        {/* Floating particles effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-[#19E3FF]/60 rounded-full"
              initial={{
                x: Math.random() * 100 + '%',
                y: '100%',
                opacity: 0
              }}
              animate={{
                y: '-20%',
                opacity: [0, 1, 0],
                scale: [0, 1, 0]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}