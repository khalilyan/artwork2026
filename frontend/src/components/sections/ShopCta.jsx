import { useState } from 'react';
import { motion } from 'framer-motion';
import { easeOutExpo, fadeUp, staggerGroup, viewportReveal } from '../../utils/motion.js';
import ctaBackgroundImage from '../../assets/images/cta_background.png';

const drawHeading = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.16,
      delayChildren: 0.08,
    },
  },
};

const drawLine = {
  hidden: {
    y: '110%',
    opacity: 0,
    filter: 'blur(8px)',
  },
  visible: {
    y: '0%',
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 1,
      ease: easeOutExpo,
    },
  },
};

export default function ShopCta({
  href = '/rooms',
  eyebrow = 'ՎԵՐՋՆԱԿԱՆ ՇԵՇՏԱԴՐՈՒՄ',
  title = 'Ձեր հաջորդ ինտերիերը',
  accentTitle = 'սկսվում է այստեղ',
  buttonText = 'ՄՈՒՏՔ',
  enterText = 'ԽԱՆՈՒԹ',
}) {
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const handlePointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    setParallax({
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
    });
  };

  return (
    <motion.section
      className="shop-cta reveal-section"
      data-reveal
      style={{
        '--cta-parallax-x': `${parallax.x * 14}px`,
        '--cta-parallax-y': `${parallax.y * 10}px`,
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setParallax({ x: 0, y: 0 })}
      variants={staggerGroup}
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
    >
      <div className="shop-cta-bg" aria-hidden="true">
        <img className="shop-cta-bg-image" src={ctaBackgroundImage} alt="" />
      </div>

      <motion.div className="container shop-cta-inner" variants={staggerGroup}>
        <motion.div className="shop-cta-copy" variants={staggerGroup}>
          <motion.p className="label-caps" variants={fadeUp}>{eyebrow}</motion.p>
          <motion.h2 className="shop-cta-draw-heading" data-cursor-target variants={drawHeading}>
            <span className="shop-cta-draw-line">
              <motion.span className="shop-cta-draw-word" variants={drawLine}>{title}</motion.span>
            </span>
            {accentTitle ? (
              <span className="shop-cta-draw-line">
                <motion.span className="shop-cta-draw-word is-accent" variants={drawLine}>{accentTitle}</motion.span>
              </span>
            ) : null}
          </motion.h2>
        </motion.div>

        <motion.div className="shop-cta-action" variants={fadeUp}>
          <motion.a className="shop-button" href={href} variants={fadeUp}>
            <span className="shop-button-ring" aria-hidden="true" />
            <span className="shop-button-core">
              <span className="shop-button-text-track">
                <span className="label-caps">{buttonText}</span>
                <span className="label-caps">{enterText}</span>
              </span>
              <span className="shop-button-stroke" aria-hidden="true" />
              <span className="shop-button-arrow" aria-hidden="true">↗</span>
            </span>
          </motion.a>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
