"use client";

export default function DevBadge() {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        right: 8,
        zIndex: 9999,
        padding: "0.25rem 0.5rem",
        background: "rgba(220,38,38,0.9)",
        color: "white",
        fontSize: "0.75rem",
        borderRadius: "0.25rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        userSelect: "none",
      }}
      title="Development mode"
    >
      DEV
    </div>
  );
}

