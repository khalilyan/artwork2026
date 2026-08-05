import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { easeOutExpo, fadeUp, staggerGroup, viewportReveal } from '../../utils/motion.js';
import notRestavratedImage from '../../assets/images/not-restavrated.jpg';
import restavratedImage from '../../assets/images/restavrated.jpg';
import oldInteriorImage from '../../assets/images/old_interior_image.png';
import newInteriorImage from '../../assets/images/new_interior_image.png';

const restorationImages = [
  notRestavratedImage,
  restavratedImage,
];

const tradeImages = [
  oldInteriorImage,
  newInteriorImage,
];

function BeforeAfterComparison({ beforeImage, afterImage }) {
  const frameRef = useRef(null);
  const [position, setPosition] = useState(50);
  const reduceMotion = useReducedMotion();

  const updatePosition = (clientX) => {
    const frame = frameRef.current;
    if (!frame) return;

    const rect = frame.getBoundingClientRect();
    const nextPosition = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(96, Math.max(4, nextPosition)));
  };

  const handlePointerMove = (event) => {
    if (event.pointerType !== 'mouse' && event.buttons === 0) return;
    updatePosition(event.clientX);
  };

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updatePosition(event.clientX);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setPosition((current) => Math.max(4, current - 4));
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setPosition((current) => Math.min(96, current + 4));
    }
  };

  return (
    <motion.div
      className="before-after-compare"
      ref={frameRef}
      role="slider"
      tabIndex="0"
      aria-label="Վերականգնման առաջ եւ հետո համեմատություն"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={Math.round(position)}
      style={{ '--compare-position': `${position}%` }}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      initial={reduceMotion ? false : { opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportReveal}
      transition={{ duration: 1, ease: easeOutExpo }}
    >
      <img className="before-after-image is-after" src={afterImage} alt="Վերականգնված կահույք" draggable="false" />
      <img className="before-after-image is-before" src={beforeImage} alt="Հին փայտե կահույք" draggable="false" />
    </motion.div>
  );
}

function RestorationLens({ beforeImage, afterImage }) {
  const [lens, setLens] = useState({ x: 50, y: 50, active: false });

  const updateLens = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setLens({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
      active: true,
    });
  };

  return (
    <motion.div
      className={`restoration-lens ${lens.active ? 'is-active' : ''}`}
      style={{ '--lens-x': `${lens.x}%`, '--lens-y': `${lens.y}%` }}
      onPointerEnter={updateLens}
      onPointerMove={updateLens}
      onPointerLeave={() => setLens((current) => ({ ...current, active: false }))}
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 1 } },
      }}
    >
      <img className="restoration-lens-image is-before" src={afterImage} alt="Վերականգնումից առաջ" draggable="false" />
      <img className="restoration-lens-image is-after" src={beforeImage} alt="Վերականգնված կահույք" draggable="false" />
    </motion.div>
  );
}

export function RestorationSection({ images = restorationImages }) {
  const sectionImages = [
    images[0] ?? restorationImages[0],
    images[1] ?? restorationImages[1],
  ];

  return (
    <motion.section
      className="home-restoration-redesign reveal-section"
      data-reveal
      aria-label="Վերականգնման ծառայություն"
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
      variants={staggerGroup}
    >
      <RestorationLens beforeImage={sectionImages[0]} afterImage={sectionImages[1]} />

      <div className="container home-restoration-inner">
        <motion.div className="home-restoration-heading" variants={staggerGroup}>
          <div>
            <motion.p className="label-caps kicker" variants={fadeUp}>ՎԵՐԱԿԱՆԳՆՄԱՆ ԾԱՌԱՅՈՒԹՅՈՒՆ</motion.p>
            <motion.h2 variants={fadeUp}>Նոր կյանք՝ սիրելի կահույքին <em>ՌԵՍՏԱՎՐԱՑԻԱ</em></motion.h2>
          </div>
          <motion.div className="home-restoration-copy" variants={fadeUp}>
            <p>
              Մակերեսների վերականգնում, գործվածքների փոխարինում, փայտի և մետաղի նորոգում, փայլեցում և կառուցվածքային ամրացում՝ կատարված ARTWORK-ի վարպետների կողմից
            </p>
            <a className="home-restoration-button label-caps" href="/contact">ՍԿՍԵԼ ՎԵՐԱԿԱՆԳՆՈՒՄԸ</a>
          </motion.div>
        </motion.div>

        <motion.div className="home-restoration-captions" variants={fadeUp}>
          <span className="label-caps">Նախքան վերականգնումը</span>
          <span className="label-caps">ARTWORK վերականգնումից հետո</span>
        </motion.div>
      </div>
    </motion.section>
  );
}

export function TradeInSection({ images = tradeImages }) {
  const sectionImages = [
    images[0] ?? tradeImages[0],
    images[1] ?? tradeImages[1],
  ];

  return (
    <motion.section
      className="home-service home-service-trade"
      aria-label="Փոխանակման ծառայություն"
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
      variants={staggerGroup}
    >
      <div className="home-service-sticky container">
        <motion.div className="home-service-visual" data-cursor-target variants={fadeUp}>
          <motion.img className="home-service-image is-main is-new" src={sectionImages[1]} alt="Նոր կահույք մինիմալ հյուրասենյակում" variants={fadeUp} />
          <motion.img className="home-service-image is-float is-old" src={sectionImages[0]} alt="Ժամանակակից բազմոց փոխանակման ծրագրի համար" variants={fadeUp} />
          <motion.div className="home-service-chip label-caps" variants={fadeUp}>ՀԻՆ ԿԱՀՈՒՅՔԸ &gt; ՆՈՐԻ ԴԻՄԱՑ</motion.div>
        </motion.div>

        <motion.div className="home-service-copy reveal-section is-active" data-reveal variants={staggerGroup}>
          <motion.p className="label-caps kicker" variants={fadeUp}>ՓՈԽԱՆԱԿՈՒՄ</motion.p>
          <motion.h2 variants={fadeUp}>Յուրաքանչյուր ավարտ՝ նոր սկիզբ <em>Յուրաքանչյուր փոխանակում՝ նոր հնարավորություն</em></motion.h2>
          <motion.p variants={fadeUp}>
            Փոխանակեք ձեր հին կահույքը նոր ARTWORK կահույքի հետ։ Մեր մասնագետները կգնահատեն դրա վիճակը,
            նյութերը և ընդհանուր արժեքը, իսկ հաստատումից հետո այն կվերածվի զեղչի կամ կրեդիտի՝ ձեր հաջորդ գնումների համար
          </motion.p>
          <motion.a className="home-service-button label-caps" href="/contact" variants={fadeUp}>Գնահատել կահույքը</motion.a>
        </motion.div>
      </div>
    </motion.section>
  );
}
