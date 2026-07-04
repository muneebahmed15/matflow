'use client';

import { useRef } from 'react';

type Props = {
  gymName: string;
  tagline?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  headline: string;
};

export default function SocialPromoExporter({
  gymName,
  tagline,
  logoUrl,
  primaryColor,
  headline,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const exportImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 1080;
    const h = 1080;
    canvas.width = w;
    canvas.height = h;

    const accent = primaryColor && /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : '#2563eb';
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, w, 12);

    if (logoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('logo load failed'));
          img.src = logoUrl;
        });
        ctx.drawImage(img, w / 2 - 80, 120, 160, 160);
      } catch {
        // Skip logo if CORS blocks remote image.
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.textAlign = 'center';
    wrapText(ctx, gymName, w / 2, 340, w - 120, 64);

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '32px system-ui, sans-serif';
    wrapText(ctx, headline, w / 2, 520, w - 120, 40);

    if (tagline) {
      ctx.fillStyle = accent;
      ctx.font = '28px system-ui, sans-serif';
      wrapText(ctx, tagline, w / 2, 720, w - 120, 36);
    }

    ctx.fillStyle = '#666666';
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText('Book your free trial today', w / 2, h - 80);

    const link = document.createElement('a');
    link.download = `${gymName.replace(/\s+/g, '-').toLowerCase()}-promo.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} className="hidden" />
      <button
        type="button"
        onClick={() => void exportImage()}
        className="bg-white/10 hover:bg-white/15 text-white text-sm font-semibold px-4 py-2 rounded-xl"
      >
        Export branded promo image (PNG)
      </button>
    </div>
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let offsetY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, offsetY);
      line = word;
      offsetY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, offsetY);
}
