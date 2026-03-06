'use client';

interface ViewToggleProps {
  viewMode: '2d' | '3d';
  onChange: (mode: '2d' | '3d') => void;
}

export default function ViewToggle({ viewMode, onChange }: ViewToggleProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">View Mode</label>
      <div className="flex gap-2">
        <button
          onClick={() => onChange('3d')}
          className={`flex-1 px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${
            viewMode === '3d'
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
          }`}
        >
          3D View
        </button>
        <button
          onClick={() => onChange('2d')}
          className={`flex-1 px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${
            viewMode === '2d'
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
          }`}
        >
          2D View
        </button>
      </div>
    </div>
  );
}
