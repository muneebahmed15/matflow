'use client';

import { useRef, useState } from 'react';

type Props = {
  memberName: string;
  onSign: (
    typedName: string,
    options?: {
      guardianName?: string;
      witnessName?: string;
      signatureImageDataUrl?: string;
      witnessSignatureDataUrl?: string;
    }
  ) => Promise<void>;
  alreadySigned?: boolean;
  signedAt?: string;
  requireGuardian?: boolean;
  allowWitness?: boolean;
};

function SignaturePad({
  label,
  onChange,
}: {
  label: string;
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    const pt = getPoint(e);
    if (!ctx || !pt) return;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    const pt = getPoint(e);
    if (!ctx || !pt) return;
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const endDraw = () => {
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-gray-400">{label}</p>
        <button type="button" onClick={clear} className="text-xs text-white/40 hover:text-white">
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={120}
        className="w-full rounded-lg border border-white/10 bg-black/30 touch-none cursor-crosshair"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
    </div>
  );
}

export default function WaiverSignatureBox({
  memberName,
  onSign,
  alreadySigned,
  signedAt,
  requireGuardian,
  allowWitness = true,
}: Props) {
  const [typedName, setTypedName] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [witnessSignature, setWitnessSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSign = async () => {
    if (typedName.trim().toLowerCase() !== memberName.trim().toLowerCase()) {
      setError('Name must match exactly as shown above.');
      return;
    }
    if (requireGuardian && !guardianName.trim()) {
      setError('A parent or guardian name is required for members under 18.');
      return;
    }
    if (!signatureImage) {
      setError('Please draw your signature in the box below.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSign(typedName.trim(), {
        guardianName: guardianName.trim() || undefined,
        witnessName: witnessName.trim() || undefined,
        signatureImageDataUrl: signatureImage,
        witnessSignatureDataUrl: witnessSignature ?? undefined,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign waiver.');
    } finally {
      setLoading(false);
    }
  };

  if (alreadySigned) {
    return (
      <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-5">
        <p className="text-green-400 font-semibold">✅ Waiver already signed</p>
        {signedAt && (
          <p className="text-sm text-gray-400 mt-1">
            Signed on {new Date(signedAt).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
      <div>
        <p className="text-sm text-gray-400 mb-1">
          Type your full name to sign:{' '}
          <span className="text-white font-semibold">{memberName}</span>
        </p>
        <input
          type="text"
          placeholder="Type your full name here"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <SignaturePad label="Draw your signature" onChange={setSignatureImage} />
      {requireGuardian && (
        <div>
          <p className="text-sm text-gray-400 mb-1">
            Parent / guardian full name (required for members under 18):
          </p>
          <input
            type="text"
            placeholder="Parent or guardian full name"
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
      {allowWitness && (
        <>
          <div>
            <p className="text-sm text-gray-400 mb-1">Witness name (optional):</p>
            <input
              type="text"
              placeholder="Witness full name"
              value={witnessName}
              onChange={(e) => setWitnessName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {witnessName.trim() && (
            <SignaturePad label="Witness signature (optional)" onChange={setWitnessSignature} />
          )}
        </>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        onClick={handleSign}
        disabled={loading || !typedName}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading ? 'Signing…' : 'I Agree & Sign Waiver'}
      </button>
      <p className="text-xs text-gray-500">
        By typing your name, drawing your signature, and clicking sign, you agree this constitutes a
        legally binding electronic signature under the E-SIGN Act.
      </p>
    </div>
  );
}
