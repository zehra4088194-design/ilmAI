'use client';
import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

/**
 * Lightweight animated particle field, drawn once behind all page content.
 * Only renders in dark mode (subtle "stars drifting" effect) — in light mode
 * it renders nothing, since a busy particle field reads as noise on a light
 * background. Mount this once near the root layout, e.g. right after <body>.
 */
export function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (resolvedTheme !== 'dark') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let animationFrame: number;

    const COUNT = Math.min(70, Math.floor((width * height) / 22000));
    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      radius: Math.random() * 1.6 + 0.4,
    }));

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      for (const p of particles) {
        if (!reduceMotion) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        }
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx!.fillStyle = 'rgba(167, 139, 250, 0.45)'; // violet-300, matches brand primary
        ctx!.fill();
      }
      // Faint connecting lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i]!.x - particles[j]!.x;
          const dy = particles[i]!.y - particles[j]!.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx!.beginPath();
            ctx!.moveTo(particles[i]!.x, particles[i]!.y);
            ctx!.lineTo(particles[j]!.x, particles[j]!.y);
            ctx!.strokeStyle = `rgba(139, 92, 246, ${0.12 * (1 - dist / 110)})`;
            ctx!.lineWidth = 1;
            ctx!.stroke();
          }
        }
      }
      animationFrame = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', onResize);
    };
  }, [resolvedTheme]);

  if (resolvedTheme !== 'dark') return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none opacity-70"
    />
  );
}
