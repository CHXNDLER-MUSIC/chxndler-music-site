"use client";

export default function NoActiveVoteMessage() {
  return (
    <div className="text-center pt-2 border-t border-white/10">
      <p 
        className="text-lg font-bold mb-2"
        style={{
          color: '#F2EF1D',
          textShadow: '0 0 8px rgba(242, 239, 29, 0.6)'
        }}
      >
        No Active Vote
      </p>
    </div>
  );
}