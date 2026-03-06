# PaperPrint Studio

A production-quality web application that transforms any photo into a realistic "printed on paper" effect. View your transformed images as 3D floating paper sheets or flat 2D prints, with full control over paper type, aging, wrinkles, and print characteristics.

![PaperPrint Studio](https://img.shields.io/badge/Next.js-16.1.4-black)
![React Three Fiber](https://img.shields.io/badge/React%20Three%20Fiber-9.5.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

## Features

### 🎨 Realistic Paper Simulation
- **4 Paper Presets**: A4 Printer Paper, Kraft Paper, Tracing Paper, and Polaroid Photo Paper
- **Print Simulation Pipeline**: Layered rendering system simulating ink absorption, bleeding, and paper texture
- **Aging Effects**: Controllable yellowing, damage, stains, and irregular fading
- **Physical Wrinkles**: Real-time displacement mapping for authentic paper deformation

### 🎭 Dual View Modes
- **3D View**: Fully rotatable paper sheet with realistic lighting and shadows
- **2D View**: Flat presentation mode with preserved paper effects and soft shadows
- Both modes use the same WebGL renderer for consistent quality

### 🛠️ Full Creative Control
- **Paper Age** (0-100): Controls yellowing, damage, and fade patterns
- **Wrinkles** (0-100): Physical paper deformation intensity
- **Paper Color**: Custom color picker with preset swatches
- **Print Strength** (0-100): Ink intensity and visibility
- **Grain/Noise** (0-100): Micro-texture detail

### 📥 Export Options
- **Download PNG**: Exports flat final image at original resolution
- **Download Screenshot**: Captures current WebGL canvas view

### ♿ Accessibility
- **WebGL Fallback**: Automatic 2D canvas rendering if WebGL is not supported
- **Responsive Design**: Optimized for various screen sizes

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **3D Rendering**: React Three Fiber + drei
- **Styling**: Tailwind CSS
- **Graphics**: WebGL + Custom GLSL Shaders

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 9.x or higher

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd paperify
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3001](http://localhost:3001) in your browser

### Build for Production

```bash
npm run build
npm run start
```

## Project Structure

```
paperify/
├── app/
│   ├── page.tsx              # Main application page
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── ui/                   # UI components
│   │   ├── ControlPanel.tsx  # Main control panel
│   │   ├── Slider.tsx        # Slider component
│   │   ├── ColorPicker.tsx   # Color picker with swatches
│   │   ├── PresetPicker.tsx  # Paper preset selector
│   │   └── ViewToggle.tsx    # 2D/3D view toggle
│   └── scene/                # 3D scene components
│       ├── Scene.tsx         # Main WebGL scene
│       ├── PaperMesh.tsx     # Paper mesh with custom shader
│       └── Fallback2D.tsx    # 2D fallback renderer
├── lib/
│   ├── types.ts              # TypeScript type definitions
│   ├── presets.ts            # Paper preset configurations
│   ├── image.ts              # Image processing utilities
│   ├── webgl.ts              # WebGL detection
│   └── textureGenerator.ts   # Procedural texture generation
└── public/
    └── textures/             # Placeholder textures
```

## How It Works

### Print Simulation Pipeline

The app uses a multi-layered approach to simulate realistic paper printing:

1. **Paper Base Layer**
   - Base paper color with fiber texture
   - Procedural roughness detail
   - Aging-induced yellowing

2. **Print Layer**
   - Uploaded image processed with ink simulation
   - Blend modes: multiply, overlay, or soft light
   - Ink absorption and bleeding effects
   - Grain and noise addition

3. **Aging Layer**
   - Yellowing transformation (warm tint shift)
   - Damage masks (micro holes, edge wear)
   - Stain overlays (dirt, speckles)
   - Irregular fading patterns

### Shader System

Custom GLSL shaders handle real-time rendering:
- **Vertex Shader**: Applies wrinkle displacement
- **Fragment Shader**: Implements paper texture, print blending, and aging effects

## Adding New Paper Presets

Paper presets are defined in `lib/presets.ts`. To add a new preset:

1. Open `lib/presets.ts`
2. Add a new entry to the `paperPresets` object:

```typescript
myCustomPaper: {
  id: 'myCustomPaper',
  name: 'My Custom Paper',

  sheet: {
    aspectRatio: 1.414,        // Width/height ratio
    thickness: 0.01,            // Visual thickness
    cornerRadius: 0.005,        // Corner rounding
  },

  material: {
    baseTint: '#f0f0f0',        // Base paper color
    roughness: 0.85,            // Surface roughness (0-1)
    metalness: 0,               // Metallic reflection (0-1)
    transmission: 0,            // Light transmission (0-1)
    opacity: 1,                 // Overall opacity (0-1)
    normalStrength: 0.3,        // Normal map intensity
    displacementStrength: 0.02, // Displacement intensity
  },

  textures: {
    normal: '/textures/custom-normal.jpg',
    roughness: '/textures/custom-roughness.jpg',
    displacement: '/textures/custom-displacement.jpg',
  },

  print: {
    blendMode: 'multiply',      // 'multiply' | 'overlay' | 'softlight'
    inkStrength: 0.75,          // Ink intensity (0-1)
    absorb: 0.3,                // Ink absorption/softening (0-1)
    inkFade: 0.1,               // Base fade amount (0-1)
    grain: 0.15,                // Grain intensity (0-1)
    warmth: 0.1,                // Warm tint shift (0-1)
  },

  aging: {
    yellowing: 0.2,             // Yellowing response (0-1)
    damage: 0.15,               // Damage/holes response (0-1)
    stains: 0.1,                // Stain visibility (0-1)
    edgeWear: 0.2,              // Edge deterioration (0-1)
    fadeIrregularity: 0.15,     // Patchy fading (0-1)
  },

  defaults: {
    paperAge: 20,               // Default age slider value
    wrinkles: 15,               // Default wrinkles slider value
    paperColor: '#f0f0f0',      // Default color
    printStrength: 75,          // Default print strength
    grain: 15,                  // Default grain value
  },
},
```

3. The new preset will automatically appear in the preset picker

### Preset Parameters Explained

- **blendMode**: Determines how the print mixes with paper
  - `multiply`: Dark ink, best for general printing
  - `overlay`: Balanced, good for photos
  - `softlight`: Subtle, best for light/transparent papers

- **Roughness vs Metalness**:
  - High roughness = matte finish (printer paper, kraft)
  - Low roughness + clearcoat = glossy finish (photo paper)

- **Transmission + Opacity**: For semi-transparent papers (tracing paper)

## Performance Optimization

- Dynamic imports for 3D components (reduces initial bundle)
- Lower-resolution preview textures during live editing
- Full resolution only used for final PNG export
- Efficient shader compilation and caching

## Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Legacy browsers**: Automatic fallback to 2D canvas rendering

## Contributing

Contributions are welcome! Areas for improvement:
- Additional paper presets
- Real paper texture samples
- Enhanced aging effects
- More export formats

## License

This project is open source and available under the MIT License.

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [drei](https://github.com/pmndrs/drei)
- [Tailwind CSS](https://tailwindcss.com/)
