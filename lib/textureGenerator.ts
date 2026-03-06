// Generate procedural placeholder textures for paper effects
export function generatePaperNormalTexture(width = 512, height = 512): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      // Generate fiber-like normal map
      const noise1 = Math.sin(x * 0.1 + y * 0.15) * 0.5 + 0.5;
      const noise2 = Math.sin(x * 0.05 + y * 0.1) * 0.5 + 0.5;
      const fiber = (noise1 * 0.6 + noise2 * 0.4) * 20 + 118;

      data[i] = 128; // R - X normal
      data[i + 1] = 128; // G - Y normal
      data[i + 2] = fiber; // B - Z normal (height)
      data[i + 3] = 255; // A
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

export function generatePaperRoughnessTexture(width = 512, height = 512): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      const random = Math.random();
      const roughness = 200 + random * 55;

      data[i] = roughness;
      data[i + 1] = roughness;
      data[i + 2] = roughness;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

export function generatePaperDisplacementTexture(width = 512, height = 512): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      const noise =
        Math.sin(x * 0.02) * Math.cos(y * 0.03) * 0.3 +
        Math.sin(x * 0.05 + y * 0.04) * 0.3 +
        Math.random() * 0.4;

      const displacement = (noise * 0.5 + 0.5) * 255;

      data[i] = displacement;
      data[i + 1] = displacement;
      data[i + 2] = displacement;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}
