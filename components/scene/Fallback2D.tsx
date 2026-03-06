'use client';

import { useEffect, useRef } from 'react';
import { PaperPreset } from '@/lib/types';
import { applyPaperEffect } from '@/lib/image';

interface Fallback2DProps {
  preset: PaperPreset;
  uploadedImage: string;
  paperAge: number;
  paperColor: string;
  printStrength: number;
  grain: number;
  mosaicFading: number;
}

export default function Fallback2D({
  preset,
  uploadedImage,
  paperAge,
  paperColor,
  printStrength,
  grain,
  mosaicFading,
}: Fallback2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !uploadedImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Set canvas size to match image
      const maxSize = 1200;
      let width = img.width;
      let height = img.height;

      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);

      const processed = applyPaperEffect(
        imageData,
        preset,
        paperAge,
        paperColor,
        printStrength,
        grain,
        mosaicFading
      );

      ctx.putImageData(processed, 0, 0);
    };

    img.src = uploadedImage;
  }, [uploadedImage, preset, paperAge, paperColor, printStrength, grain, mosaicFading]);

  return (
    <div className="flex items-center justify-center h-full bg-white p-8">
      <div className="max-w-4xl max-h-full flex flex-col items-center gap-4">
        <div className="text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
          WebGL is not supported. Showing 2D preview.
        </div>
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full shadow-lg"
          style={{
            boxShadow: '0 10px 40px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
          }}
        />
      </div>
    </div>
  );
}
