import { useEffect } from 'react';

export function useCardTilt() {
  useEffect(() => {
    const reduceInteraction = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || window.matchMedia('(hover: none), (pointer: coarse)').matches;

    if (reduceInteraction) return undefined;

    const cards = document.querySelectorAll('[data-card-tilt]');
    const cleanupCallbacks = [];

    cards.forEach((card) => {
      const handleMouseMove = (event) => {
        const rect = card.getBoundingClientRect();
        const pointerX = event.clientX - rect.left;
        const pointerY = event.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (pointerY - centerY) / 34;
        const rotateY = (centerX - pointerX) / 34;

        card.style.transform = `translateY(-6px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      };

      const handleMouseLeave = () => {
        card.style.transform = 'translateY(0) rotateX(0) rotateY(0)';
      };

      card.addEventListener('mousemove', handleMouseMove);
      card.addEventListener('mouseleave', handleMouseLeave);
      cleanupCallbacks.push(() => {
        card.removeEventListener('mousemove', handleMouseMove);
        card.removeEventListener('mouseleave', handleMouseLeave);
      });
    });

    return () => cleanupCallbacks.forEach((cleanup) => cleanup());
  }, []);
}
