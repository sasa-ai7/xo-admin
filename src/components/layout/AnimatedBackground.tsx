import { useEffect, useRef } from 'react';

interface XOSymbol {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  type: 'X' | 'O';
  /** RGB triplet string, e.g. "85, 214, 255". */
  color: string;
}

// Cyan / electric-blue / violet — violet appears least often (accent).
const SYMBOL_PALETTE = [
  '85, 214, 255',
  '56, 189, 248',
  '85, 214, 255',
  '167, 139, 250',
];

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const symbols: XOSymbol[] = [];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SYMBOL_COUNT = reduceMotion ? 14 : 38;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function initSymbols() {
      symbols.length = 0;
      for (let i = 0; i < SYMBOL_COUNT; i++) {
        symbols.push({
          x: Math.random() * (canvas?.width || 1920),
          y: Math.random() * (canvas?.height || 1080),
          size: Math.random() * 22 + 14,
          speed: Math.random() * 0.35 + 0.12,
          opacity: Math.random() * 0.08 + 0.022,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.005,
          type: Math.random() > 0.5 ? 'X' : 'O',
          color: SYMBOL_PALETTE[Math.floor(Math.random() * SYMBOL_PALETTE.length)],
        });
      }
    }

    function drawX(x: number, y: number, size: number, rotation: number, opacity: number, color: string) {
      if (!ctx) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.strokeStyle = `rgba(${color}, ${opacity})`;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.shadowColor = `rgba(${color}, ${Math.min(opacity * 1.55, 0.24)})`;
      ctx.shadowBlur = 9;
      const half = size / 2;
      ctx.beginPath();
      ctx.moveTo(-half, -half);
      ctx.lineTo(half, half);
      ctx.moveTo(half, -half);
      ctx.lineTo(-half, half);
      ctx.stroke();
      ctx.restore();
    }

    function drawO(x: number, y: number, size: number, rotation: number, opacity: number, color: string) {
      if (!ctx) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.strokeStyle = `rgba(${color}, ${opacity})`;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = `rgba(${color}, ${Math.min(opacity * 1.35, 0.2)})`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const s of symbols) {
        if (s.type === 'X') {
          drawX(s.x, s.y, s.size, s.rotation, s.opacity, s.color);
        } else {
          drawO(s.x, s.y, s.size, s.rotation, s.opacity, s.color);
        }

        if (!reduceMotion) {
          s.x += Math.sin((s.y + s.rotation * 100) * 0.01) * 0.08;
          s.y -= s.speed;
          s.rotation += s.rotationSpeed;
        }

        if (s.y < -s.size) {
          s.y = canvas.height + s.size;
          s.x = Math.random() * canvas.width;
        }
      }

      if (!reduceMotion) animationId = requestAnimationFrame(draw);
    }

    resize();
    initSymbols();
    draw();

    const handleResize = () => {
      resize();
      initSymbols();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <>
      <div className="xo-app-bg pointer-events-none fixed inset-0 z-0" />
      <div className="xo-bg-grid pointer-events-none fixed inset-0 z-0 opacity-60" />
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0 opacity-90"
      />
      {/* Slow diagonal neon streaks — purely decorative, disabled for reduced motion. */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden motion-reduce:hidden">
        <div
          className="absolute -inset-1/4 h-1/2 w-[140%] rotate-[8deg] bg-[linear-gradient(90deg,transparent,rgba(85,214,255,0.06),transparent)] blur-2xl"
          style={{ animation: 'xo-neon-streak 17s linear infinite' }}
        />
        <div
          className="absolute -inset-1/4 h-1/2 w-[140%] rotate-[8deg] bg-[linear-gradient(90deg,transparent,rgba(167,139,250,0.05),transparent)] blur-2xl"
          style={{ animation: 'xo-neon-streak 23s linear infinite', animationDelay: '6s' }}
        />
      </div>
    </>
  );
}
