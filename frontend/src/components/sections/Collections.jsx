import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { collections as fallbackCollections } from '../../data/homepage.js';
import { api } from '../../services/api.js';
import { fadeUp, staggerGroup, viewportReveal } from '../../utils/motion.js';

function normalizeCollection(collection, index) {
  return {
    title: collection.title ?? collection.name ?? `Հավաքածու ${index + 1}`,
    subtitle: collection.subtitle ?? collection.description ?? 'Կուրացված շարք',
    image: collection.image ?? collection.heroImage ?? fallbackCollections[index % fallbackCollections.length]?.image,
    href: collection.href ?? `/${collection.slug}`,
  };
}

function pickRandomCollections(nextCollections, limit = 3) {
  return [...nextCollections]
    .map((collection) => ({ collection, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, limit)
    .map(({ collection }) => collection);
}

function CollectionCard({ collection, index }) {
  const cardRef = useRef(null);
  const isMiddle = index % 3 === 1;
  const parallaxDistance = isMiddle ? 150 : 96;
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [parallaxDistance, -parallaxDistance]);

  return (
    <motion.div
      className={`collection-card-parallax ${isMiddle ? 'is-middle' : 'is-side'}`}
      ref={cardRef}
      style={{ y }}
    >
      <motion.a
        className={`collection-card ${isMiddle ? 'is-raised' : ''}`}
        href={collection.href}
        data-card-tilt
        data-cursor-target
        variants={fadeUp}
      >
        <div className="collection-image">
          <motion.img
            src={collection.image}
            alt={collection.title}
            data-parallax-image
          />
          <div className="collection-overlay">
            <span className="label-caps">ԴԻՏԵԼ</span>
          </div>
        </div>
        <div className="collection-copy">
          <h3 className="label-caps">{collection.title}</h3>
          <p>{collection.subtitle}</p>
        </div>
      </motion.a>
    </motion.div>
  );
}

export default function Collections() {
  const [collections, setCollections] = useState(() => pickRandomCollections(fallbackCollections));

  useEffect(() => {
    api.collections({ random: true })
      .then(({ collections: nextCollections }) => {
        const normalizedCollections = nextCollections.length
          ? nextCollections.map(normalizeCollection)
          : fallbackCollections;

        setCollections(pickRandomCollections(normalizedCollections));
      })
      .catch(() => setCollections(pickRandomCollections(fallbackCollections)));
  }, []);

  return (
    <motion.section
      id="collections"
      className="section section-spacious collections-section reveal-section is-active"
      data-reveal
      variants={staggerGroup}
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
    >
      <div className="container">
        <motion.div className="section-heading" variants={staggerGroup}>
          <motion.p className="label-caps" variants={fadeUp}>ՀԱՎԱՔԾՈՒՆԵՐ ԱՎԵԼԻ ՄԱՏՉԵԼԻ ԳՆԵՐՈՎ</motion.p>
          <motion.h2 variants={fadeUp}>Հավաքածուներ</motion.h2>
        </motion.div>

        <motion.div className="collection-grid" variants={staggerGroup}>
          {collections.map((collection, index) => (
            <CollectionCard collection={collection} index={index} key={collection.title} />
          ))}
        </motion.div>
        <motion.div className="collection-view-all" variants={fadeUp}>
          <motion.a className="primary-button" href="/collections">ԴԻՏԵԼ ԲՈԼՈՐ ՀԱՎԱՔԱԾՈՒՆԵՐԸ</motion.a>
        </motion.div>
      </div>
    </motion.section>
  );
}
