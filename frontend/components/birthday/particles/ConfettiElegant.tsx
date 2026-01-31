"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const CONFETTI_COUNT = 18;

export default function ConfettiElegant() {
  const pieces = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 6 + Math.random() * 4,
        size: 6 + Math.random() * 6,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          className="absolute rounded-[2px] bg-white/80 shadow-sm"
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size * 1.6}px`,
            top: "-10%",
          }}
          animate={{ y: ["-10%", "110%"], rotate: [0, 180] }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
