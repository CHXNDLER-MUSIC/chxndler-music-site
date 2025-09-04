"use client";

export default function SocialButtons() {
  const buttons = [
    {
      id: "instagram",
      href: "https://www.instagram.com/chxndler_music/",
      color: "#FC54AF",
      // Moved slightly up
      pos: "top-[24%] left-[6%] rotate-2", // adjust for perfect alignment
      icon: "📸",
    },
    {
      id: "tiktok",
      href: "https://www.tiktok.com/@chxndler_music",
      color: "#ffffff",
      pos: "top-[38%] left-[6%] -rotate-1",
      icon: "🎵",
    },
    {
      id: "youtube",
      href: "https://www.youtube.com/@chxndler_music",
      color: "#FF0000",
      // Nudged slightly to the right
      pos: "top-[50%] left-[8%] rotate-1",
      icon: "▶️",
    },
  ];

  return (
    <div className="absolute inset-0 z-40 pointer-events-none">
      {buttons.map((b) => (
        <a
          key={b.id}
          href={b.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`pointer-events-auto absolute ${b.pos} flex h-12 w-12 items-center justify-center rounded-xl`}
          style={{
            background: `${b.color}22`,
            // Remove rim border for Instagram specifically
            border: b.id === "instagram" ? "none" : `1px solid ${b.color}55`,
            boxShadow: `0 0 22px ${b.color}aa, inset 0 0 12px ${b.color}44`,
            transformOrigin: "center",
          }}
        >
          <span className="text-2xl select-none">{b.icon}</span>
        </a>
      ))}
    </div>
  );
}
