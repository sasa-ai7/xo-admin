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
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const symbols: XOSymbol[] = [];
    const SYMBOL_COUNT = 42;

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
          opacity: Math.random() * 0.08 + 0.03,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.005,
          type: Math.random() > 0.5 ? 'X' : 'O',
        });
      }
    }

    function drawX(x: number, y: number, size: number, rotation: number, opacity: number) {
      if (!ctx) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.strokeStyle = `rgba(255, 85, 0, ${opacity})`;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.shadowColor = `rgba(255, 85, 0, ${Math.min(opacity * 1.4, 0.2)})`;
      ctx.shadowBlur = 6;
      const half = size / 2;
      ctx.beginPath();
      ctx.moveTo(-half, -half);
      ctx.lineTo(half, half);
      ctx.moveTo(half, -half);
      ctx.lineTo(-half, half);
      ctx.stroke();
      ctx.restore();
    }

    function drawO(x: number, y: number, size: number, rotation: number, opacity: number) {
      if (!ctx) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.strokeStyle = `rgba(255, 119, 51, ${opacity})`;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = `rgba(255, 119, 51, ${Math.min(opacity * 1.3, 0.16)})`;
      ctx.shadowBlur = 5;
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
          drawX(s.x, s.y, s.size, s.rotation, s.opacity);
        } else {
          drawO(s.x, s.y, s.size, s.rotation, s.opacity);
        }

        s.x += Math.sin((s.y + s.rotation * 100) * 0.01) * 0.08;
        s.y -= s.speed;
        s.rotation += s.rotationSpeed;

        if (s.y < -s.size) {
          s.y = canvas.height + s.size;
          s.x = Math.random() * canvas.width;
        }
      }

      animationId = requestAnimationFrame(draw);
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
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
