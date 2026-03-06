export type BlendMode = 'multiply' | 'overlay' | 'softlight';

export interface PaperPreset {
  id: string;
  name: string;

  sheet: {
    aspectRatio: number;
    thickness: number;
    cornerRadius: number;
    hasPolaroidFrame?: boolean;
    frameBorderTop?: number;
    frameBorderSide?: number;
    frameBorderBottom?: number;
    printArea?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    autoFitPrintArea?: boolean;
  };

  material: {
    baseTint: string;
    roughness: number;
    metalness: number;
    transmission: number;
    opacity: number;
    normalStrength: number;
    displacementStrength: number;
    clearcoat?: number;
    clearcoatRoughness?: number;
  };

  textures?: {
    baseColor?: string;
    wrinkleBase?: string;
    normal?: string;
    roughness?: string;
    wrinkleHeight?: string;
    wrinkleNormal?: string;
    agingReference?: string;
    glossMask?: string;
    printMask?: string;
    silhouetteMask?: string;
  };

  print: {
    blendMode: BlendMode;
    inkStrength: number;
    absorb: number;
    inkFade: number;
    grain: number;
    warmth: number;
    maxDensity?: number;
  };

  aging: {
    yellowing: number;
    damage: number;
    stains: number;
    edgeWear: number;
    fadeIrregularity: number;
  };

  defaults: {
    paperAge: number;
    wrinkles: number;
    paperColor: string;
    printStrength: number;
    grain: number;
    mosaicFading: number;
    glossStrength?: number;
  };
}

export interface PaperState {
  activePreset: string;
  uploadedImage: string | null;
  imageAspectRatio?: number;

  // Adjustable parameters
  paperAge: number;
  wrinkles: number;
  paperColor: string;
  printStrength: number;
  grain: number;
  mosaicFading: number;
  magazineGlossStrength: number;

  // View mode
  viewMode: '2d' | '3d';

  // UI state
  isLoading: boolean;
}
