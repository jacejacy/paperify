'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei';
import { Suspense } from 'react';
import PaperMesh from './PaperMesh';
import { PaperPreset } from '@/lib/types';
import * as THREE from 'three';

interface SceneProps {
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
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export default function Scene({
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
  canvasRef,
}: SceneProps) {
  return (
    <Canvas
      ref={canvasRef as any}
      shadows
      camera={
        viewMode === '3d'
          ? { position: [0, 0, 8], fov: 50 }
          : {
              position: [0, 0, 10],
              zoom: 1,
            }
      }
      gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        {/* Lighting - soft angled directional for better wrinkle readability */}
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[3, 4, 6]}
          intensity={0.9}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0001}
          shadow-normalBias={0.02}
        />
        <directionalLight
          position={[-2, 3, 4]}
          intensity={0.4}
        />
        <pointLight position={[-4, 2, 3]} intensity={0.25} />

        {/* Environment for subtle reflections */}
        <Environment preset="studio" />

        {/* Paper */}
          <PaperMesh
            preset={preset}
            uploadedImage={uploadedImage}
            imageAspectRatio={imageAspectRatio}
          paperAge={paperAge}
          wrinkles={wrinkles}
          paperColor={paperColor}
          printStrength={printStrength}
          grain={grain}
          mosaicFading={mosaicFading}
          viewMode={viewMode}
        />

        {/* Contact shadow */}
        <ContactShadows
          position={[0, -2.1, 0]}
          opacity={0.3}
          scale={10}
          blur={2}
          far={4}
        />

        {/* Controls */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={viewMode === '3d'}
          minPolarAngle={viewMode === '3d' ? Math.PI / 4 : Math.PI / 2}
          maxPolarAngle={viewMode === '3d' ? (Math.PI * 3) / 4 : Math.PI / 2}
          minAzimuthAngle={viewMode === '3d' ? -Math.PI / 3 : 0}
          maxAzimuthAngle={viewMode === '3d' ? Math.PI / 3 : 0}
          target={[0, 0, 0]}
        />
      </Suspense>
    </Canvas>
  );
}
