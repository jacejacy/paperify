import { PaperPreset } from './types';

export function applyPaperEffect(
  imageData: ImageData,
  preset: PaperPreset,
  paperAge: number,
  paperColor: string,
  printStrength: number,
  grain: number,
  mosaicFading: number
): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Parse paper color
  const paperRGB = hexToRgb(paperColor);

  // Process each pixel
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Apply paper base color with yellowing
    const yellowAgeAmount = (paperAge / 100) * preset.aging.yellowing;
    const yellowTint = {
      r: 1.0,
      g: 0.95,
      b: 0.8,
    };

    let paperBase = {
      r: paperRGB.r,
      g: paperRGB.g,
      b: paperRGB.b,
    };

    // Apply yellowing
    paperBase = {
      r: lerp(paperBase.r, paperBase.r * yellowTint.r, yellowAgeAmount),
      g: lerp(paperBase.g, paperBase.g * yellowTint.g, yellowAgeAmount),
      b: lerp(paperBase.b, paperBase.b * yellowTint.b, yellowAgeAmount),
    };

    // Add subtle paper grain
    const x = (i / 4) % width;
    const y = Math.floor(i / 4 / width);
    const grainValue = noise2d(x / 200, y / 200) * 0.03;
    paperBase.r += grainValue * 255;
    paperBase.g += grainValue * 255;
    paperBase.b += grainValue * 255;

    // Normalize image color (0-1)
    let printColor = {
      r: r / 255,
      g: g / 255,
      b: b / 255,
    };

    // Apply absorb effect
    const absorb = preset.print.absorb * 0.3;
    printColor = {
      r: lerp(printColor.r, 0.5, absorb),
      g: lerp(printColor.g, 0.5, absorb),
      b: lerp(printColor.b, 0.5, absorb),
    };

    // Apply warmth
    const warmth = preset.print.warmth;
    printColor = {
      r: lerp(printColor.r, printColor.r * 1.0, warmth),
      g: lerp(printColor.g, printColor.g * 0.98, warmth),
      b: lerp(printColor.b, printColor.b * 0.95, warmth),
    };

    // Apply grain
    const printGrain = noise2d(x / 800, y / 800) * (grain / 100) * 0.1;
    printColor.r += printGrain;
    printColor.g += printGrain;
    printColor.b += printGrain;

    // Apply blend mode
    const strength =
      (printStrength / 100) * preset.print.inkStrength * (preset.print.maxDensity ?? 1);
    const paperBaseNorm = {
      r: paperBase.r / 255,
      g: paperBase.g / 255,
      b: paperBase.b / 255,
    };

    let finalColor;
    if (preset.print.blendMode === 'multiply') {
      finalColor = blendMultiply(paperBaseNorm, printColor);
    } else if (preset.print.blendMode === 'overlay') {
      finalColor = blendOverlay(paperBaseNorm, printColor);
    } else {
      finalColor = blendSoftLight(paperBaseNorm, printColor);
    }

    // Mix based on strength
    finalColor = {
      r: lerp(paperBaseNorm.r, finalColor.r, strength),
      g: lerp(paperBaseNorm.g, finalColor.g, strength),
      b: lerp(paperBaseNorm.b, finalColor.b, strength),
    };

    if (preset.id === 'a4') {
      const lum = finalColor.r * 0.333 + finalColor.g * 0.333 + finalColor.b * 0.333;
      finalColor = {
        r: clamp(lerp(finalColor.r, lum, 0.06) + 0.01, 0, 1),
        g: clamp(lerp(finalColor.g, lum, 0.06) + 0.01, 0, 1),
        b: clamp(lerp(finalColor.b, lum, 0.06) + 0.01, 0, 1),
      };
    }

    // Apply paper aging (global fade + desaturation)
    const agingFade = clamp(paperAge / 100, 0, 1);
    if (agingFade > 0) {
      const nx = x / width;
      const ny = y / height;
      const warpX =
        nx +
        (noise2d(nx * 12 + 0.11, ny * 12 + 0.52) -
          0.5) *
          0.02;
      const warpY =
        ny +
        (noise2d(ny * 12 + 0.36, nx * 12 - 0.29) -
          0.5) *
          0.02;
      const bands = noise2d(warpY * 6 + 0.32, warpX * 6 - 0.44);
      let fbmPattern =
        noise2d(warpX * 8 + 0.21, warpY * 8 + 0.43) * 0.4 +
        noise2d(warpX * 13 - 0.37, warpY * 13 - 0.16) * 0.35 +
        noise2d(warpX * 20 - 0.29, warpY * 20 + 0.61) * 0.25;
      const micro = noise2d(warpX * 32 - 0.41, warpY * 32 - 0.57);
      fbmPattern = fbmPattern / 1.0;
      let fadeMask = lerp(fbmPattern, bands, 0.25);
      fadeMask = smoothstep(0.5, 0.7, fadeMask);
      fadeMask = lerp(fadeMask, fadeMask * fadeMask, 0.15);
      fadeMask = lerp(fadeMask, smoothstep(0.45, 0.8, micro), 0.15);

      const luminance = finalColor.r * 0.299 + finalColor.g * 0.587 + finalColor.b * 0.114;
      const gray = {
        r: luminance,
        g: luminance,
        b: luminance,
      };
      const globalNoise = noise2d(nx * 5 + 0.13, ny * 5 + 0.42);
      const globalMask = smoothstep(0.2, 0.8, globalNoise) * lerp(0.6, 1.0, agingFade);
      const globalDesat = {
        r: lerp(finalColor.r, gray.r, agingFade * 0.25 + globalMask * 0.2 * agingFade),
        g: lerp(finalColor.g, gray.g, agingFade * 0.25 + globalMask * 0.2 * agingFade),
        b: lerp(finalColor.b, gray.b, agingFade * 0.25 + globalMask * 0.2 * agingFade),
      };
      const warmPaper = {
        r: paperBaseNorm.r * 1.03,
        g: paperBaseNorm.g * 0.99,
        b: paperBaseNorm.b * 0.93,
      };
      const globalWarm = {
        r: lerp(globalDesat.r, warmPaper.r, agingFade * 0.2),
        g: lerp(globalDesat.g, warmPaper.g, agingFade * 0.2),
        b: lerp(globalDesat.b, warmPaper.b, agingFade * 0.2),
      };

      const localFade = fadeMask * agingFade * 0.35;
      const paperPull = {
        r: lerp(globalWarm.r, warmPaper.r, 0.25 + 0.35 * fadeMask),
        g: lerp(globalWarm.g, warmPaper.g, 0.25 + 0.35 * fadeMask),
        b: lerp(globalWarm.b, warmPaper.b, 0.25 + 0.35 * fadeMask),
      };

      const shadowBoost = smoothstep(0.1, 0.85, 1 - luminance);
      const lifted = {
        r: lerp(globalWarm.r, paperPull.r, localFade * (0.6 + 0.4 * shadowBoost)),
        g: lerp(globalWarm.g, paperPull.g, localFade * (0.6 + 0.4 * shadowBoost)),
        b: lerp(globalWarm.b, paperPull.b, localFade * (0.6 + 0.4 * shadowBoost)),
      };

      let blended = {
        r: lerp(globalWarm.r, lifted.r, localFade),
        g: lerp(globalWarm.g, lifted.g, localFade),
        b: lerp(globalWarm.b, lifted.b, localFade),
      };

      const haze = (micro - 0.5) * agingFade * 0.02;
      blended = {
        r: clamp(blended.r + haze, 0, 1),
        g: clamp(blended.g + haze, 0, 1),
        b: clamp(blended.b + haze, 0, 1),
      };

      finalColor = blended;
    }

    const mosaicAmount = clamp(mosaicFading / 100, 0, 1);
    if (mosaicAmount > 0) {
      const nx = x / width;
      const ny = y / height;
      const strength = smoothstep(0.05, 1.0, mosaicAmount);
      let fadeMask = smoothstep(
        0.2,
        0.85,
        noise2d(nx * 3 + 0.21, ny * 3 + 0.37) * 0.65 +
          noise2d(nx * 30 - 0.18, ny * 30 - 0.45) * 0.35
      );
      fadeMask = lerp(fadeMask, fadeMask * fadeMask, 0.55);

      const luminance = finalColor.r * 0.299 + finalColor.g * 0.587 + finalColor.b * 0.114;
      const darkMask = smoothstep(0.0, 0.7, 1 - luminance);

      const warmTarget = {
        r: paperBaseNorm.r * 1.15,
        g: paperBaseNorm.g * 1.08,
        b: paperBaseNorm.b * 0.98,
      };
      const coolTarget = {
        r: paperBaseNorm.r * 0.62,
        g: paperBaseNorm.g * 0.58,
        b: paperBaseNorm.b * 0.55,
      };

      const toneMix = smoothstep(0.2, 0.9, luminance);
      const agedTint = {
        r: lerp(coolTarget.r, warmTarget.r, toneMix),
        g: lerp(coolTarget.g, warmTarget.g, toneMix),
        b: lerp(coolTarget.b, warmTarget.b, toneMix),
      };
      const tintGray =
        agedTint.r * 0.299 + agedTint.g * 0.587 + agedTint.b * 0.114;
      const desaturated = {
        r: lerp(agedTint.r, tintGray, 0.35 + darkMask * 0.35),
        g: lerp(agedTint.g, tintGray, 0.35 + darkMask * 0.35),
        b: lerp(agedTint.b, tintGray, 0.35 + darkMask * 0.35),
      };

      const fadeAmount = clamp(fadeMask * strength * 1.4, 0, 1);
      let result = {
        r: lerp(finalColor.r, desaturated.r, fadeAmount),
        g: lerp(finalColor.g, desaturated.g, fadeAmount),
        b: lerp(finalColor.b, desaturated.b, fadeAmount),
      };

      const peelNoise = smoothstep(
        0.3,
        0.85,
        noise2d(nx * 18 + 0.41, ny * 18 + 0.2)
      );
      const peelAmount = clamp(peelNoise * strength * darkMask * 1.1, 0, 1);
      result = {
        r: lerp(result.r, paperBaseNorm.r, peelAmount),
        g: lerp(result.g, paperBaseNorm.g, peelAmount),
        b: lerp(result.b, paperBaseNorm.b, peelAmount),
      };

      finalColor = result;
    }

    // Clamp and write
    data[i] = clamp(finalColor.r * 255, 0, 255);
    data[i + 1] = clamp(finalColor.g * 255, 0, 255);
    data[i + 2] = clamp(finalColor.b * 255, 0, 255);
  }

  return imageData;
}

export function downloadCanvasAsImage(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  });
}

export function exportFlatImage(
  imageUrl: string,
  preset: PaperPreset,
  paperAge: number,
  paperColor: string,
  printStrength: number,
  grain: number,
  mosaicFading: number,
  filename: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

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
      downloadCanvasAsImage(canvas, filename);
      resolve();
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

// Utility functions
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampColor(color: { r: number; g: number; b: number }) {
  return {
    r: clamp(color.r, 0, 1),
    g: clamp(color.g, 0, 1),
    b: clamp(color.b, 0, 1),
  };
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function noise2d(x: number, y: number): number {
  const X = Math.floor(x);
  const Y = Math.floor(y);
  const fx = x - X;
  const fy = y - Y;

  const hash = (n: number) => {
    const s = Math.sin(n) * 43758.5453123;
    return s - Math.floor(s);
  };

  const n00 = hash(X + Y * 57.0);
  const n10 = hash(X + 1 + Y * 57.0);
  const n01 = hash(X + (Y + 1) * 57.0);
  const n11 = hash(X + 1 + (Y + 1) * 57.0);

  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);

  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
}


function blendMultiply(
  base: { r: number; g: number; b: number },
  blend: { r: number; g: number; b: number }
): { r: number; g: number; b: number } {
  return {
    r: base.r * blend.r,
    g: base.g * blend.g,
    b: base.b * blend.b,
  };
}

function blendOverlay(
  base: { r: number; g: number; b: number },
  blend: { r: number; g: number; b: number }
): { r: number; g: number; b: number } {
  return {
    r: base.r < 0.5 ? 2 * base.r * blend.r : 1 - 2 * (1 - base.r) * (1 - blend.r),
    g: base.g < 0.5 ? 2 * base.g * blend.g : 1 - 2 * (1 - base.g) * (1 - blend.g),
    b: base.b < 0.5 ? 2 * base.b * blend.b : 1 - 2 * (1 - base.b) * (1 - blend.b),
  };
}

function blendSoftLight(
  base: { r: number; g: number; b: number },
  blend: { r: number; g: number; b: number }
): { r: number; g: number; b: number } {
  const softLight = (b: number, s: number) => {
    return s < 0.5
      ? 2 * b * s + b * b * (1 - 2 * s)
      : Math.sqrt(b) * (2 * s - 1) + 2 * b * (1 - s);
  };

  return {
    r: softLight(base.r, blend.r),
    g: softLight(base.g, blend.g),
    b: softLight(base.b, blend.b),
  };
}
