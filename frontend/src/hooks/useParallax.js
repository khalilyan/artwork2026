import { useEffect } from 'react';

export function useParallax() {
  useEffect(() => {
    let animationFrame = null;

    const updateParallax = (scrollPosition = window.scrollY) => {
      const scrolledPixels = scrollPosition;
      const parallaxImages = document.querySelectorAll('[data-parallax-image]');
      const roomParallaxImages = document.querySelectorAll('[data-room-parallax]');
      const furnitureParallaxImages = document.querySelectorAll('[data-furniture-parallax]');
      const detailParallaxImages = document.querySelectorAll('[data-detail-parallax]');

      parallaxImages.forEach((image) => {
        const parent = image.closest('.collections-parallax-wrapper') ?? image.parentElement;
        if (!parent) return;

        const parentRect = parent.getBoundingClientRect();
        const parentTop = parentRect.top + scrolledPixels;
        const parentHeight = parent.offsetHeight;
        const isVisible = scrolledPixels + window.innerHeight > parentTop && scrolledPixels < parentTop + parentHeight;

        if (isVisible) {
          const progress = (scrolledPixels + window.innerHeight - parentTop) / (window.innerHeight + parentHeight);
          image.style.setProperty('--parallax-y', `${(progress - 0.5) * 96}px`);
          image.style.setProperty('--parallax-scale', '1');
        }
      });

      roomParallaxImages.forEach((image) => {
        const container = image.closest('.parallax-container');
        const section = image.closest('.room-feature');
        if (!container) return;

        const parentTop = section?.offsetTop ?? container.offsetTop;
        const parentHeight = section?.offsetHeight ?? container.offsetHeight;
        const isVisible = scrolledPixels + window.innerHeight > parentTop && scrolledPixels < parentTop + parentHeight;

        if (isVisible) {
          const distance = scrolledPixels + window.innerHeight - parentTop;
          const percentage = distance / (window.innerHeight + parentHeight);
          const motionDistance = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 0
            : window.innerWidth <= 767
              ? 36
              : window.innerWidth <= 1024
                ? 62
                : 100;
          image.style.setProperty('--parallax-y', `${(percentage - 0.5) * motionDistance}px`);
        }
      });

      furnitureParallaxImages.forEach((image) => {
        const container = image.closest('.parallax-container');
        if (!container) return;

        const parentTop = container.offsetTop;
        const parentHeight = container.offsetHeight;
        const isVisible = scrolledPixels + window.innerHeight > parentTop && scrolledPixels < parentTop + parentHeight;

        if (isVisible) {
          const relativeScrolledPixels = scrolledPixels - parentTop;
          image.style.setProperty('--parallax-y', `${relativeScrolledPixels * 0.15}px`);
          image.style.setProperty('--parallax-scale', '1.03');
        }
      });

      detailParallaxImages.forEach((image) => {
        const container = image.closest('.parallax-container');
        if (!container) return;

        const parentTop = container.offsetTop;
        const parentHeight = container.offsetHeight;
        const isVisible = scrolledPixels + window.innerHeight > parentTop && scrolledPixels < parentTop + parentHeight;

        if (isVisible) {
          const relativeScrolledPixels = scrolledPixels - parentTop;
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const motionFactor = prefersReducedMotion
            ? 0
            : window.innerWidth <= 767
              ? 0.018
              : window.innerWidth <= 1024
                ? 0.028
                : 0.04;
          const scale = window.innerWidth <= 767 ? 1.08 : 1.1;
          image.style.setProperty('--parallax-y', `${relativeScrolledPixels * motionFactor}px`);
          image.style.setProperty('--parallax-scale', `${scale}`);
        }
      });
    };

    const requestParallaxUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(() => {
        updateParallax();
        animationFrame = null;
      });
    };

    updateParallax();
    window.addEventListener('scroll', requestParallaxUpdate, { passive: true });
    window.addEventListener('resize', requestParallaxUpdate, { passive: true });

    return () => {
      window.removeEventListener('scroll', requestParallaxUpdate);
      window.removeEventListener('resize', requestParallaxUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);
}
