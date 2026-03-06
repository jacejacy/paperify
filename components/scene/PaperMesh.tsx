'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PaperPreset } from '@/lib/types';

interface PaperMeshProps {
  preset: PaperPreset;
  uploadedImage: string | null;
  imageAspectRatio?: number;
  paperAge: number;
  wrinkles: number;
  paperColor: string;
  printStrength: number;
  grain: number;
  mosaicFading: number;
  viewMode: '2d' | '3d';
}

export default function PaperMesh({
  preset,
  uploadedImage,
  imageAspectRatio,
  paperAge,
  wrinkles,
  paperColor,
  printStrength,
  grain,
  mosaicFading,
  viewMode,
}: PaperMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Calculate aspect ratio and dimensions
  const isPolaroid = preset.id === 'polaroid';
  const isMagazine = preset.id === 'magazine';
  const hasPrintArea = !!preset.sheet.printArea;
  const wantsAutoFit = !!preset.sheet.autoFitPrintArea;
  const hasImageAspect = imageAspectRatio && imageAspectRatio > 0;
  let aspectRatio = hasImageAspect ? imageAspectRatio : preset.sheet.aspectRatio;
  let autoFitPrintableArea = false;

  if (hasPrintArea && wantsAutoFit && hasImageAspect) {
    const { top = 0, bottom = 0, left = 0, right = 0 } = preset.sheet.printArea!;
    const innerWidth = Math.max(0.01, 1 - left - right);
    const innerHeight = Math.max(0.01, 1 - top - bottom);
    const innerRatio = innerWidth / innerHeight;
    aspectRatio = (imageAspectRatio as number) / innerRatio;
    autoFitPrintableArea = true;
  }
  const width = 4;
  const height = width / aspectRatio;

  type PaperTextureSet = {
    baseColor: THREE.Texture | null;
    wrinkleBase: THREE.Texture | null;
    normal: THREE.Texture | null;
    roughness: THREE.Texture | null;
    wrinkleHeight: THREE.Texture | null;
    wrinkleNormal: THREE.Texture | null;
    polaroidAging: THREE.Texture | null;
    glossMask: THREE.Texture | null;
    printMask: THREE.Texture | null;
    silhouetteMask: THREE.Texture | null;
  };

  const createEmptyTextureSet = (): PaperTextureSet => ({
    baseColor: null,
    wrinkleBase: null,
    normal: null,
    roughness: null,
    wrinkleHeight: null,
    wrinkleNormal: null,
    polaroidAging: null,
    glossMask: null,
    printMask: null,
    silhouetteMask: null,
  });

  const [paperTextures, setPaperTextures] = useState<PaperTextureSet>(createEmptyTextureSet());

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let mounted = true;
    const next = createEmptyTextureSet();

    const entries: Array<{
      key: keyof PaperTextureSet;
      url?: string;
      colorSpace: THREE.ColorSpace | undefined;
    }> = [
      { key: 'baseColor', url: preset.textures?.baseColor, colorSpace: THREE.SRGBColorSpace },
      { key: 'wrinkleBase', url: preset.textures?.wrinkleBase, colorSpace: THREE.SRGBColorSpace },
      { key: 'normal', url: preset.textures?.normal, colorSpace: THREE.LinearSRGBColorSpace },
      { key: 'roughness', url: preset.textures?.roughness, colorSpace: THREE.LinearSRGBColorSpace },
      { key: 'wrinkleHeight', url: preset.textures?.wrinkleHeight, colorSpace: THREE.LinearSRGBColorSpace },
      { key: 'wrinkleNormal', url: preset.textures?.wrinkleNormal, colorSpace: THREE.LinearSRGBColorSpace },
      { key: 'polaroidAging', url: preset.textures?.agingReference, colorSpace: THREE.SRGBColorSpace },
      { key: 'glossMask', url: preset.textures?.glossMask, colorSpace: THREE.LinearSRGBColorSpace },
      { key: 'printMask', url: preset.textures?.printMask, colorSpace: THREE.LinearSRGBColorSpace },
      { key: 'silhouetteMask', url: preset.textures?.silhouetteMask, colorSpace: THREE.LinearSRGBColorSpace },
    ];

    let remaining = entries.filter((entry) => !!entry.url).length;
    if (remaining === 0) {
      setPaperTextures(createEmptyTextureSet());
      return () => {
        mounted = false;
      };
    }

    entries.forEach(({ key, url, colorSpace }) => {
      if (!url) return;
      loader.load(
        url,
        (texture) => {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          if (colorSpace) {
            texture.colorSpace = colorSpace;
          }
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.anisotropy = 8;
          texture.needsUpdate = true;
          next[key] = texture;
          remaining -= 1;
          if (remaining === 0 && mounted) {
            setPaperTextures(next);
          }
        },
        undefined,
        (error) => {
          console.error(`❌ Failed to load texture ${url}:`, error);
          remaining -= 1;
          if (remaining === 0 && mounted) {
            setPaperTextures(next);
          }
        }
      );
    });

    return () => {
      mounted = false;
    };
  }, [preset.id, imageAspectRatio]);

  // Create custom shader material
  const material = useMemo(() => {
    const vertexShader = `
      varying vec2 vUv;              // Deformed UV (for wrinkle texture)
      varying vec2 vUvOriginal;      // Original UV (for stable photo sampling)
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vTangent;
      varying vec3 vBitangent;
      varying vec2 vRestUv;

      uniform float uWrinkles;
      uniform sampler2D uWrinkleHeightMap;
      uniform bool uHasWrinkleHeightMap;

      // Hash function
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      // Smooth noise
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);

        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));

        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      // FBM for large-scale folds
      float fbm(vec2 p, int octaves) {
        float value = 0.0;
        float amplitude = 0.5;

        for(int i = 0; i < 8; i++) {
          if(i >= octaves) break;
          value += amplitude * noise(p);
          p *= 2.0;
          amplitude *= 0.5;
        }

        return value;
      }

      // Sample wrinkle texture in vertex shader for displacement
      float sampleWrinkleHeight(vec2 uv) {
        if(!uHasWrinkleHeightMap) return 0.0;
        vec3 texColor = texture2D(uWrinkleHeightMap, uv).rgb;
        float height = dot(texColor, vec3(0.299, 0.587, 0.114));
        return (height - 0.5) * 2.0; // Remap to -1 to 1
      }

      // REALISTIC CRUMPLED EDGE (like reference image)
      // Multi-scale: broad collapse + local creases + edge roughness
      vec2 organicEdgeWarp(vec2 uv, float intensity) {
        vec2 warp = vec2(0.0);

        vec2 edgeDist = min(uv, 1.0 - uv);
        float distToEdge = min(edgeDist.x, edgeDist.y);

        // Edge zone (active in outer 20% for more dramatic effect)
        if(distToEdge > 0.20) return vec2(0.0);

        // ===========================================
        // LEFT EDGE
        // ===========================================
        if(uv.x < 0.20) {
          float t = uv.y;
          float seed = 137.5;

          // BROAD COLLAPSE (major inward/outward deviation)
          float collapse = sin(t * 4.5 + noise(vec2(seed, t * 1.5)) * 4.0) * 0.035;
          collapse += sin(t * 2.1 + noise(vec2(seed + 5.0, t * 0.8)) * 3.0) * 0.020;

          // LOCAL CREASES (sharp localized folds)
          float crease1 = smoothstep(0.98, 1.0, noise(vec2(seed, t * 15.0))) * 0.015;
          float crease2 = smoothstep(0.97, 1.0, noise(vec2(seed + 7.0, t * 18.0))) * 0.012;

          // EDGE ROUGHNESS (frayed/torn texture)
          float roughness = (noise(vec2(seed, t * 80.0)) - 0.5) * 0.005;

          float edgeFalloff = smoothstep(0.20, 0.0, uv.x);
          warp.x += (collapse + crease1 - crease2 + roughness) * edgeFalloff * intensity;
        }

        // ===========================================
        // RIGHT EDGE
        // ===========================================
        if(uv.x > 0.80) {
          float t = uv.y;
          float seed = 248.3;

          float collapse = sin(t * 5.2 + noise(vec2(seed, t * 1.8)) * 3.5) * 0.038;
          collapse += cos(t * 2.6 + noise(vec2(seed + 6.0, t * 1.0)) * 4.0) * 0.022;

          float crease1 = smoothstep(0.98, 1.0, noise(vec2(seed, t * 16.0))) * 0.016;
          float crease2 = smoothstep(0.97, 1.0, noise(vec2(seed + 8.0, t * 20.0))) * 0.013;

          float roughness = (noise(vec2(seed, t * 75.0)) - 0.5) * 0.006;

          float edgeFalloff = smoothstep(0.20, 0.0, 1.0 - uv.x);
          warp.x -= (collapse + crease1 - crease2 + roughness) * edgeFalloff * intensity;
        }

        // ===========================================
        // BOTTOM EDGE
        // ===========================================
        if(uv.y < 0.20) {
          float t = uv.x;
          float seed = 359.7;

          float collapse = sin(t * 4.8 + noise(vec2(t * 1.6, seed)) * 4.2) * 0.036;
          collapse += sin(t * 2.3 + noise(vec2(t * 0.9, seed + 5.0)) * 3.5) * 0.024;

          float crease1 = smoothstep(0.98, 1.0, noise(vec2(t * 14.0, seed))) * 0.014;
          float crease2 = smoothstep(0.97, 1.0, noise(vec2(t * 19.0, seed + 9.0))) * 0.011;

          float roughness = (noise(vec2(t * 85.0, seed)) - 0.5) * 0.005;

          float edgeFalloff = smoothstep(0.20, 0.0, uv.y);
          warp.y += (collapse + crease1 - crease2 + roughness) * edgeFalloff * intensity;
        }

        // ===========================================
        // TOP EDGE
        // ===========================================
        if(uv.y > 0.80) {
          float t = uv.x;
          float seed = 426.1;

          float collapse = cos(t * 5.5 + noise(vec2(t * 1.9, seed)) * 3.8) * 0.032;
          collapse += sin(t * 2.8 + noise(vec2(t * 1.1, seed + 6.0)) * 4.5) * 0.021;

          float crease1 = smoothstep(0.98, 1.0, noise(vec2(t * 17.0, seed))) * 0.015;
          float crease2 = smoothstep(0.97, 1.0, noise(vec2(t * 21.0, seed + 10.0))) * 0.012;

          float roughness = (noise(vec2(t * 78.0, seed)) - 0.5) * 0.006;

          float edgeFalloff = smoothstep(0.20, 0.0, 1.0 - uv.y);
          warp.y -= (collapse + crease1 - crease2 + roughness) * edgeFalloff * intensity;
        }

        return warp;
      }

      // DRAMATIC CORNER FOLDS (like real crumpled paper)
      vec3 cornerCurl(vec2 uv, float intensity) {
        vec3 totalCurl = vec3(0.0);

        // ===========================================
        // BOTTOM-LEFT CORNER - Major fold
        // ===========================================
        vec2 blDist = abs(uv - vec2(0.0, 0.0));
        float blRadius = length(blDist);
        if(blRadius < 0.45) {
          float seed = 517.3;
          float mask = smoothstep(0.45, 0.05, blRadius);
          float noise1 = noise(uv * 3.0 + vec2(seed, seed * 0.7));
          float noise2 = noise(uv * 4.0 + vec2(seed * 1.3, seed));
          float noise3 = noise(uv * 2.0 + vec2(seed, seed * 1.5));

          // DRAMATIC XY curl (major corner collapse)
          vec2 xyCurl = vec2(-1.0, -1.0) * blDist * (0.120 + noise1 * 0.080);
          // Add twist/rotation
          xyCurl.x += blDist.y * noise2 * 0.060;
          xyCurl.y += blDist.x * noise3 * 0.055;

          // MAJOR Z lift (corner folds upward dramatically)
          float zLift = mask * (0.180 + noise2 * 0.120);

          totalCurl += vec3(xyCurl * mask, zLift) * intensity;
        }

        // ===========================================
        // BOTTOM-RIGHT CORNER - Different fold pattern
        // ===========================================
        vec2 brDist = abs(uv - vec2(1.0, 0.0));
        float brRadius = length(brDist);
        if(brRadius < 0.45) {
          float seed = 628.9;
          float mask = smoothstep(0.45, 0.05, brRadius);
          float noise1 = noise(uv * 3.5 + vec2(seed, seed * 0.9));
          float noise2 = noise(uv * 2.8 + vec2(seed * 1.1, seed));
          float noise3 = noise(uv * 4.2 + vec2(seed, seed * 1.8));

          vec2 xyCurl = vec2(1.0, -1.0) * brDist * (0.110 + noise1 * 0.075);
          xyCurl.x -= brDist.y * noise2 * 0.065;
          xyCurl.y += brDist.x * noise3 * 0.050;

          float zLift = mask * (0.165 + noise1 * 0.110);

          totalCurl += vec3(xyCurl * mask, zLift) * intensity;
        }

        // ===========================================
        // TOP-LEFT CORNER - Major upward fold
        // ===========================================
        vec2 tlDist = abs(uv - vec2(0.0, 1.0));
        float tlRadius = length(tlDist);
        if(tlRadius < 0.45) {
          float seed = 739.4;
          float mask = smoothstep(0.45, 0.05, tlRadius);
          float noise1 = noise(uv * 4.0 + vec2(seed, seed * 0.6));
          float noise2 = noise(uv * 3.2 + vec2(seed * 1.4, seed));
          float noise3 = noise(uv * 2.5 + vec2(seed, seed * 2.0));

          vec2 xyCurl = vec2(-1.0, 1.0) * tlDist * (0.130 + noise1 * 0.085);
          xyCurl.x += tlDist.y * noise2 * 0.070;
          xyCurl.y -= tlDist.x * noise3 * 0.060;

          float zLift = mask * (0.190 + noise2 * 0.130);

          totalCurl += vec3(xyCurl * mask, zLift) * intensity;
        }

        // ===========================================
        // TOP-RIGHT CORNER - Strongest fold
        // ===========================================
        vec2 trDist = abs(uv - vec2(1.0, 1.0));
        float trRadius = length(trDist);
        if(trRadius < 0.45) {
          float seed = 841.7;
          float mask = smoothstep(0.45, 0.05, trRadius);
          float noise1 = noise(uv * 3.8 + vec2(seed, seed * 0.8));
          float noise2 = noise(uv * 4.5 + vec2(seed * 1.2, seed));
          float noise3 = noise(uv * 2.2 + vec2(seed, seed * 1.6));

          vec2 xyCurl = vec2(1.0, 1.0) * trDist * (0.140 + noise1 * 0.090);
          xyCurl.x -= trDist.y * noise2 * 0.075;
          xyCurl.y -= trDist.x * noise3 * 0.065;

          float zLift = mask * (0.200 + noise1 * 0.140);

          totalCurl += vec3(xyCurl * mask, zLift) * intensity;
        }

        return totalCurl;
      }

      // Z-displacement with edge dampening (prevents thick edges)
      float wrinkleDampening(vec2 uv) {
        vec2 edgeDist = min(uv, 1.0 - uv);
        float distToEdge = min(edgeDist.x, edgeDist.y);

        // Gradually reduce wrinkle height near edges (keep paper thin at perimeter)
        return smoothstep(0.0, 0.08, distToEdge) * 0.9 + 0.1;
      }

      float sampleMacroWrinkle(vec2 uv) {
        float offset = 0.02;
        float sum = sampleWrinkleHeight(uv);
        sum += sampleWrinkleHeight(uv + vec2(offset, 0.0));
        sum += sampleWrinkleHeight(uv - vec2(offset, 0.0));
        sum += sampleWrinkleHeight(uv + vec2(0.0, offset));
        sum += sampleWrinkleHeight(uv - vec2(0.0, offset));
        return sum / 5.0;
      }

      void main() {
        // Store ORIGINAL UV for stable photo sampling (no liquification)
        vUvOriginal = uv;
        vUv = uv;
        vRestUv = vec2((position.x / ${width.toFixed(3)}) + 0.5, (position.y / ${height.toFixed(3)}) + 0.5);

        vec3 transformed = position;
        vec3 objectNormal = normal;

        vec3 tangent = normalize(vec3(1.0, 0.0, 0.0));
        vec3 bitangent = normalize(vec3(0.0, 1.0, 0.0));

        float wrinkleFactor = pow(uWrinkles, 1.1);
        if (wrinkleFactor > 0.0001) {
          float scaledIntensity = clamp(wrinkleFactor * 0.65, 0.0, 0.8);
          if (${preset.id === 'magazine' ? 'true' : 'false'}) {
            scaledIntensity = 0.0;
          }
          float xyWarpFactor = smoothstep(0.8, 1.0, wrinkleFactor);

          vec2 edgeWarp = organicEdgeWarp(uv, scaledIntensity);
          vec3 cornerDeform = cornerCurl(uv, scaledIntensity);

          transformed.xy += (edgeWarp + cornerDeform.xy) * xyWarpFactor;
          transformed.z += cornerDeform.z;

          vUv = uv;

          float macroHeight = sampleMacroWrinkle(vRestUv);
          float largeFolds = fbm(uv * 2.0 + vec2(0.3, 0.7), 2);
          largeFolds = (largeFolds - 0.5) * 2.0;
          float dampFactor = wrinkleDampening(uv);
          float baseDisplacement = (macroHeight * 0.85 + largeFolds * 0.15) * scaledIntensity * 0.11 * dampFactor;
          float extremeBoost = smoothstep(0.8, 1.0, wrinkleFactor);
          float displacement = mix(baseDisplacement, baseDisplacement * 1.4, extremeBoost);
          transformed.z += displacement;

          float delta = 0.01;
          float heightDx = sampleMacroWrinkle(vRestUv + vec2(delta / ${width.toFixed(3)}, 0.0));
          float heightDy = sampleMacroWrinkle(vRestUv + vec2(0.0, delta / ${height.toFixed(3)}));
          float foldDx = fbm((uv + vec2(delta, 0.0)) * 2.0 + vec2(0.3, 0.7), 2);
          float foldDy = fbm((uv + vec2(0.0, delta)) * 2.0 + vec2(0.3, 0.7), 2);
          float dampFactorDx = wrinkleDampening(uv + vec2(delta, 0.0));
          float dampFactorDy = wrinkleDampening(uv + vec2(0.0, delta));

          float dx = (heightDx * 0.7 + (foldDx - 0.5) * 2.0 * 0.3) * scaledIntensity * 0.15 * dampFactorDx;
          float dy = (heightDy * 0.7 + (foldDy - 0.5) * 2.0 * 0.3) * scaledIntensity * 0.15 * dampFactorDy;

          vec3 cornerDeformDx = cornerCurl(uv + vec2(delta, 0.0), scaledIntensity);
          vec3 cornerDeformDy = cornerCurl(uv + vec2(0.0, delta), scaledIntensity);
          dx += cornerDeformDx.z * 5.0;
          dy += cornerDeformDy.z * 5.0;

          tangent = normalize(vec3(1.0, 0.0, dx * 3.5));
          bitangent = normalize(vec3(0.0, 1.0, dy * 3.5));
          objectNormal = normalize(cross(tangent, bitangent));
        }

        vTangent = normalize(normalMatrix * tangent);
        vBitangent = normalize(normalMatrix * bitangent);
        vNormal = normalize(normalMatrix * objectNormal);

        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        vViewPosition = -mvPosition.xyz;

        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      const bool IS_POLAROID = ${preset.id === 'polaroid' ? 'true' : 'false'};
      const bool IS_A4 = ${preset.id === 'a4' ? 'true' : 'false'};
      const bool IS_MAGAZINE = ${preset.id === 'magazine' ? 'true' : 'false'};
      const bool AUTO_FIT_PRINT_AREA = ${autoFitPrintableArea ? 'true' : 'false'};

      // ========================================
      // SYSTEM A: PAPER MATERIAL
      // ========================================
      uniform vec3 uPaperColor;
      uniform float uPaperAge;
      uniform float uMosaicFade;
      uniform float uYellowing;
      uniform float uWrinkles;

      // ========================================
      // SYSTEM B: PRINT ENGINE
      // ========================================
      uniform sampler2D uImageTexture;
      uniform bool uHasImage;
      uniform float uPrintStrength;
      uniform float uInkStrength;
      uniform float uAbsorb;
      uniform float uGrain;
      uniform float uWarmth;
      uniform int uBlendMode;
      uniform float uMaxPrintDensity;
      uniform float uImageAspect;

      // Paper asset textures
      uniform sampler2D uPaperBaseMap;
      uniform bool uHasPaperBaseMap;
      uniform sampler2D uPaperWrinkleBaseMap;
      uniform bool uHasPaperWrinkleBaseMap;
      uniform sampler2D uPaperNormalMap;
      uniform bool uHasPaperNormalMap;
      uniform sampler2D uPaperRoughnessMap;
      uniform bool uHasPaperRoughnessMap;
      uniform sampler2D uWrinkleHeightMap;
      uniform bool uHasWrinkleHeightMap;
      uniform sampler2D uWrinkleNormalMap;
      uniform bool uHasWrinkleNormalMap;
      uniform sampler2D uPolaroidAgingMap;
      uniform bool uHasPolaroidAgingMap;
      uniform sampler2D uGlossMask;
      uniform bool uHasGlossMask;
      uniform sampler2D uPrintMaskMap;
      uniform bool uHasPrintMaskMap;
      uniform sampler2D uSilhouetteMask;
      uniform bool uHasSilhouetteMask;

      // Material properties
      uniform float uRoughness;
      uniform float uMetalness;
      uniform float uOpacity;

      varying vec2 vUv;              // Deformed UV (for wrinkle texture)
      varying vec2 vUvOriginal;      // Original UV (for stable photo)
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vTangent;
      varying vec3 vBitangent;

      // Hash for noise
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      // Smooth noise
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);

        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));

        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      // ========================================
      // PAPER MATERIAL SYSTEM
      // ========================================

      // Micro fiber normal (paper texture detail)
      vec3 generatePaperFiberNormal(vec2 uv) {
        float scale = 260.0;
        vec2 p = uv * scale;

        // Soft anisotropic fiber direction
        float fiber1 = noise(vec2(p.x * 2.5, p.y * 0.35));
        float fiber2 = noise(vec2(p.x * 0.35, p.y * 2.5));

        // Calculate normal with very low amplitude so it never forms blotches
        float delta = 0.01;
        float dx = noise(vec2((p.x + delta) * 2.5, p.y * 0.35)) - fiber1;
        float dy = noise(vec2(p.x * 0.35, (p.y + delta) * 2.5)) - fiber2;

        return normalize(vec3(-dx * 0.08, -dy * 0.08, 1.0));
      }

      // Calculate paper base color with aging
      vec3 calculatePaperBase(vec3 baseColor, float age, float yellowing, float grainStrength) {
        // Apply yellowing
        float ageAmount = age * yellowing;
        vec3 yellowTint = vec3(1.0, 0.95, 0.8);
        vec3 paperBase = mix(baseColor, baseColor * yellowTint, ageAmount);

        // Very subtle paper grain (albedo)
        float grainNoise = noise(vUv * 280.0) * 0.5 + noise(vUv * 120.0) * 0.35;
        float grainContribution = (grainNoise - 0.5) * mix(0.002, 0.02, grainStrength);
        paperBase += vec3(grainContribution);

        return paperBase;
      }

      // ========================================
      // PRINT ENGINE
      // ========================================

      // Ink density compositing (multiply blend, restored for stronger print legibility)
      vec3 applyInkDensity(vec3 paper, vec3 ink, float density) {
        return paper * mix(vec3(1.0), ink, density);
      }

      // Dot gain / ink absorption (reduces contrast in midtones)
      vec3 applyDotGain(vec3 ink, float absorb) {
        // Simulates ink spreading into paper fibers
        // Reduces contrast, softens edges
        return mix(ink, vec3(dot(ink, vec3(0.333))), absorb * 0.3);
      }

      // Print grain (halftone/dithering simulation)
      vec3 applyPrintGrain(vec3 color, vec2 uv, float grainAmount) {
        float grainNoise = (noise(uv * 400.0 + vec2(0.5)) - 0.5);
        float grainStrength = clamp(grainAmount * 0.2, 0.0, 1.0);
        return mix(color, color + vec3(grainNoise) * 0.25, grainStrength);
      }

      // Age-driven ink fade (subtle irregular fading)
      vec3 applyInkFade(vec3 printed, vec3 paper, float age) {
        float amount = clamp(age, 0.0, 1.0);
        if (amount <= 0.0) return printed;

        float luminance = dot(printed, vec3(0.299, 0.587, 0.114));
        vec3 gray = vec3(luminance);

        vec2 globalUv = vUv * 5.0;
        float globalNoise = noise(globalUv + vec2(0.13, 0.42));
        float globalMask = mix(0.6, 1.0, amount);
        globalMask *= smoothstep(0.2, 0.8, globalNoise);
        float desatMix = amount * 0.12 + globalMask * 0.08 * amount;
        vec3 globalDesat = mix(printed, gray, desatMix);
        vec3 warmPaper = paper * vec3(1.02, 0.995, 0.96);
        vec3 globalWarm = mix(globalDesat, warmPaper, amount * 0.12);
        vec3 referenceColor = globalWarm;
        float referenceMask = 0.0;
        if (IS_POLAROID && uHasPolaroidAgingMap) {
          vec3 refSample = texture2D(uPolaroidAgingMap, vUvOriginal).rgb;
          float refLuminance = dot(refSample, vec3(0.299, 0.587, 0.114));
          referenceMask = smoothstep(0.65, 0.15, refLuminance);
          referenceColor = mix(globalWarm, refSample, 0.85);
        }

        vec2 warp = vUv;
        warp += (vec2(noise(vUv * 12.0 + vec2(0.11, 0.52)), noise(vec2(vUv.y, vUv.x) * 12.0 + vec2(0.36, -0.29))) - 0.5) * 0.02;

        float bands = noise(vec2(warp.y, warp.x) * 6.0 + vec2(0.32, -0.44));
        float fbmPattern = 0.0;
        fbmPattern += noise(warp * 8.0 + vec2(0.21, 0.43)) * 0.4;
        fbmPattern += noise(warp * 13.0 - vec2(0.37, 0.16)) * 0.35;
        fbmPattern += noise(warp * 20.0 + vec2(-0.29, 0.61)) * 0.25;
        fbmPattern = fbmPattern / 1.0;
        float micro = noise(warp * 32.0 - vec2(0.41, 0.57));

        float fadeMask = mix(fbmPattern, bands, 0.25);
        fadeMask = smoothstep(0.5, 0.7, fadeMask);
        fadeMask = mix(fadeMask, fadeMask * fadeMask, 0.15);
        fadeMask = mix(fadeMask, smoothstep(0.45, 0.8, micro), 0.15);

        float localFade = fadeMask * amount * 0.18;
        vec3 paperPull = mix(globalWarm, warmPaper, 0.2 + 0.3 * fadeMask);
        float shadowBoost = smoothstep(0.1, 0.85, 1.0 - luminance);
        vec3 lifted = mix(globalWarm, paperPull, localFade * (0.6 + 0.4 * shadowBoost));

        vec3 blended = mix(globalWarm, lifted, localFade);
        blended += vec3((micro - 0.5) * amount * 0.02);
        if (IS_POLAROID && uHasPolaroidAgingMap) {
          float refBlend = clamp(amount * amount * (0.3 + referenceMask * 0.9), 0.0, 1.0);
          blended = mix(blended, referenceColor, refBlend);
        }

        return clamp(blended, 0.0, 1.0);
      }

      vec3 applyMosaicFade(vec3 color, vec3 paper, float mosaicAmount) {
        float amount = clamp(mosaicAmount, 0.0, 1.0);
        float strength = smoothstep(0.05, 1.0, amount);
        if (strength <= 0.0) return color;

        float macro = noise(vUv * 3.0 + vec2(0.21, 0.37));
        float micro = noise(vUv * 30.0 - vec2(0.18, 0.45));
        float fadeMask = smoothstep(0.2, 0.85, macro * 0.65 + micro * 0.35);
        fadeMask = mix(fadeMask, fadeMask * fadeMask, 0.55);

        float luminance = dot(color, vec3(0.299, 0.587, 0.114));
        float darkMask = smoothstep(0.0, 0.7, 1.0 - luminance);

        vec3 warmTarget = paper * vec3(1.15, 1.08, 0.98);
        vec3 coolTarget = paper * vec3(0.62, 0.58, 0.55);
        vec3 agedTint = mix(coolTarget, warmTarget, smoothstep(0.2, 0.9, luminance));
        vec3 gray = vec3(dot(agedTint, vec3(0.299, 0.587, 0.114)));
        vec3 desaturated = mix(agedTint, gray, 0.35 + darkMask * 0.35);

        float fadeAmount = clamp(fadeMask * strength * 1.4, 0.0, 1.0);
        vec3 result = mix(color, desaturated, fadeAmount);

        float peelNoise = smoothstep(0.3, 0.85, noise(vUv * 18.0 + vec2(0.41, 0.2)));
        float peelAmount = clamp(peelNoise * strength * darkMask * 1.1, 0.0, 1.0);
        result = mix(result, paper, peelAmount);

        return result;
      }

      // ========================================
      // MAIN SHADER
      // ========================================

      void main() {
        vec2 uv = vUv;
        float printMask = 1.0;
        vec2 printUv = vUvOriginal;

        float curvedMask = 1.0;
        float printableMask = 1.0;
        float printableMaskRaw = 1.0;
        float silhouetteMask = 1.0;
        if (IS_MAGAZINE && uHasSilhouetteMask) {
          silhouetteMask = texture2D(uSilhouetteMask, vUvOriginal).r;
        }
        ${
          hasPrintArea
            ? `
        const float innerTop = ${preset.sheet.printArea?.top ?? preset.sheet.frameBorderTop ?? 0.05};
        const float innerBottom = ${preset.sheet.printArea?.bottom ?? preset.sheet.frameBorderBottom ?? 0.15};
        const float innerLeft = ${preset.sheet.printArea?.left ?? preset.sheet.frameBorderSide ?? 0.05};
        const float innerRight = ${preset.sheet.printArea?.right ?? preset.sheet.frameBorderSide ?? 0.05};

        vec2 innerOffset = vec2(innerLeft, innerBottom);
        vec2 innerSize = vec2(1.0 - innerLeft - innerRight, 1.0 - innerTop - innerBottom);
        vec2 normalized = (printUv - innerOffset) / innerSize;
        float inside = step(0.0, normalized.x) * step(normalized.x, 1.0) *
                       step(0.0, normalized.y) * step(normalized.y, 1.0);
        if (inside > 0.5) {
          ${autoFitPrintableArea ? `
          printUv = clamp(normalized, 0.0, 1.0);
          ` : `
          float frameAspect = innerSize.x / innerSize.y;
          float photoAspect = max(uImageAspect, 1e-4);
          vec2 fitted = normalized;
          if (photoAspect > frameAspect) {
            float scale = photoAspect / frameAspect;
            fitted.y = (normalized.y - 0.5) * scale + 0.5;
          } else {
            float scale = frameAspect / photoAspect;
            fitted.x = (normalized.x - 0.5) * scale + 0.5;
          }
          printUv = clamp(fitted, 0.0, 1.0);
          `}
          printMask = 1.0;
        } else {
          printMask = 0.0;
        }
        `
            : ''
        }
        if (uHasPrintMaskMap) {
          curvedMask = texture2D(uPrintMaskMap, vUvOriginal).r;
          printMask *= curvedMask;
          printableMaskRaw = curvedMask;
          printableMask = smoothstep(0.1, 0.9, curvedMask);
        }

        // ========================================
        // SYSTEM A: PAPER MATERIAL
        // ========================================

        float glossMask = 0.0;
        if (IS_MAGAZINE && uHasGlossMask) {
          glossMask = texture2D(uGlossMask, vUvOriginal).r;
        }

        float wrinkleFactor = pow(uWrinkles, 1.1);

        // Calculate paper base color
        vec3 baseTint = calculatePaperBase(uPaperColor, uPaperAge, uYellowing, uGrain);
        vec3 smoothPaper = baseTint;
        vec3 magazineBaseColor = baseTint;
        if (uHasPaperBaseMap) {
          vec3 sampledBase = texture2D(uPaperBaseMap, vUvOriginal).rgb;
          if (IS_POLAROID || IS_MAGAZINE) {
            smoothPaper = sampledBase;
            if (IS_MAGAZINE) {
              magazineBaseColor = sampledBase;
            }
          } else if (IS_A4) {
            smoothPaper = mix(sampledBase, baseTint, 0.6);
          } else {
            smoothPaper = mix(sampledBase, baseTint, 0.5);
          }
        }
        float magazinePageMask = 1.0;
        if (IS_MAGAZINE && uHasPrintMaskMap) {
          magazinePageMask = step(0.2, printableMaskRaw);
          vec3 cleaned = mix(smoothPaper, baseTint, 0.65);
          smoothPaper = mix(smoothPaper, cleaned, magazinePageMask);
          float spineMask = clamp(1.0 - magazinePageMask, 0.0, 1.0);
          vec3 spineBright = mix(smoothPaper, vec3(0.98, 0.98, 0.98), spineMask * 0.7);
          smoothPaper = mix(spineBright, cleaned, magazinePageMask);
        }

        vec3 wrinklePaper = smoothPaper;
        vec2 wrinkleColorUv = vUvOriginal;
        vec2 wrinkleDetailUv = vUv;

        if (uHasPaperWrinkleBaseMap) {
          vec3 wrinkleSample = texture2D(uPaperWrinkleBaseMap, wrinkleColorUv).rgb;
          wrinklePaper = mix(wrinkleSample, baseTint, 0.35);
        }

        // Tangent-space normal stack: fiber + paper normal + wrinkle highlights
        vec3 fiberNormal = generatePaperFiberNormal(vUv);
        float fiberMixAmount = mix(0.02, 0.4, clamp(uGrain, 0.0, 1.0));
        vec3 smoothNormal = normalize(mix(vec3(0.0, 0.0, 1.0), fiberNormal, fiberMixAmount));

        if (uHasPaperNormalMap) {
          vec3 atlasNormal = texture2D(uPaperNormalMap, vUv).xyz * 2.0 - 1.0;
          atlasNormal.xy *= 0.45;
          smoothNormal = normalize(mix(smoothNormal, atlasNormal, 0.6));
        }

        vec3 wrinkleNormal = smoothNormal;
        if (uHasWrinkleNormalMap) {
          vec3 wrinkleSample = texture2D(uWrinkleNormalMap, wrinkleDetailUv).xyz * 2.0 - 1.0;
          wrinkleSample.xy *= 0.8;
          wrinkleNormal = normalize(wrinkleSample);
        }

        vec3 tangentNormal = normalize(mix(smoothNormal, wrinkleNormal, wrinkleFactor));

        mat3 TBN = mat3(vTangent, vBitangent, vNormal);
        vec3 microWorld = normalize(TBN * tangentNormal);
        vec3 worldNormal = normalize(mix(vNormal, microWorld, 0.35));

        // Lighting influenced by roughness map (if available)
        float roughnessSample = uHasPaperRoughnessMap ? texture2D(uPaperRoughnessMap, vUv).r : 0.35;
        vec3 lightDir = normalize(vec3(0.5, 0.7, 1.0));
        float ndotl = max(dot(worldNormal, lightDir), 0.0);
        float lighting = mix(0.96 - roughnessSample * 0.03, 1.15 - roughnessSample * 0.02, ndotl);
        vec3 litSmooth = smoothPaper * (lighting + 0.05);
        vec3 litWrinkle = wrinklePaper * (lighting + 0.15);
        float wrinkleMix = wrinkleFactor;
        if (IS_POLAROID) {
          wrinkleMix *= 0.4;
        }
        vec3 litPaper = mix(litSmooth, litWrinkle, wrinkleMix);
        if (IS_MAGAZINE && uHasPrintMaskMap) {
          litPaper = mix(magazineBaseColor, litPaper, magazinePageMask);
        }
        litPaper = clamp(litPaper, 0.0, 1.1);

        // ========================================
        // SYSTEM B: PRINT ENGINE
        // ========================================

        float printBlend = 0.0;
        vec3 printedResult = litPaper;

        if (uHasImage) {
          // Sample photo as INK using ORIGINAL undeformed UV (stable, no stretching)
          vec4 imageColor = texture2D(uImageTexture, printUv);
          vec3 inkColor = imageColor.rgb;
          ${
            preset.id === 'a4'
              ? `
          inkColor = mix(inkColor, vec3(dot(inkColor, vec3(0.333))), 0.08);
          inkColor = mix(inkColor, vec3(1.0), 0.02);
          `
              : `
          // Step 1: Apply dot gain (ink absorption)
          inkColor = applyDotGain(inkColor, uAbsorb * 0.35);
          inkColor = mix(inkColor, vec3(1.0), 0.04);
          `
          }

          // Step 2: Add warmth (ink color shift)
          inkColor = mix(inkColor, inkColor * vec3(1.0, 0.98, 0.95), uWarmth);

          // Step 3: Apply ink density compositing (multiply with paper)
          float inkDensity = min(pow(uPrintStrength, 0.65) * uInkStrength * uMaxPrintDensity, 1.0);
          printedResult = applyInkDensity(litPaper, inkColor, inkDensity);
          if (IS_A4) {
            printedResult = mix(
              printedResult,
              pow(clamp(printedResult * 1.08, 0.0, 1.2), vec3(0.94)),
              0.35
            );
          }

          // Step 4: Apply print grain
          printedResult = applyPrintGrain(printedResult, vUv, uGrain);

          ${preset.id === 'a4' ? `
          printedResult = mix(printedResult, vec3(dot(printedResult, vec3(0.333))), 0.06);
          printedResult = clamp(printedResult + vec3(0.01), 0.0, 1.0);
          ` : ''}

          printBlend = 1.0;
          ${
            hasPrintArea
              ? `
          printBlend *= printMask;
          `
              : ''
          }
        }

        if (IS_MAGAZINE) {
          vec3 magazinePrinted = printedResult;
          vec3 magazineFinal = mix(magazineBaseColor, magazinePrinted, printableMaskRaw);
          float magazineAlpha = uOpacity;
          if (uHasSilhouetteMask) {
            magazineAlpha *= silhouetteMask;
          }
          gl_FragColor = vec4(clamp(magazineFinal, 0.0, 1.0), magazineAlpha);
          return;
        }

        vec3 finalColor = mix(litPaper, printedResult, printBlend);
        if (IS_MAGAZINE && uHasSilhouetteMask) {
          // already handled above
        }
        if (IS_MAGAZINE && glossMask > 0.001) {
          vec3 viewDir = normalize(-vViewPosition);
          vec3 halfDir = normalize(lightDir + viewDir);
          float ndoth = max(dot(worldNormal, halfDir), 0.0);
          float specPower = mix(24.0, 120.0, clamp(glossMask, 0.0, 1.0));
          float spec = pow(ndoth, specPower) * (0.25 + glossMask * 1.25);
          float specMask = uHasPrintMaskMap ? printableMask * magazinePageMask : 1.0;
          vec3 specColor = vec3(1.0, 1.02, 1.04) * spec * specMask * silhouetteMask;
          finalColor = clamp(finalColor + specColor, 0.0, 1.3);
        }
        vec3 preAgingColor = finalColor;

        // Global aging - always affects final composite
        finalColor = applyInkFade(finalColor, litPaper, uPaperAge);
        if (IS_POLAROID && uHasImage) {
          float ageAmount = clamp(uPaperAge, 0.0, 1.0);
          float limitedFade = ageAmount * 0.3;
          float regionMix = mix(1.0, limitedFade, printMask);
          finalColor = mix(preAgingColor, finalColor, regionMix);
        }

        // Optional mosaic fading overlay
        finalColor = applyMosaicFade(finalColor, smoothPaper, uMosaicFade);

        // Edge outline + backside shading to fake thin thickness
        float edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
        float outline = smoothstep(0.05, 0.0, edgeDist);
        if(!IS_MAGAZINE) {
          float edgeAmount = outline * 0.35 * smoothstep(0.75, 1.0, wrinkleFactor);
          vec3 edgeTint = mix(vec3(1.0), vec3(0.96, 0.96, 0.93), edgeAmount);
          finalColor *= edgeTint;
        }

        if(!IS_POLAROID && !IS_A4 && !IS_MAGAZINE) {
          float shadow = smoothstep(0.2, 0.02, edgeDist);
          shadow = mix(shadow * 0.6, shadow, wrinkleFactor);
          vec3 darkened = finalColor * vec3(0.82, 0.82, 0.85);
          finalColor = mix(finalColor, darkened, clamp(shadow, 0.0, 1.0));
        }

        if(!gl_FrontFacing) {
          finalColor *= vec3(0.97, 0.97, 0.99);
        }

        if (!IS_MAGAZINE && uHasPrintMaskMap) {
          float areaMask = smoothstep(0.02, 0.98, printableMaskRaw);
          finalColor = mix(smoothPaper, finalColor, areaMask);
        }

        // Clamp and output
        finalColor = clamp(finalColor, 0.0, 1.0);

        float finalAlpha = uOpacity;
        if (IS_MAGAZINE && uHasSilhouetteMask) {
          float clipMask = smoothstep(0.02, 0.12, silhouetteMask);
          finalAlpha *= clipMask;
        }

        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `;

    return new THREE.ShaderMaterial({
      uniforms: {
        uPaperColor: { value: new THREE.Color(paperColor) },
        uImageTexture: { value: null },
        uHasImage: { value: false },
        uPrintStrength: { value: printStrength / 100 },
        uPaperAge: { value: paperAge / 100 },
        uMosaicFade: { value: mosaicFading / 100 },
        uGrain: { value: grain / 100 },
        uWrinkles: { value: wrinkles / 100 },
        uTime: { value: 0 },
        uPaperBaseMap: { value: null },
        uHasPaperBaseMap: { value: false },
        uPaperWrinkleBaseMap: { value: null },
        uHasPaperWrinkleBaseMap: { value: false },
        uPaperNormalMap: { value: null },
        uHasPaperNormalMap: { value: false },
        uPaperRoughnessMap: { value: null },
        uHasPaperRoughnessMap: { value: false },
        uWrinkleHeightMap: { value: null },
        uHasWrinkleHeightMap: { value: false },
        uWrinkleNormalMap: { value: null },
        uHasWrinkleNormalMap: { value: false },
        uGlossMask: { value: null },
        uHasGlossMask: { value: false },
        uPrintMaskMap: { value: null },
        uHasPrintMaskMap: { value: false },
        uSilhouetteMask: { value: null },
        uHasSilhouetteMask: { value: false },
        uPolaroidAgingMap: { value: null },
        uHasPolaroidAgingMap: { value: false },
        uInkStrength: { value: preset.print.inkStrength },
        uAbsorb: { value: preset.print.absorb },
        uWarmth: { value: preset.print.warmth },
        uMaxPrintDensity: { value: preset.print.maxDensity ?? 1 },
        uImageAspect: { value: imageAspectRatio || 1 },
        uYellowing: { value: preset.aging.yellowing },
        uBlendMode: {
          value:
            preset.print.blendMode === 'multiply'
              ? 0
              : preset.print.blendMode === 'overlay'
                ? 1
                : 2,
        },
        uRoughness: { value: preset.material.roughness },
        uMetalness: { value: preset.material.metalness },
        uOpacity: { value: preset.material.opacity },
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide, // DoubleSide to prevent disappearing faces
      transparent: preset.material.opacity < 1.0, // Only transparent for tracing paper
      opacity: preset.material.opacity,
      depthWrite: true, // Always write to depth buffer to prevent artifacts
      depthTest: true,  // Always test depth for correct layering
      depthFunc: THREE.LessEqualDepth, // Standard depth comparison
    });
  }, [preset.id, autoFitPrintableArea, hasPrintArea]);

  // Update uniforms when props change (shared uniforms, so only update once)
  useEffect(() => {
    if (material.uniforms) {
      material.uniforms.uPaperColor.value = new THREE.Color(paperColor);
      material.uniforms.uPrintStrength.value = printStrength / 100;
      material.uniforms.uPaperAge.value = paperAge / 100;
      material.uniforms.uMosaicFade.value = mosaicFading / 100;
      material.uniforms.uGrain.value = grain / 100;
      material.uniforms.uWrinkles.value = wrinkles / 100;
      material.uniforms.uImageAspect.value = imageAspectRatio || 1;
    }
  }, [material, paperColor, printStrength, paperAge, grain, wrinkles, mosaicFading, imageAspectRatio]);

  useEffect(() => {
    if (!material.uniforms) return;
    material.uniforms.uPaperBaseMap.value = paperTextures.baseColor;
    material.uniforms.uHasPaperBaseMap.value = !!paperTextures.baseColor;
    material.uniforms.uPaperNormalMap.value = paperTextures.normal;
    material.uniforms.uHasPaperNormalMap.value = !!paperTextures.normal;
    material.uniforms.uPaperWrinkleBaseMap.value = paperTextures.wrinkleBase;
    material.uniforms.uHasPaperWrinkleBaseMap.value = !!paperTextures.wrinkleBase;
    material.uniforms.uPaperRoughnessMap.value = paperTextures.roughness;
    material.uniforms.uHasPaperRoughnessMap.value = !!paperTextures.roughness;
    material.uniforms.uWrinkleHeightMap.value = paperTextures.wrinkleHeight;
    material.uniforms.uHasWrinkleHeightMap.value = !!paperTextures.wrinkleHeight;
    material.uniforms.uWrinkleNormalMap.value = paperTextures.wrinkleNormal;
    material.uniforms.uHasWrinkleNormalMap.value = !!paperTextures.wrinkleNormal;
    material.uniforms.uPolaroidAgingMap.value = paperTextures.polaroidAging;
    material.uniforms.uHasPolaroidAgingMap.value = !!paperTextures.polaroidAging;
    material.uniforms.uGlossMask.value = paperTextures.glossMask;
    material.uniforms.uHasGlossMask.value = !!paperTextures.glossMask;
    material.uniforms.uPrintMaskMap.value = paperTextures.printMask;
    material.uniforms.uHasPrintMaskMap.value = !!paperTextures.printMask;
    material.uniforms.uSilhouetteMask.value = paperTextures.silhouetteMask;
    material.uniforms.uHasSilhouetteMask.value = !!paperTextures.silhouetteMask;
    material.needsUpdate = true;
  }, [material, paperTextures]);

  // Load uploaded image (shared uniforms, so only update once)
  useEffect(() => {
    if (uploadedImage && material.uniforms) {
      const loader = new THREE.TextureLoader();
      loader.load(uploadedImage, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 8;
        texture.needsUpdate = true;
        material.uniforms.uImageTexture.value = texture;
        material.uniforms.uHasImage.value = true;
        material.needsUpdate = true;
      });
    } else if (material.uniforms) {
      material.uniforms.uHasImage.value = false;
      material.needsUpdate = true;
    }
  }, [uploadedImage, material]);

  // Animate time uniform (shared uniforms, so only update once)
  useFrame((state) => {
    if (material.uniforms) {
      material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  // Create solid shell geometry (top + bottom surfaces + side walls)
  const geometry = useMemo(() => {
    const segX = 140;
    const segY = Math.max(1, Math.floor(segX / aspectRatio));

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let iy = 0; iy <= segY; iy++) {
      const v = iy / segY;
      for (let ix = 0; ix <= segX; ix++) {
        const u = ix / segX;
        const x = (u - 0.5) * width;
        const y = (v - 0.5) * height;

        positions.push(x, y, 0);
        normals.push(0, 0, 1);
        uvs.push(u, v);
      }
    }

    const stride = segX + 1;
    for (let iy = 0; iy < segY; iy++) {
      for (let ix = 0; ix < segX; ix++) {
        const a = iy * stride + ix;
        const b = (iy + 1) * stride + ix;
        const c = a + 1;
        const d = b + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeBoundingSphere();

    return geo;
  }, [width, height, aspectRatio]);

  return (
    <mesh
      ref={meshRef}
      material={material}
      geometry={geometry}
      castShadow={preset.material.opacity >= 1.0}
      receiveShadow
    />
  );
}
