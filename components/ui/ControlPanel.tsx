'use client';

import { PaperState } from '@/lib/types';
import { getPresetList } from '@/lib/presets';
import Slider from './Slider';
import ColorPicker from './ColorPicker';
import PresetPicker from './PresetPicker';
import ViewToggle from './ViewToggle';

interface ControlPanelProps {
  state: PaperState;
  onUpload: (file: File) => void;
  onPresetChange: (presetId: string) => void;
  onPaperAgeChange: (value: number) => void;
  onWrinklesChange: (value: number) => void;
  onPaperColorChange: (value: string) => void;
  onPrintStrengthChange: (value: number) => void;
  onGrainChange: (value: number) => void;
  onMosaicFadeChange: (value: number) => void;
  onGlossStrengthChange: (value: number) => void;
  onViewModeChange: (mode: '2d' | '3d') => void;
  onReset: () => void;
  onDownloadPNG: () => void;
}

export default function ControlPanel({
  state,
  onUpload,
  onPresetChange,
  onPaperAgeChange,
  onWrinklesChange,
  onPaperColorChange,
  onPrintStrengthChange,
  onGrainChange,
  onMosaicFadeChange,
  onGlossStrengthChange,
  onViewModeChange,
  onReset,
  onDownloadPNG,
}: ControlPanelProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = '';
    }
  };

  const isMagazinePreset = state.activePreset === 'magazine';

  return (
  <div className="w-full md:w-80 md:h-screen bg-white md:border-r border-gray-200 md:overflow-y-auto">
      <div className="p-6 space-y-6 animate-fadeIn">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PaperPrint Studio</h1>
          <p className="text-sm text-gray-500 mt-1">
            Transform photos into realistic paper prints
          </p>
        </div>

        {/* Upload */}
        <div>
          <label
            htmlFor="file-upload"
            className="block w-full px-4 py-3 text-center text-sm font-medium text-white bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
          >
            {state.uploadedImage ? 'Change Photo' : 'Upload Photo'}
          </label>
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Preset Picker */}
        <PresetPicker
          presets={getPresetList()}
          activePreset={state.activePreset}
          onSelect={onPresetChange}
        />

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Sliders */}
        <div className="space-y-4">
          {!isMagazinePreset && (
            <>
              <Slider
                label="Paper Age"
                value={state.paperAge}
                min={0}
                max={100}
                onChange={onPaperAgeChange}
              />
              <Slider
                label="Wrinkles"
                value={state.wrinkles}
                min={0}
                max={100}
                onChange={onWrinklesChange}
              />
              <ColorPicker
                label="Paper Color"
                value={state.paperColor}
                onChange={onPaperColorChange}
              />
            </>
          )}
          <Slider
            label="Print Strength"
            value={state.printStrength}
            min={0}
            max={100}
            onChange={onPrintStrengthChange}
          />
          {isMagazinePreset && (
            <Slider
              label="Highlight Strength"
              value={state.magazineGlossStrength}
              min={0}
              max={150}
              onChange={onGlossStrengthChange}
            />
          )}
          {!isMagazinePreset && (
            <>
              <Slider
                label="Grain/Noise"
                value={state.grain}
                min={0}
                max={100}
                onChange={onGrainChange}
              />
              <Slider
                label="Mosaic Fading"
                value={state.mosaicFading}
                min={0}
                max={100}
                onChange={onMosaicFadeChange}
              />
            </>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* View Toggle */}
        {!isMagazinePreset && (
          <ViewToggle viewMode={state.viewMode} onChange={onViewModeChange} />
        )}

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onReset}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-400 transition-all"
          >
            Reset to Preset Defaults
          </button>
          <button
            onClick={onDownloadPNG}
            disabled={!state.uploadedImage}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}
