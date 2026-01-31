"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const STAR_COUNT = 16;

export default function StarsIdol() {
  const stars = useMemo(
    () =>
      Array.from({ length: STAR_COUNT }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 5 + Math.random() * 4,
        size: 10 + Math.random() * 8,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((star) => (
        <motion.span
          key={star.id}
          className="absolute text-amber-200/90 drop-shadow"
          style={{ left: `${star.left}%`, top: "110%" }}
          animate={{ y: ["110%", "-10%"], rotate: [0, 180] }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            ease: "easeInOut",
          }}
        >
          <Star style={{ width: star.size, height: star.size }} />
        </motion.span>
      ))}
    </div>
  );
}
