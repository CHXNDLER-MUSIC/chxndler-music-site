"use client";

export default function NoActiveVoteMessage() {
  return (
    <div className="text-center pt-4 border-t border-white/10">
      <p 
        className="text-lg font-bold mb-2"
        style={{
          color: '#F2EF1D',
          textShadow: '0 0 8px rgba(242, 239, 29, 0.6)'
        }}
      >
        No Active Vote
      </p>
      <p className="text-white/60 text-sm">
        Check back soon for the next song voting session!
      </p>
    </div>
  );
}