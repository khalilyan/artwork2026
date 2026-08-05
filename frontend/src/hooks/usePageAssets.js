import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

export default function usePageAssets(pageKey, fallbackImages = {}) {
  const [pageImages, setPageImages] = useState(fallbackImages);

  useEffect(() => {
    if (!pageKey) return;

    api.pageAssets(pageKey)
      .then(({ pageAssets }) => setPageImages((currentImages) => ({ ...currentImages, ...pageAssets })))
      .catch(() => {});
  }, [pageKey]);

  return pageImages;
}
