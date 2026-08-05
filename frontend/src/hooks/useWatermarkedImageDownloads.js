import { useEffect } from 'react';
import { createWatermarkedImage, downloadWatermarkedImage } from '../utils/watermarkImage.js';

function imageFilenameFromSource(source) {
  if (!source || source.startsWith('data:') || source.startsWith('blob:')) {
    return 'artwork-image.jpg';
  }

  try {
    return new URL(source, window.location.origin).pathname.split('/').pop() || 'artwork-image.jpg';
  } catch {
    return 'artwork-image.jpg';
  }
}

function isDownloadableImage(source = '') {
  return Boolean(source) && !source.includes('logo') && !source.startsWith('blob:');
}

export function useWatermarkedImageDownloads(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return undefined;

    let isDownloading = false;
    const watermarkedUrls = new Map();
    const pendingSources = new Set();
    const swappedImages = new Map();

    const prepareWatermark = async (source) => {
      if (!isDownloadableImage(source) || watermarkedUrls.has(source) || pendingSources.has(source)) return;

      pendingSources.add(source);

      try {
        const blob = await createWatermarkedImage(source);
        watermarkedUrls.set(source, URL.createObjectURL(blob));
      } catch {
        // Keep image protection quiet for customers; failed watermark generation should not interrupt browsing.
      } finally {
        pendingSources.delete(source);
      }
    };

    const prepareVisibleImages = () => {
      document.querySelectorAll('img').forEach((image) => {
        const source = image.dataset.artworkOriginalSrc || image.currentSrc || image.src;
        prepareWatermark(source);
      });
    };

    const restoreSwappedImages = () => {
      swappedImages.forEach((originalSource, image) => {
        image.src = originalSource;
        delete image.dataset.artworkOriginalSrc;
      });
      swappedImages.clear();
    };

    const saveWithWatermark = async (source, filename) => {
      if (!source || isDownloading) return;

      isDownloading = true;

      try {
        await downloadWatermarkedImage(source, filename ?? imageFilenameFromSource(source));
      } catch {
        // Keep image protection quiet for customers; failed watermark generation should not interrupt browsing.
      } finally {
        isDownloading = false;
      }
    };

    const observer = new MutationObserver(prepareVisibleImages);

    const handleDownloadClick = (event) => {
      const link = event.target.closest?.('a[download]');
      const source = link?.getAttribute('href');

      if (!link || !isDownloadableImage(source)) return;

      event.preventDefault();
      saveWithWatermark(source, link.getAttribute('download') || imageFilenameFromSource(source));
    };

    const handleImageContextMenu = (event) => {
      const image = event.target.closest?.('img');
      const source = image?.currentSrc || image?.src;

      if (!image || !isDownloadableImage(source)) return;

      const watermarkedUrl = watermarkedUrls.get(source);
      prepareWatermark(source);

      if (!watermarkedUrl) return;

      image.dataset.artworkOriginalSrc = source;
      swappedImages.set(image, source);
      image.removeAttribute('srcset');
      image.src = watermarkedUrl;
      window.setTimeout(restoreSwappedImages, 30000);
    };

    prepareVisibleImages();
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    document.addEventListener('click', handleDownloadClick, true);
    document.addEventListener('contextmenu', handleImageContextMenu, true);
    document.addEventListener('pointerdown', restoreSwappedImages, true);
    document.addEventListener('keydown', restoreSwappedImages, true);
    window.addEventListener('scroll', restoreSwappedImages, true);

    return () => {
      observer.disconnect();
      restoreSwappedImages();
      document.removeEventListener('click', handleDownloadClick, true);
      document.removeEventListener('contextmenu', handleImageContextMenu, true);
      document.removeEventListener('pointerdown', restoreSwappedImages, true);
      document.removeEventListener('keydown', restoreSwappedImages, true);
      window.removeEventListener('scroll', restoreSwappedImages, true);
      watermarkedUrls.forEach((url) => URL.revokeObjectURL(url));
      watermarkedUrls.clear();
    };
  }, [enabled]);
}
