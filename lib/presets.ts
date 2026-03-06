import { PaperPreset } from './types';

export const paperPresets: Record<string, PaperPreset> = {
  a4: {
    id: 'a4',
    name: 'A4 Printer Paper',
    sheet: {
      aspectRatio: 1.414,
      thickness: 0.0000001, // Paper-thin - standard printer paper (100x thinner)
      cornerRadius: 0.005,
    },
    material: {
      baseTint: '#f9f7f4',
      roughness: 0.85,
      metalness: 0,
      transmission: 0,
      opacity: 1,
      normalStrength: 0.3,
      displacementStrength: 0.02,
    },
    textures: {
      baseColor: '/textures/paper/a4%20paper/a4_smooth_base.jpg',
      wrinkleBase: '/textures/paper/a4%20paper/a4_wrinkle_ref.png',
      normal: '/textures/paper/a4%20paper/a4_wrinkle_ref.png',
      roughness: '/textures/paper/roughness_generic.png',
      wrinkleHeight: '/textures/paper/a4%20paper/a4_wrinkle_ref.png',
      wrinkleNormal: '/textures/paper/a4%20paper/a4_wrinkle_ref.png',
    },
    print: {
      blendMode: 'multiply',
      inkStrength: 0.95,
      absorb: 0.1,
      inkFade: 0.1,
      grain: 0.12,
      warmth: 0.07,
      maxDensity: 0.85,
    },
    aging: {
      yellowing: 0.2,
      damage: 0.15,
      stains: 0.1,
      edgeWear: 0.2,
      fadeIrregularity: 0.15,
    },
    defaults: {
      paperAge: 0,
      wrinkles: 0,
      paperColor: '#f9f7f4',
      printStrength: 100,
      grain: 15,
      mosaicFading: 0,
    },
  },

  kraft: {
    id: 'kraft',
    name: 'Kraft Paper',
    sheet: {
      aspectRatio: 1.414,
      thickness: 0.00000015, // Heavier paper - kraft paper (100x thinner)
      cornerRadius: 0.003,
    },
    material: {
      baseTint: '#c9a66b',
      roughness: 0.95,
      metalness: 0,
      transmission: 0,
      opacity: 1,
      normalStrength: 0.5,
      displacementStrength: 0.04,
    },
    textures: {
      baseColor: '/textures/paper/kraft%20paper/smooth_base.png',
      wrinkleBase: '/textures/paper/kraft%20paper/wrinkle_ref.png',
      normal: '/textures/paper/kraft%20paper/wrinkle_ref.png',
      roughness: '/textures/paper/roughness_generic.png',
      wrinkleHeight: '/textures/paper/kraft%20paper/wrinkle_ref.png',
      wrinkleNormal: '/textures/paper/kraft%20paper/wrinkle_ref.png',
    },
    print: {
      blendMode: 'multiply',
      inkStrength: 0.65,
      absorb: 0.5,
      inkFade: 0.2,
      grain: 0.3,
      warmth: 0.25,
      maxDensity: 1,
    },
    aging: {
      yellowing: 0.3,
      damage: 0.3,
      stains: 0.25,
      edgeWear: 0.35,
      fadeIrregularity: 0.25,
    },
    defaults: {
      paperAge: 40,
      wrinkles: 0,
      paperColor: '#f2d6a6',
      printStrength: 65,
      grain: 30,
      mosaicFading: 0,
    },
  },

  tracing: {
    id: 'tracing',
    name: 'Tracing Paper',
    sheet: {
      aspectRatio: 1.414,
      thickness: 0.00000008, // Very thin/delicate - tracing paper (100x thinner)
      cornerRadius: 0.005,
    },
    material: {
      baseTint: '#faf8f3',
      roughness: 0.7,
      metalness: 0,
      transmission: 0.3,
      opacity: 0.85,
      normalStrength: 0.2,
      displacementStrength: 0.015,
    },
    textures: {
      baseColor: '/textures/paper/tracing%20paper/tracing%20paper_smooth_base.png',
      wrinkleBase: '/textures/paper/tracing%20paper/tracing%20paper_wrinkle_ref.png',
      normal: '/textures/paper/tracing%20paper/tracing%20paper_wrinkle_ref.png',
      roughness: '/textures/paper/roughness_generic.png',
      wrinkleHeight: '/textures/paper/tracing%20paper/tracing%20paper_wrinkle_ref.png',
      wrinkleNormal: '/textures/paper/tracing%20paper/tracing%20paper_wrinkle_ref.png',
    },
    print: {
      blendMode: 'softlight',
      inkStrength: 0.55,
      absorb: 0.2,
      inkFade: 0.15,
      grain: 0.1,
      warmth: 0.15,
      maxDensity: 1,
    },
    aging: {
      yellowing: 0.25,
      damage: 0.1,
      stains: 0.08,
      edgeWear: 0.15,
      fadeIrregularity: 0.12,
    },
    defaults: {
      paperAge: 15,
      wrinkles: 0,
      paperColor: '#faf8f3',
      printStrength: 55,
      grain: 10,
      mosaicFading: 0,
    },
  },

  polaroid: {
    id: 'polaroid',
    name: 'Polaroid Photo Paper',
    sheet: {
      aspectRatio: 1070 / 1576,
      thickness: 0.0000002, // Thickest - photo paper with backing (100x thinner)
      cornerRadius: 0.01,
      hasPolaroidFrame: true,
      frameBorderTop: 0.055,
      frameBorderSide: 0.06,
      frameBorderBottom: 0.22,
      autoFitPrintArea: true,
      printArea: {
        top: 0.0614,
        bottom: 0.2239,
        left: 0.05935,
        right: 0.05935,
      },
    },
    material: {
      baseTint: '#ffffff',
      roughness: 0.3,
      metalness: 0,
      transmission: 0,
      opacity: 1,
      normalStrength: 0.1,
      displacementStrength: 0.01,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2,
    },
    textures: {
      baseColor: '/textures/paper/polaroid/polaroid_smooth_base.png',
      wrinkleBase: '/textures/paper/polaroid/polaroid_wrinkle_ref.png',
      normal: '/textures/paper/polaroid/polaroid_wrinkle_ref.png',
      roughness: '/textures/paper/roughness_generic.png',
      wrinkleHeight: '/textures/paper/polaroid/polaroid_wrinkle_ref.png',
      wrinkleNormal: '/textures/paper/polaroid/polaroid_wrinkle_ref.png',
      agingReference: '/textures/paper/polaroid/polaroid_aging_ref.png',
    },
    print: {
      blendMode: 'overlay',
      inkStrength: 0.85,
      absorb: 0.1,
      inkFade: 0.08,
      grain: 0.08,
      warmth: 0.05,
      maxDensity: 1,
    },
    aging: {
      yellowing: 0.15,
      damage: 0.05,
      stains: 0.05,
      edgeWear: 0.1,
      fadeIrregularity: 0.2,
    },
    defaults: {
      paperAge: 10,
      wrinkles: 0,
      paperColor: '#ffffff',
      printStrength: 85,
      grain: 8,
      mosaicFading: 0,
    },
  },

  magazine: {
    id: 'magazine',
    name: 'Glossy Magazine Spread',
    sheet: {
      aspectRatio: 1536 / 1024,
      thickness: 0.00000018,
      cornerRadius: 0.008,
      autoFitPrintArea: true,
      printArea: {
        top: 0.10352,
        bottom: 0.09863,
        left: 0.11589,
        right: 0.11654,
      },
    },
    material: {
      baseTint: '#ffffff',
      roughness: 0.2,
      metalness: 0,
      transmission: 0,
      opacity: 1,
      normalStrength: 0.2,
      displacementStrength: 0.015,
      clearcoat: 0.85,
      clearcoatRoughness: 0.18,
    },
    textures: {
      baseColor: '/textures/paper/magazine/magazine_smooth_base_2.png',
      wrinkleBase: '/textures/paper/magazine/magazine_wrinkle_base.png',
      normal: '/textures/paper/magazine/magazine_wrinkle_base.png',
      roughness: '/textures/paper/roughness_generic.png',
      wrinkleHeight: '/textures/paper/magazine/magazine_wrinkle_base.png',
      wrinkleNormal: '/textures/paper/magazine/magazine_wrinkle_base.png',
      glossMask: '/textures/paper/magazine/magazine_gloss_mask.png',
      printMask: '/textures/paper/magazine/magazine_print_mask.png',
      silhouetteMask: '/textures/paper/magazine/magazine_silhouette_mask.png',
    },
    print: {
      blendMode: 'multiply',
      inkStrength: 0.95,
      absorb: 0.08,
      inkFade: 0.06,
      grain: 0.05,
      warmth: 0.02,
      maxDensity: 0.95,
    },
    aging: {
      yellowing: 0.05,
      damage: 0.02,
      stains: 0.01,
      edgeWear: 0.05,
      fadeIrregularity: 0.05,
    },
    defaults: {
      paperAge: 5,
      wrinkles: 8,
      paperColor: '#ffffff',
      printStrength: 95,
      grain: 5,
      mosaicFading: 0,
      glossStrength: 70,
    },
  },

};

export const getPreset = (id: string): PaperPreset => {
  return paperPresets[id] || paperPresets.a4;
};

export const getPresetList = (): PaperPreset[] => {
  return Object.values(paperPresets);
};
