"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

type SpecialBackgroundProps = {
  enabled: boolean;
};

type Petal = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotate: number;
  rotateSpeed: number;
  alpha: number;
};

type Sparkle = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkle: number;
};

export default function SpecialBackground({ enabled }: SpecialBackgroundProps) {
  const reduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const petalsRef = useRef<Petal[]>([]);
  const sparklesRef = useRef<Sparkle[]>([]);

  useEffect(() => {
    if (!enabled || reduceMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const spawnPetal = (): Petal => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: -0.3 + Math.random() * 0.6,
      vy: 0.3 + Math.random() * 0.8,
      size: 8 + Math.random() * 10,
      rotate: Math.random() * Math.PI,
      rotateSpeed: -0.01 + Math.random() * 0.02,
      alpha: 0.4 + Math.random() * 0.4,
    });

    const spawnSparkle = (): Sparkle => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: 1 + Math.random() * 2,
      alpha: 0.2 + Math.random() * 0.6,
      twinkle: 0.005 + Math.random() * 0.01,
    });

    const initParticles = () => {
      petalsRef.current = Array.from({ length: 28 }, spawnPetal);
      sparklesRef.current = Array.from({ length: 40 }, spawnSparkle);
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      sparklesRef.current.forEach((sparkle) => {
        sparkle.alpha += sparkle.twinkle * (Math.random() > 0.5 ? 1 : -1);
        sparkle.alpha = Math.min(0.9, Math.max(0.1, sparkle.alpha));
        ctx.fillStyle = `rgba(255, 255, 255, ${sparkle.alpha})`;
        ctx.beginPath();
        ctx.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      petalsRef.current.forEach((petal) => {
        petal.x += petal.vx;
        petal.y += petal.vy;
        petal.rotate += petal.rotateSpeed;

        if (petal.y > window.innerHeight + 20) {
          petal.y = -20;
          petal.x = Math.random() * window.innerWidth;
        }
        if (petal.x < -20) petal.x = window.innerWidth + 20;
        if (petal.x > window.innerWidth + 20) petal.x = -20;

        ctx.save();
        ctx.translate(petal.x, petal.y);
        ctx.rotate(petal.rotate);
        ctx.fillStyle = `rgba(255, 182, 193, ${petal.alpha})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, petal.size * 0.6, petal.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animationRef.current = requestAnimationFrame(render);
    };

    resize();
    initParticles();
    animationRef.current = requestAnimationFrame(render);

    window.addEventListener("resize", resize);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener("resize", resize);
    };
  }, [enabled, reduceMotion]);

  if (!enabled || reduceMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  );
}
