import { useEffect } from 'react';

export function useSmoothScroll(disabled = false) {
  useEffect(() => {
    if (disabled) return undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const smoothContent = document.querySelector('[data-smooth-content]');

    if (prefersReducedMotion || isTouchDevice || !smoothContent) return undefined;

    let currentScroll = window.scrollY;
    let animationFrame = null;

    const setBodyHeight = () => {
      document.body.style.height = `${smoothContent.getBoundingClientRect().height}px`;
    };

    const updateScroll = () => {
      const targetScroll = window.scrollY;
      currentScroll += (targetScroll - currentScroll) * 0.09;
      smoothContent.style.transform = `translate3d(0, ${-currentScroll}px, 0)`;
      window.dispatchEvent(new CustomEvent('artwork:smooth-scroll', { detail: { scrollY: currentScroll } }));
      animationFrame = window.requestAnimationFrame(updateScroll);
    };

    const refresh = () => {
      smoothContent.style.position = 'fixed';
      smoothContent.style.inset = '0 auto auto 0';
      smoothContent.style.width = '100%';
      smoothContent.style.minHeight = '100vh';
      smoothContent.style.willChange = 'transform';
      setBodyHeight();
    };

    refresh();
    updateScroll();

    const resizeObserver = new ResizeObserver(setBodyHeight);
    resizeObserver.observe(smoothContent);
    window.addEventListener('resize', setBodyHeight, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', setBodyHeight);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      document.body.style.height = '';
      smoothContent.style.position = '';
      smoothContent.style.inset = '';
      smoothContent.style.width = '';
      smoothContent.style.minHeight = '';
      smoothContent.style.willChange = '';
      smoothContent.style.transform = '';
    };
  }, [disabled]);
}
