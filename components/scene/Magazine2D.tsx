'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { PaperPreset } from '@/lib/types';

interface Magazine2DProps {
  preset: PaperPreset;
  uploadedImage: string | null;
  imageAspectRatio?: number;
  printStrength: number;
  glossStrength: number;
  canvasRef?: RefObject<HTMLCanvasElement | null>;
}

const loadImage = (src: string, maxWidth = Infinity, maxHeight = Infinity) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (img.width > maxWidth || img.height > maxHeight) {
        const canvas = document.createElement('canvas');
        const aspect = img.width / img.height;
        let width = Math.min(img.width, maxWidth);
        let height = Math.min(img.height, maxHeight);
        if (width / height > aspect) {
          width = height * aspect;
        } else {
          height = width / aspect;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(img);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const resized = new Image();
        resized.onload = () => resolve(resized);
        resized.onerror = reject;
        resized.src = canvas.toDataURL('image/png');
      } else {
        resolve(img);
      }
    };
    img.onerror = reject;
    img.src = src;
  });

type MaskCanvas = {
  canvas: HTMLCanvasElement;
  bounds: { x: number; y: number; width: number; height: number } | null;
};

const maskCache = new Map<string, MaskCanvas>();
const glossCache = new Map<string, HTMLCanvasElement>();

const createAlphaMask = (image: HTMLImageElement): MaskCanvas => {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { canvas, bounds: null };
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  const width = canvas.width;
  const height = canvas.height;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = luminance;

    if (luminance > 8) {
      const pixelIndex = i / 4;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const bounds =
    maxX >= minX && maxY >= minY
      ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
      : null;
  return { canvas, bounds };
};

const loadMaskCanvas = async (src: string): Promise<MaskCanvas> => {
  if (maskCache.has(src)) {
    return maskCache.get(src)!;
  }

  const img = await loadImage(src);
  const maskCanvas = createAlphaMask(img);
  maskCache.set(src, maskCanvas);
  return maskCanvas;
};

const loadGlossCanvas = async (src: string) => {
  if (glossCache.has(src)) {
    return glossCache.get(src)!;
  }

  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    glossCache.set(src, canvas);
    return canvas;
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  glossCache.set(src, canvas);
  return canvas;
};

export default function Magazine2D({
  preset,
  uploadedImage,
  printStrength,
  glossStrength,
  canvasRef: forwardedCanvasRef,
}: Magazine2DProps) {
  const localCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderCanvasRef = forwardedCanvasRef ?? localCanvasRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const baseSrc = preset.textures?.baseColor;

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      if (!baseSrc || !renderCanvasRef.current) return;
      const canvas = renderCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      try {
        const maxDim = 4096;
        const baseImg = await loadImage(baseSrc, maxDim, maxDim);
        if (cancelled) return;

        const baseW = baseImg.width;
        const baseH = baseImg.height;

        let maskData: MaskCanvas | null = null;
        if (preset.textures?.printMask) {
          maskData = await loadMaskCanvas(preset.textures.printMask);
          if (cancelled) return;
        }

        let glossCanvas: HTMLCanvasElement | null = null;
        if (preset.textures?.glossMask) {
          glossCanvas = await loadGlossCanvas(preset.textures.glossMask);
          if (cancelled) return;
        }

        let photoImg: HTMLImageElement | null = null;
        let photoAspect: number | null = null;
        if (uploadedImage) {
          photoImg = await loadImage(uploadedImage, maxDim, maxDim);
          if (cancelled) return;
          photoAspect = photoImg.width / (photoImg.height || 1);
        }

        let marginLeft = 0;
        let marginRight = 0;
        let marginTop = 0;
        let marginBottom = 0;
        if (maskData?.bounds) {
          const maskW = Math.max(1, maskData.canvas.width);
          const maskH = Math.max(1, maskData.canvas.height);
          marginLeft = maskData.bounds.x / maskW;
          marginRight = (maskW - (maskData.bounds.x + maskData.bounds.width)) / maskW;
          marginTop = maskData.bounds.y / maskH;
          marginBottom = (maskH - (maskData.bounds.y + maskData.bounds.height)) / maskH;
        } else if (preset.sheet.printArea) {
          marginLeft = preset.sheet.printArea.left;
          marginRight = preset.sheet.printArea.right;
          marginTop = preset.sheet.printArea.top;
          marginBottom = preset.sheet.printArea.bottom;
        }

        let scaledWidth = baseW;
        let scaledHeight = baseH;
        if (photoAspect) {
          const printableWidthNorm = 1 - marginLeft - marginRight;
          const printableHeightNorm = 1 - marginTop - marginBottom;
          scaledWidth = baseW;
          scaledHeight = (scaledWidth * printableWidthNorm) / (photoAspect * printableHeightNorm);
        }
        scaledWidth = Math.max(1, Math.round(scaledWidth));
        scaledHeight = Math.max(1, Math.round(scaledHeight));

        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        const aspectRatio = scaledWidth / scaledHeight;
        canvas.style.width = 'auto';
        canvas.style.height = 'auto';
        canvas.style.maxWidth = '100%';
        canvas.style.maxHeight = '100%';
        canvas.style.aspectRatio = `${aspectRatio}`;
        if (containerRef.current) {
          containerRef.current.style.width = 'min(100%, 1200px)';
          containerRef.current.style.height = '100%';
          containerRef.current.style.maxHeight = '100%';
        }
        ctx.clearRect(0, 0, scaledWidth, scaledHeight);
        ctx.drawImage(baseImg, 0, 0, scaledWidth, scaledHeight);

        if (photoImg) {
          const normLeft = marginLeft;
          const normTop = marginTop;
          const normWidth = 1 - marginLeft - marginRight;
          const normHeight = 1 - marginTop - marginBottom;

          const printX = normLeft * scaledWidth;
          const printY = normTop * scaledHeight;
          const printW = normWidth * scaledWidth;
          const printH = normHeight * scaledHeight;

          const srcAspect = photoImg.width / Math.max(1, photoImg.height);
          const targetAspect = printW / Math.max(1, printH);
          let drawX = printX;
          let drawY = printY;
          let drawW = printW;
          let drawH = printH;
          if (srcAspect > targetAspect) {
            drawH = printW / srcAspect;
            drawY = printY + (printH - drawH) * 0.5;
          } else if (srcAspect < targetAspect) {
            drawW = printH * srcAspect;
            drawX = printX + (printW - drawW) * 0.5;
          }

          const offCanvas = document.createElement('canvas');
          offCanvas.width = scaledWidth;
          offCanvas.height = scaledHeight;
          const offCtx = offCanvas.getContext('2d');
          if (!offCtx) return;

          offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);
          offCtx.drawImage(photoImg, drawX, drawY, drawW, drawH);

          if (maskData) {
            offCtx.globalCompositeOperation = 'destination-in';
            offCtx.drawImage(maskData.canvas, 0, 0, scaledWidth, scaledHeight);
            offCtx.globalCompositeOperation = 'source-over';
          }

          // Re-inject base shading so seams/highlights remain visible through the print.
          offCtx.globalCompositeOperation = 'multiply';
          offCtx.globalAlpha = 0.9;
          offCtx.drawImage(baseImg, 0, 0, scaledWidth, scaledHeight);
          offCtx.globalCompositeOperation = 'overlay';
          offCtx.globalAlpha = 0.4;
          offCtx.drawImage(baseImg, 0, 0, scaledWidth, scaledHeight);
          offCtx.globalAlpha = 1;

          // Extra seam emphasis.
          const seamX = scaledWidth / 2;
          const seamHalfWidth = scaledWidth * 0.015;
          const seamGradient = offCtx.createLinearGradient(
            seamX - seamHalfWidth,
            0,
            seamX + seamHalfWidth,
            0
          );
          seamGradient.addColorStop(0, 'rgba(0,0,0,0)');
          seamGradient.addColorStop(0.45, 'rgba(0,0,0,0.45)');
          seamGradient.addColorStop(0.55, 'rgba(0,0,0,0.45)');
          seamGradient.addColorStop(1, 'rgba(0,0,0,0)');

          offCtx.globalCompositeOperation = 'multiply';
          offCtx.fillStyle = seamGradient;
          offCtx.fillRect(0, 0, scaledWidth, scaledHeight);
          offCtx.globalAlpha = 1;
          offCtx.globalCompositeOperation = 'source-over';

          const alpha = Math.min(Math.max(printStrength / 100, 0), 1);
          if (alpha > 0) {
            ctx.globalAlpha = alpha;
            ctx.drawImage(offCanvas, 0, 0);
            ctx.globalAlpha = 1;
          }
        }

        const glossScale = Math.max(0, Math.min(2, glossStrength / 100));
        if (glossCanvas && glossScale > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.55 * Math.min(1.5, glossScale);
          ctx.drawImage(glossCanvas, 0, 0, scaledWidth, scaledHeight);
          ctx.globalAlpha = Math.min(1, 0.8 * glossScale);
          ctx.globalCompositeOperation = 'screen';
          ctx.drawImage(glossCanvas, 0, 0, scaledWidth, scaledHeight);
          ctx.restore();
        }

        if (preset.textures?.silhouetteMask) {
          const silhouetteCanvas = await loadMaskCanvas(preset.textures.silhouetteMask);
          if (cancelled) return;
          ctx.globalCompositeOperation = 'destination-in';
          ctx.drawImage(silhouetteCanvas.canvas, 0, 0, scaledWidth, scaledHeight);
          ctx.globalCompositeOperation = 'source-over';
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to render magazine 2D', error);
        }
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [
    baseSrc,
    renderCanvasRef,
    preset.textures?.silhouetteMask,
    preset.textures?.printMask,
    preset.textures?.glossMask,
    preset.sheet.autoFitPrintArea,
    uploadedImage,
    printStrength,
    preset.sheet.printArea,
    glossStrength,
  ]);

  return (
    <div ref={containerRef} className="mx-auto flex h-full items-center justify-center bg-white overflow-hidden">
      <canvas ref={renderCanvasRef} />
    </div>
  );
}
