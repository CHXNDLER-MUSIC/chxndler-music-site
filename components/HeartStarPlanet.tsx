"use client";

import Image from "next/image";
import { motion } from "framer-motion";
// Use public asset path instead of missing import

export default function HeartStarPlanet({ size = 180 }: { size?: number }) {
  return (
    <motion.div
      className="relative flex items-center justify-center"
      animate={{
        y: [0, -6, 0],
        scale: [1, 1.04, 1],
        rotate: [-1.2, 1.2, -1.2],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Outer soft aura - largest */}
      <div
        className="absolute inset-[-40%] rounded-full blur-3xl opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(252,84,175,0.8), rgba(252,84,175,0.4), rgba(252,84,175,0.1), rgba(252,84,175,0))",
        }}
      />
      
      {/* Middle glow layer */}
      <div
        className="absolute inset-[-28%] rounded-full blur-2xl opacity-75"
        style={{
          background:
            "radial-gradient(circle, rgba(252,84,175,1), rgba(252,84,175,0.6), rgba(252,84,175,0.2), rgba(252,84,175,0))",
        }}
      />
      
      {/* Inner bright core */}
      <div
        className="absolute inset-[-16%] rounded-full blur-xl opacity-90"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.9), rgba(252,84,175,1), rgba(252,84,175,0.4), rgba(252,84,175,0))",
        }}
      />

      {/* Pulsing inner light */}
      <motion.div
        className="absolute inset-[-12%] rounded-full blur-lg"
        animate={{
          opacity: [0.6, 1, 0.6],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,1), rgba(252,84,175,0.8), rgba(252,84,175,0.3), rgba(252,84,175,0))",
        }}
      />

      {/* Solar ray effects - subtle */}
      <motion.div
        className="absolute inset-[-35%] opacity-30"
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          background: `conic-gradient(
            from 0deg,
            transparent 0deg,
            rgba(252,84,175,0.3) 10deg,
            transparent 20deg,
            transparent 40deg,
            rgba(252,84,175,0.2) 50deg,
            transparent 60deg,
            transparent 80deg,
            rgba(252,84,175,0.3) 90deg,
            transparent 100deg,
            transparent 120deg,
            rgba(252,84,175,0.2) 130deg,
            transparent 140deg,
            transparent 160deg,
            rgba(252,84,175,0.3) 170deg,
            transparent 180deg,
            transparent 200deg,
            rgba(252,84,175,0.2) 210deg,
            transparent 220deg,
            transparent 240deg,
            rgba(252,84,175,0.3) 250deg,
            transparent 260deg,
            transparent 280deg,
            rgba(252,84,175,0.2) 290deg,
            transparent 300deg,
            transparent 320deg,
            rgba(252,84,175,0.3) 330deg,
            transparent 340deg,
            transparent 360deg
          )`,
          borderRadius: '50%',
          filter: 'blur(8px)',
        }}
      />

      {/* The heart star image */}
      <motion.div
        className="relative z-10"
        animate={{
          filter: [
            "brightness(1.1) contrast(1.1) saturate(1.2)",
            "brightness(1.3) contrast(1.2) saturate(1.4)",
            "brightness(1.1) contrast(1.1) saturate(1.2)",
          ],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Image
          src="/textures/center-planet.webp"
          alt="Heart Star"
          width={size}
          height={size * 1.3}
          className="relative pointer-events-none select-none drop-shadow-2xl"
          style={{
            filter: "drop-shadow(0 0 20px rgba(252,84,175,0.8)) drop-shadow(0 0 40px rgba(252,84,175,0.4))",
          }}
          priority
        />
      </motion.div>

      {/* Additional antenna glow effects */}
      <motion.div
        className="absolute top-[-5%] left-1/2 transform -translate-x-1/2 w-2 h-8 opacity-80 z-5"
        animate={{
          opacity: [0.6, 1, 0.6],
          boxShadow: [
            "0 0 10px rgba(252,84,175,0.8)",
            "0 0 20px rgba(252,84,175,1)",
            "0 0 10px rgba(252,84,175,0.8)",
          ],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background: "linear-gradient(to top, rgba(252,84,175,0.6), rgba(255,255,255,1))",
          borderRadius: "50%",
          filter: "blur(2px)",
        }}
      />

      {/* Side antenna glows */}
      <motion.div
        className="absolute top-[15%] left-[25%] w-3 h-3 opacity-70 rounded-full"
        animate={{
          opacity: [0.5, 0.9, 0.5],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,1), rgba(252,84,175,0.8))",
          boxShadow: "0 0 15px rgba(252,84,175,0.9)",
        }}
      />

      <motion.div
        className="absolute top-[15%] right-[25%] w-3 h-3 opacity-70 rounded-full"
        animate={{
          opacity: [0.5, 0.9, 0.5],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,1), rgba(252,84,175,0.8))",
          boxShadow: "0 0 15px rgba(252,84,175,0.9)",
        }}
      />
    </motion.div>
  );
}
