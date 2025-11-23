"use client";

interface TourReplayButtonProps {
  onReplayTour: () => void;
  className?: string;
}

export default function TourReplayButton({ onReplayTour, className = "" }: TourReplayButtonProps) {
  return (
    <button
      onClick={onReplayTour}
      className={`tour-replay-button text-white/70 hover:text-white transition-all duration-200 
                 text-sm underline decoration-cyan-400/50 hover:decoration-cyan-400 
                 underline-offset-4 ${className}`}
      style={{
        textShadow: '0 0 8px rgba(25,227,255,0.5)',
      }}
    >
      Show me around again
    </button>
  );
}