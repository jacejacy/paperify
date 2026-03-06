'use client';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  swatches?: string[];
}

export default function ColorPicker({
  label,
  value,
  onChange,
  swatches = ['#ffffff', '#f9f7f4', '#faf8f3', '#c9a66b', '#e8dcc4'],
}: ColorPickerProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
        />
        <div className="flex gap-1.5">
          {swatches.map((swatch) => (
            <button
              key={swatch}
              onClick={() => onChange(swatch)}
              className={`w-7 h-7 rounded border-2 transition-all ${
                value.toLowerCase() === swatch.toLowerCase()
                  ? 'border-gray-900 scale-110'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              style={{ backgroundColor: swatch }}
              title={swatch}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
