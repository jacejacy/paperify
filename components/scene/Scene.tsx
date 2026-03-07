'use client';

import { Canvas } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei';
import { Suspense, useEffect } from 'react';
import PaperMesh from './PaperMesh';
import { PaperPreset } from '@/lib/types';
import * as THREE from 'three';
import { downloadCanvasAsImage } from '@/lib/image';

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
  exportRequestId?: number;
}

function HighResExporter({ exportRequestId }: { exportRequestId?: number }) {
  const { gl, scene, camera, size } = useThree();

  useEffect(() => {
    if (!exportRequestId || exportRequestId <= 0) return;
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    const paperMesh = scene.getObjectByName('paper-mesh');
    const box = new THREE.Box3();
    if (paperMesh) {
      box.setFromObject(paperMesh);
    } else {
      box.setFromCenterAndSize(new THREE.Vector3(0, 0, 0), new THREE.Vector3(4, 3, 0.1));
    }

    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const boxSize = box.getSize(new THREE.Vector3());
    const worldAspect = boxSize.x > 0 && boxSize.y > 0 ? boxSize.x / boxSize.y : 4 / 3;

    const longEdge = 4096;
    const exportWidth =
      worldAspect >= 1 ? longEdge : Math.max(1, Math.round(longEdge * worldAspect));
    const exportHeight =
      worldAspect >= 1 ? Math.max(1, Math.round(longEdge / worldAspect)) : longEdge;

    const prevPixelRatio = gl.getPixelRatio();
    const prevAspect = camera.aspect;
    const prevZoom = camera.zoom;
    const prevPos = camera.position.clone();
    const prevQuat = camera.quaternion.clone();

    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (exportWidth / exportHeight));
    const minHalfFov = Math.min(vFov / 2, hFov / 2);
    const fitDistance = (sphere.radius / Math.max(Math.sin(minHalfFov), 1e-4)) * 1.08;
    const viewDir = prevPos.clone().sub(sphere.center).normalize();
    if (!Number.isFinite(viewDir.lengthSq()) || viewDir.lengthSq() < 1e-8) {
      viewDir.set(0, 0, 1);
    }

    camera.position.copy(sphere.center.clone().add(viewDir.multiplyScalar(fitDistance)));
    camera.lookAt(sphere.center);
    camera.aspect = exportWidth / exportHeight;
    camera.zoom = 1;
    camera.updateProjectionMatrix();

    gl.setPixelRatio(1);
    gl.setSize(exportWidth, exportHeight, false);
    gl.render(scene, camera);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const exportCtx = exportCanvas.getContext('2d');
    if (exportCtx) {
      exportCtx.drawImage(gl.domElement, 0, 0, exportWidth, exportHeight);
      downloadCanvasAsImage(exportCanvas, 'paperprint-export.png');
    }

    camera.position.copy(prevPos);
    camera.quaternion.copy(prevQuat);
    camera.aspect = prevAspect;
    camera.zoom = prevZoom;
    camera.updateProjectionMatrix();
    gl.setPixelRatio(prevPixelRatio);
    gl.setSize(size.width, size.height, false);
    gl.render(scene, camera);
  }, [camera, exportRequestId, gl, scene, size.height, size.width]);

  return null;
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
  exportRequestId,
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
        <HighResExporter exportRequestId={exportRequestId} />
      </Suspense>
    </Canvas>
  );
}
