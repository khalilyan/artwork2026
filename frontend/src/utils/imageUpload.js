const maxImageSize = 720;
const imageQuality = 0.72;

export function compressImageFile(file, maxSize = maxImageSize) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('Please choose an image file.'));
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas');

      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(imageUrl);
      resolve(canvas.toDataURL('image/jpeg', imageQuality));
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Could not read the selected image.'));
    };

    image.src = imageUrl;
  });
}

export async function compressImageFiles(files, maxCount = 4) {
  const selectedFiles = Array.from(files ?? []).slice(0, maxCount);
  return Promise.all(selectedFiles.map((file) => compressImageFile(file)));
}
