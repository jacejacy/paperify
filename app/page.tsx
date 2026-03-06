  'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ControlPanel from '@/components/ui/ControlPanel';
import Fallback2D from '@/components/scene/Fallback2D';
import Magazine2D from '@/components/scene/Magazine2D';
import { PaperState } from '@/lib/types';
import { getPreset } from '@/lib/presets';
import { downloadCanvasAsImage } from '@/lib/image';
import { isWebGLSupported } from '@/lib/webgl';

const Scene = dynamic(() => import('@/components/scene/Scene'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="text-gray-500">Loading 3D renderer...</div>
    </div>
  ),
});

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  const initialPreset = getPreset('a4');
  const magazineDefaults = getPreset('magazine').defaults;
  const defaultGlossStrength = magazineDefaults.glossStrength ?? 70;
  const [state, setState] = useState<PaperState>({
    activePreset: 'a4',
    uploadedImage: null,
    imageAspectRatio: undefined,
    paperAge: initialPreset.defaults.paperAge,
    wrinkles: initialPreset.defaults.wrinkles,
    paperColor: initialPreset.defaults.paperColor,
    printStrength: initialPreset.defaults.printStrength,
    grain: initialPreset.defaults.grain,
    mosaicFading: initialPreset.defaults.mosaicFading,
    magazineGlossStrength: defaultGlossStrength,
    viewMode: '3d',
    isLoading: false,
  });

  useEffect(() => {
    setHasWebGL(isWebGLSupported());
  }, []);

  const handleUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height || 1;
        setState((prev) => ({
          ...prev,
          uploadedImage: result,
          imageAspectRatio: aspectRatio,
        }));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePresetChange = useCallback(
    (presetId: string) => {
      const preset = getPreset(presetId);
      const glossDefault =
        preset.id === 'magazine'
          ? preset.defaults.glossStrength ?? defaultGlossStrength
          : state.magazineGlossStrength;

      setState((prev) => ({
        ...prev,
        activePreset: presetId,
        paperAge: preset.defaults.paperAge,
        wrinkles: preset.defaults.wrinkles,
        paperColor: preset.defaults.paperColor,
        printStrength: preset.defaults.printStrength,
        grain: preset.defaults.grain,
        mosaicFading: preset.defaults.mosaicFading,
        magazineGlossStrength: glossDefault,
      }));
    },
    [defaultGlossStrength, state.magazineGlossStrength]
  );

  const handleReset = useCallback(() => {
    const preset = getPreset(state.activePreset);
    const glossDefault =
      preset.id === 'magazine'
        ? preset.defaults.glossStrength ?? defaultGlossStrength
        : state.magazineGlossStrength;
    setState((prev) => ({
      ...prev,
      paperAge: preset.defaults.paperAge,
      wrinkles: preset.defaults.wrinkles,
      paperColor: preset.defaults.paperColor,
      printStrength: preset.defaults.printStrength,
      grain: preset.defaults.grain,
      mosaicFading: preset.defaults.mosaicFading,
      magazineGlossStrength: glossDefault,
    }));
  }, [defaultGlossStrength, state.activePreset, state.magazineGlossStrength]);

  const handleDownloadPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadCanvasAsImage(canvas, 'paperprint-export.png');
  }, []);

  const activePreset = getPreset(state.activePreset);

  return (
  <div className="flex flex-col md:flex-row h-[100dvh] w-screen overflow-hidden bg-white">
    {/* Controls */}
    <aside className="w-full md:w-[360px] border-b md:border-b-0 md:border-r">
      <div className="max-h-[45dvh] md:max-h-none overflow-auto">
        <ControlPanel
          state={state}
          onUpload={handleUpload}
          onPresetChange={handlePresetChange}
          onPaperAgeChange={(val) => setState((prev) => ({ ...prev, paperAge: val }))}
          onWrinklesChange={(val) => setState((prev) => ({ ...prev, wrinkles: val }))}
          onPaperColorChange={(val) => setState((prev) => ({ ...prev, paperColor: val }))}
          onPrintStrengthChange={(val) =>
            setState((prev) => ({ ...prev, printStrength: val }))
          }
          onGrainChange={(val) => setState((prev) => ({ ...prev, grain: val }))}
          onMosaicFadeChange={(val) => setState((prev) => ({ ...prev, mosaicFading: val }))}
          onGlossStrengthChange={(val) =>
            setState((prev) => ({ ...prev, magazineGlossStrength: val }))
          }
          onViewModeChange={(mode) => setState((prev) => ({ ...prev, viewMode: mode }))}
          onReset={handleReset}
          onDownloadPNG={handleDownloadPNG}
        />
      </div>
    </aside>

    {/* Preview */}
    <main className="flex-1 min-h-0">
      <div className="h-[55dvh] md:h-full relative">
        {state.uploadedImage ? (
          hasWebGL ? (
            state.activePreset === 'magazine' ? (
              <Magazine2D
                preset={activePreset}
                uploadedImage={state.uploadedImage}
                imageAspectRatio={state.imageAspectRatio}
                printStrength={state.printStrength}
                glossStrength={state.magazineGlossStrength}
                canvasRef={canvasRef}
              />
            ) : (
              <Scene
                preset={activePreset}
                uploadedImage={state.uploadedImage}
                imageAspectRatio={state.imageAspectRatio}
                paperAge={state.paperAge}
                wrinkles={state.wrinkles}
                paperColor={state.paperColor}
                printStrength={state.printStrength}
                grain={state.grain}
                mosaicFading={state.mosaicFading}
                viewMode={state.viewMode}
                canvasRef={canvasRef}
              />
            )
          ) : (
            <Fallback2D
              preset={activePreset}
              uploadedImage={state.uploadedImage}
              paperAge={state.paperAge}
              paperColor={state.paperColor}
              printStrength={state.printStrength}
              grain={state.grain}
              mosaicFading={state.mosaicFading}
            />
          )
        ) : (
          <div className="flex items-center justify-center h-full bg-white">
            <div className="text-center max-w-md px-8">
              <h2 className="text-xl font-medium text-gray-900 mb-2">
                Upload a photo to get started
              </h2>
              <p className="text-gray-500 text-sm">
                Transform any image into a realistic paper print with customizable aging,
                wrinkles, and paper types.
              </p>
            </div>
          </div>
        )}

        <div className="absolute bottom-14 right-8 z-50 rounded bg-white/85 px-2 py-1 text-sm text-gray-500 shadow-sm pointer-events-none">
          Made by: Jace Lin @jacelnn
        </div>
      </div>
    </main>
  </div>
);
}
