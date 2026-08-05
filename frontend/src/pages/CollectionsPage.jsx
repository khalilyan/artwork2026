import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ShopCta from '../components/sections/ShopCta.jsx';
import SeoMeta from '../components/ui/SeoMeta.jsx';
import { api } from '../services/api.js';
import usePageAssets from '../hooks/usePageAssets.js';
import { formatAmdPrice } from '../utils/currency.js';
import { fadeUp, staggerGroup, viewportReveal } from '../utils/motion.js';
import collectionHeroImage from '../assets/images/collection_image.png';

const collectionsHeroImage = collectionHeroImage;

const collectionLayouts = ['right-image', 'left-image', 'right-image tall'];
const allowedCollectionLayouts = new Set(collectionLayouts);

function getCollectionLayout(collection, index) {
  return allowedCollectionLayouts.has(collection.layout) ? collection.layout : collectionLayouts[index % collectionLayouts.length];
}

function normalizeCollectionSections(collections) {
  return collections.map((collection, index) => {
    const slug = collection.slug ?? `collection-${index + 1}`;

    return {
      ...collection,
      title: collection.title ?? collection.name ?? `Հավաքածու ${index + 1}`,
      subtitle: collection.subtitle ?? 'Կուրացված շարք',
      description: collection.description ?? 'Բացահայտեք այս հավաքածուի ընտրված առարկաները։',
      slug,
      image: collection.image ?? collection.heroImage ?? '',
      number: `${String(index + 1).padStart(2, '0')} / ՀԱՎԱՔԱԾՈՒ`,
      detailImage: collection.detailImage ?? null,
      price: collection.price ?? collection.priceAmount ?? null,
      layout: getCollectionLayout(collection, index),
    };
  });
}

function CollectionEditorial({ section }) {
  const isLeftImage = section.layout.includes('left-image');
  const content = (
    <motion.div className="collections-redesign-copy" variants={staggerGroup}>
      <motion.span className="label-caps" variants={fadeUp}>{section.number}</motion.span>
      <motion.h2 variants={fadeUp}>{section.title}</motion.h2>
      <motion.p className="collections-armenian" variants={fadeUp}>{section.subtitle}</motion.p>
      <motion.strong className="collections-bundle-price" variants={fadeUp}>{formatAmdPrice(section.price)}</motion.strong>
      <motion.p variants={fadeUp}>{section.description}</motion.p>
      <motion.a className="label-caps collections-underlined" href={`/${section.slug}`} variants={fadeUp}>ԲԱՑԱՀԱՅՏԵԼ ՇԱՐՔԸ</motion.a>
    </motion.div>
  );
  const image = (
    <motion.a className={`collections-redesign-image ${section.layout.includes('tall') ? 'is-tall' : ''}`} href={`/${section.slug}`} data-cursor-target variants={fadeUp}>
      <span className="collections-parallax-wrapper">
        <span className="collections-redesign-image-frame">
          <img className="collections-redesign-parallax" src={section.image} alt={section.title} data-parallax-image />
        </span>
      </span>
      {section.detailImage ? (
        <span className="collections-detail-image">
          <img src={section.detailImage} alt="" />
        </span>
      ) : null}
    </motion.a>
  );

  return (
    <motion.section
      className={`collections-redesign-section ${isLeftImage ? 'is-left-image' : ''} reveal-section is-active`}
      data-reveal
      variants={staggerGroup}
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
    >
      {isLeftImage ? image : content}
      {isLeftImage ? content : image}
    </motion.section>
  );
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const pageImages = usePageAssets('collections', { hero: collectionsHeroImage });
  const collectionSections = useMemo(() => normalizeCollectionSections(collections), [collections]);

  useEffect(() => {
    api.collections()
      .then(({ collections: nextCollections }) => setCollections(nextCollections.length ? nextCollections : []))
      .catch(() => setCollections([]));
  }, []);

  return (
    <main className="collections-redesign-page" lang="hy">
      <SeoMeta
        title="ARTWORK հավաքածուներ | Դիզայներական կահույք"
        description="Բացահայտեք ARTWORK-ի կուրացված հավաքածուները` դիզայներական առարկաներ, նուրբ նյութեր և ամբողջական ինտերիերի համադրություններ։"
        image={pageImages.hero}
        url="/collections"
        keywords="կահույքի հավաքածուներ, կուրացված կահույք Հայաստան, դիզայներական կահույքի շարքեր, ARTWORK հավաքածուներ"
      />
      <motion.section
        className="collections-redesign-hero"
        variants={staggerGroup}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={staggerGroup}>
          <motion.h1 className="reveal-section is-active" data-reveal variants={fadeUp}>Մեր հավաքածուները</motion.h1>
          <motion.p className="reveal-section is-active" data-reveal variants={fadeUp}>
            Ընտրված ձեւերի եւ վարպետական մշակման տարածք։ Այստեղ ներկայացված են հավաքածուներ, որոնք միավորում են նյութը, համաչափությունը եւ տան միջավայրի համար մտածված ներկայությունը։
          </motion.p>
        </motion.div>
        <motion.div className="collections-hero-image reveal-section is-active" data-reveal data-cursor-target variants={fadeUp}>
          <span className="collections-parallax-wrapper">
          <span className="collections-redesign-image-frame">
            <img className="collections-redesign-parallax" src={pageImages.hero} alt="Շքեղ մինիմալ ցուցասրահ" data-parallax-image />
          </span>
          </span>
        </motion.div>
      </motion.section>

      <div className="collections-redesign-list">
        {collectionSections.map((section) => (
          <CollectionEditorial section={section} key={section.slug} />
        ))}
      </div>

      <ShopCta
        eyebrow="ՍՏԵՂԾԵՔ ՁԵՐ ՀԱՎԱՔԱԾՈՒՆ"
        title="Ընտրեք ձեր հավաքածուն"
        accentTitle="իսկ մենք կառաջարկենք լավագույն գինը"
        buttonText="ՄՈՒՏՔ"
        enterText="ԽԱՆՈՒԹ"
        href="/rooms"
      />
    </main>
  );
}
