import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { easeOutExpo } from '../../utils/motion.js';

const heroLoadingDelay = 0.8;

export default function Hero({ slides = [] }) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const heroRef = useRef(null);
  const heroIntroDelayRef = useRef(heroLoadingDelay);
  const hasSlides = slides.length > 0;
  const boundedSlideIndex = hasSlides ? Math.min(activeSlideIndex, slides.length - 1) : 0;
  const activeSlide = hasSlides ? slides[boundedSlideIndex] : null;
  const reduceMotion = useReducedMotion();
  const introDelay = reduceMotion ? 0 : heroIntroDelayRef.current;

  useEffect(() => {
    if (!hasSlides) return undefined;

    if (reduceMotion) {
      heroIntroDelayRef.current = 0;
      return undefined;
    }

    const timer = window.setTimeout(() => {
      heroIntroDelayRef.current = 0;
    }, (heroLoadingDelay + 1.2) * 1000);

    return () => window.clearTimeout(timer);
  }, [hasSlides, reduceMotion]);

  useEffect(() => {
    if (!hasSlides) return undefined;

    const hero = heroRef.current;
    if (!hero) return undefined;

    let animationFrame = null;

    const updateHeroParallax = (scrollPosition = window.scrollY) => {
      const heroTop = hero.offsetTop;
      const heroHeight = hero.offsetHeight;
      const isVisible = scrollPosition + window.innerHeight > heroTop && scrollPosition < heroTop + heroHeight;

      if (!isVisible) return;

      const parallaxY = (scrollPosition - heroTop) * 0.15;
      hero.querySelectorAll('.hero-slide-image').forEach((image) => {
        image.style.setProperty('--hero-parallax-y', `${parallaxY}px`);
      });
    };

    const requestHeroParallax = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(() => {
        updateHeroParallax();
        animationFrame = null;
      });
    };

    updateHeroParallax();
    window.addEventListener('scroll', requestHeroParallax, { passive: true });
    window.addEventListener('resize', requestHeroParallax, { passive: true });

    return () => {
      window.removeEventListener('scroll', requestHeroParallax);
      window.removeEventListener('resize', requestHeroParallax);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [hasSlides, slides]);

  const showPreviousSlide = () => {
    if (!hasSlides) return;
    setActiveSlideIndex((currentIndex) => (currentIndex === 0 ? slides.length - 1 : currentIndex - 1));
  };

  const showNextSlide = () => {
    if (!hasSlides) return;
    setActiveSlideIndex((currentIndex) => (currentIndex + 1) % slides.length);
  };

  if (!activeSlide) return null;

  return (
    <motion.section
      className="hero parallax-container"
      ref={heroRef}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9, delay: introDelay, ease: easeOutExpo }}
    >
      {slides.map((slide, index) => (
        <motion.img
          className={`parallax-image hero-slide-image ${index === activeSlideIndex ? 'is-active' : ''}`}
          src={slide.image}
          alt={slide.title}
          key={slide.title}
          initial={false}
          animate={{
            opacity: index === activeSlideIndex ? 1 : 0,
          }}
          transition={{ duration: 1.15, delay: index === activeSlideIndex ? introDelay : 0, ease: easeOutExpo }}
        />
      ))}
      <div className="hero-overlay">
        <AnimatePresence mode="wait">
          <motion.div
            className="hero-copy mask-reveal is-active"
            data-reveal
            key={activeSlide.title}
            initial={reduceMotion ? false : { opacity: 0, y: 28, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -18, filter: 'blur(6px)' }}
            transition={{ duration: 0.75, delay: introDelay, ease: easeOutExpo }}
          >
            <h1 className="mask-up"><span>{activeSlide.title}</span></h1>
            <motion.p
              className="label-caps"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: introDelay + 0.18, ease: easeOutExpo }}
            >
              {activeSlide.subtitle}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>
      <motion.div
        className="hero-count label-caps"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: introDelay + 0.45, ease: easeOutExpo }}
      >
        {String(activeSlideIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
      </motion.div>
      <motion.div
        className="hero-controls"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: introDelay + 0.55, ease: easeOutExpo }}
      >
        <motion.button className="hero-control" type="button" onClick={showPreviousSlide}>
          <span className="label-caps">ՆԱԽՈՐԴ</span>
          <i />
        </motion.button>
        <motion.button className="hero-control" type="button" onClick={showNextSlide}>
          <i />
          <span className="label-caps">ՀԱՋՈՐԴ</span>
        </motion.button>
      </motion.div>
    </motion.section>
  );
}
