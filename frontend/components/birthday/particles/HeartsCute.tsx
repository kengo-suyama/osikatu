"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

const HEART_COUNT = 18;

export default function HeartsCute() {
  const hearts = useMemo(
    () =>
      Array.from({ length: HEART_COUNT }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        duration: 5 + Math.random() * 4,
        size: 10 + Math.random() * 8,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {hearts.map((heart) => (
        <motion.span
          key={heart.id}
          className="absolute text-rose-300/90 drop-shadow"
          style={{ left: `${heart.left}%`, top: "110%" }}
          animate={{ y: ["110%", "-10%"], rotate: [0, -20, 20, 0] }}
          transition={{
            duration: heart.duration,
            delay: heart.delay,
            ease: "easeInOut",
          }}
        >
          <Heart style={{ width: heart.size, height: heart.size }} />
        </motion.span>
      ))}
    </div>
  );
}
