'use client';

import { PaperPreset } from '@/lib/types';

interface PresetPickerProps {
  presets: PaperPreset[];
  activePreset: string;
  onSelect: (presetId: string) => void;
}

export default function PresetPicker({
  presets,
  activePreset,
  onSelect,
}: PresetPickerProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Paper Preset</label>
      <div className="grid grid-cols-1 gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            className={`p-3 text-left rounded-lg border-2 transition-all ${
              activePreset === preset.id
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 hover:border-gray-400 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm text-gray-900">
                  {preset.name}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {preset.material.baseTint}
                </div>
              </div>
              <div
                className="w-8 h-8 rounded border border-gray-300"
                style={{
                  backgroundColor: preset.material.baseTint,
                  backgroundImage: preset.textures?.baseColor
                    ? `url(${preset.textures.baseColor})`
                    : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
