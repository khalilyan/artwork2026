export const easeOutExpo = [0.16, 1, 0.3, 1];

export const viewportReveal = {
  once: true,
  amount: 0.22,
  margin: '0px 0px -80px 0px',
};

export const fadeUp = {
  hidden: { opacity: 0, y: 42 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: easeOutExpo },
  },
};

export const fadeScale = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1, ease: easeOutExpo },
  },
};

export const staggerGroup = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};
