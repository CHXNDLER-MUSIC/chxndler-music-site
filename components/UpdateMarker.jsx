export default function UpdateMarker() {
  const show =
    process.env.NEXT_PUBLIC_UPDATE_MARKER === "1" ||
    process.env.NODE_ENV !== "production";

  if (!show) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 80,
        height: 80,
        borderRadius: "50%",
        backgroundColor: "#a855f7", // purple-500
        boxShadow: "0 0 20px rgba(168, 85, 247, 0.7)",
        opacity: 0.9,
        zIndex: 99999,
        pointerEvents: "none",
      }}
    />
  );
}

