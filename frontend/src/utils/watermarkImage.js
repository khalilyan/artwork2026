import logoUrl from '../assets/images/logo.png';

const watermarkText = 'ARTWORK.AM';

function extensionFromMime(mimeType) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function getSafeFilename(filename = 'artwork-image.jpg', mimeType = 'image/jpeg') {
  const extension = extensionFromMime(mimeType);
  const cleanName = filename
    .replace(/[?#].*$/, '')
    .split('/')
    .pop()
    ?.replace(/\.[a-z0-9]+$/i, '');

  return `${cleanName || 'artwork-image'}-artwork.${extension}`;
}

function loadCanvasImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Չհաջողվեց պատրաստել նկարը ներբեռնման համար։'));
    image.src = source;
  });
}

function canvasToBlob(canvas, mimeType, quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error('Չհաջողվեց ստեղծել watermark-ով նկարը։'));
    }, mimeType, quality);
  });
}

async function imageSourceToDrawableUrl(source) {
  if (!source || source.startsWith('data:') || source.startsWith('blob:')) {
    return { url: source, revoke: () => {} };
  }

  const absoluteUrl = new URL(source, window.location.origin).href;
  const response = await fetch(absoluteUrl, { mode: 'cors' });

  if (!response.ok) {
    throw new Error('Չհաջողվեց բեռնել նկարը ներբեռնման համար։');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  return {
    url,
    revoke: () => URL.revokeObjectURL(url),
  };
}

function drawCenteredWatermark(context, canvas, logo) {
  const shortestSide = Math.min(canvas.width, canvas.height);
  const logoSize = Math.max(42, Math.round(shortestSide * 0.1));
  const textSize = Math.max(16, Math.round(shortestSide * 0.034));
  const gap = Math.max(5, Math.round(shortestSide * 0.007));
  const totalHeight = logoSize + gap + textSize;
  const startY = (canvas.height - totalHeight) / 2;
  const centerX = canvas.width / 2;

  context.save();
  context.globalAlpha = 0.5;

  if (logo) {
    context.drawImage(logo, centerX - logoSize / 2, startY, logoSize, logoSize);
  }

  context.font = `500 ${textSize}px Arial, Helvetica, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.letterSpacing = `${Math.max(1, Math.round(textSize * 0.16))}px`;
  context.fillStyle = '#1f1712';
  context.fillText(watermarkText, centerX, startY + logoSize + gap + textSize / 2);

  context.restore();
}

export async function createWatermarkedImage(source, options = {}) {
  const mimeType = options.mimeType ?? 'image/jpeg';
  const drawable = await imageSourceToDrawableUrl(source);

  try {
    const [image, logo] = await Promise.all([
      loadCanvasImage(drawable.url),
      loadCanvasImage(logoUrl).catch(() => null),
    ]);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawCenteredWatermark(context, canvas, logo);

    return canvasToBlob(canvas, mimeType);
  } finally {
    drawable.revoke();
  }
}

export async function downloadWatermarkedImage(source, filename, options = {}) {
  const mimeType = options.mimeType ?? (String(source).startsWith('data:image/png') ? 'image/png' : 'image/jpeg');
  const blob = await createWatermarkedImage(source, { mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = getSafeFilename(filename, mimeType);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
