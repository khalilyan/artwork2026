import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Icon from '../components/ui/Icon.jsx';
import DirectCheckoutModal from '../components/ui/DirectCheckoutModal.jsx';
import SeoMeta from '../components/ui/SeoMeta.jsx';
import { showArtworkNotification } from '../components/ui/ToastNotifications.jsx';
import ShopCta from '../components/sections/ShopCta.jsx';
import NotFoundPage from './NotFoundPage.jsx';
import { addGuestCollectionCartItem, api, isAuthorized } from '../services/api.js';
import { formatAmdPrice, getPriceAmount } from '../utils/currency.js';
import { fadeUp, staggerGroup, viewportReveal } from '../utils/motion.js';
import { getProductBadgeLabel } from '../utils/productBadge.js';

const collectionProductLayouts = ['feature', 'narrow-drop', 'square-left', 'wide-mid', 'narrow', 'large-square'];

function getCollectionProductLayout(index) {
  return collectionProductLayouts[index % collectionProductLayouts.length];
}

function CollectionProductCard({ product, index }) {
  const layout = getCollectionProductLayout(index);
  const productId = product.id ?? `collection-product-${index + 1}`;
  const primaryImage = product.image ?? product.images?.primary ?? product.images?.gallery?.[0] ?? '';
  const hoverImage = product.hoverImage ?? product.images?.hover ?? product.images?.gallery?.[1] ?? primaryImage;
  const name = product.name ?? 'Անանուն առարկա';
  const price = formatAmdPrice(product.price?.amount ?? product.priceAmount ?? product.price);
  const material = product.description ?? 'Պատվերով նյութ';
  const roomSlug = product.roomSlugs?.[0] ?? 'living-room';
  const furnitureSlug = product.categorySlug ?? product.type ?? 'all';
  const href = `/rooms/${roomSlug}/${furnitureSlug}/${productId}`;
  const viewCount = Number(product.views ?? 0).toLocaleString('hy-AM');
  const badgeLabel = getProductBadgeLabel(product);

  return (
    <motion.a
      className={`products-card products-card-${layout} products-form-card product-card`}
      href={href}
      data-cursor-target
      variants={staggerGroup}
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
    >
      <motion.span className="products-form-index label-caps" variants={fadeUp}>{String(index + 1).padStart(2, '0')}</motion.span>
      <motion.div className="products-form-image products-image-wrap" variants={fadeUp}>
        {badgeLabel ? <span className="products-badge label-caps">{badgeLabel}</span> : null}
        <img className="products-card-image card-img-primary" src={primaryImage} alt={name} />
        <img className="products-card-image card-img-secondary" src={hoverImage} alt={`${name} լրացուցիչ տեսք`} />
      </motion.div>
      <motion.div className="products-form-copy" variants={staggerGroup}>
        <motion.p className="label-caps products-views-label" variants={fadeUp}><Icon name="visibility" />Դիտումներ՝ {viewCount}</motion.p>
        <motion.h3 variants={fadeUp}>{name}</motion.h3>
        <motion.span variants={fadeUp}>{material}</motion.span>
      </motion.div>
      <motion.div className="products-form-meta" variants={fadeUp}>
        <div>
          <span className="label-caps">Գին</span>
          {product.oldPrice ? <del>{formatAmdPrice(product.oldPrice)}</del> : null}
          <strong>{price}</strong>
        </div>
        <Icon name="arrow_forward" />
      </motion.div>
    </motion.a>
  );
}

function getCollectionPrice(collection) {
  const bundlePrice = getPriceAmount(collection.price?.amount, collection.priceAmount, collection.price);
  if (bundlePrice) return bundlePrice;

  return (collection.products ?? []).reduce(
    (sum, product) => sum + getPriceAmount(product.price?.amount, product.priceAmount, product.price),
    0,
  );
}

export default function CollectionDetailPage({ collectionSlug }) {
  const [collection, setCollection] = useState(null);
  const [isCollectionLoading, setIsCollectionLoading] = useState(true);
  const [cartStatus, setCartStatus] = useState('');
  const [isDirectCheckoutOpen, setIsDirectCheckoutOpen] = useState(false);
  const collectionPrice = collection ? getCollectionPrice(collection) : 0;

  useEffect(() => {
    setIsCollectionLoading(true);
    api.collection(collectionSlug)
      .then(({ collection: nextCollection }) => setCollection(nextCollection ?? null))
      .catch(() => setCollection(null))
      .finally(() => setIsCollectionLoading(false));
  }, [collectionSlug]);

  useEffect(() => {
    if (!collection) return undefined;
    if (typeof window === 'undefined') return undefined;

    const isTouchLayout = window.matchMedia('(max-width: 1024px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (!isTouchLayout.matches || reducedMotion.matches) return undefined;

    const cards = Array.from(document.querySelectorAll('.spec-collection-page .product-card'));
    const timers = new Map();

    const stopPreview = (card) => {
      window.clearTimeout(timers.get(card));
      timers.delete(card);
      card.classList.remove('is-auto-preview');
    };

    const triggerPreview = (card) => {
      window.clearTimeout(timers.get(card));
      card.classList.add('is-auto-preview');
      timers.set(card, window.setTimeout(() => {
        card.classList.remove('is-auto-preview');
        timers.delete(card);
      }, 1000));
    };

    const canPreviewCard = (card) => {
      const primaryImage = card.querySelector('.card-img-primary')?.getAttribute('src');
      const secondaryImage = card.querySelector('.card-img-secondary')?.getAttribute('src');
      return Boolean(secondaryImage && secondaryImage !== primaryImage);
    };

    const markCardVisible = (card) => {
      if (!canPreviewCard(card) || card.dataset.autoPreviewInView === 'true') return;

      card.dataset.autoPreviewInView = 'true';
      triggerPreview(card);
    };

    const markCardHidden = (card) => {
      if (card.dataset.autoPreviewInView !== 'true') return;

      card.dataset.autoPreviewInView = 'false';
      stopPreview(card);
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.24) {
            markCardVisible(entry.target);
            return;
          }

          if (!entry.isIntersecting || entry.intersectionRatio <= 0.08) {
            markCardHidden(entry.target);
          }
        });
      }, {
        root: null,
        rootMargin: '-8% 0px -8% 0px',
        threshold: [0, 0.08, 0.24, 0.55],
      });

      cards.forEach((card) => observer.observe(card));

      return () => {
        observer.disconnect();
        cards.forEach((card) => stopPreview(card));
      };
    }

    return () => {
      cards.forEach((card) => stopPreview(card));
    };
  }, [collection]);

  if (!collection && !isCollectionLoading) {
    return <NotFoundPage />;
  }

  if (!collection) {
    return <main className="spec-collection-page" aria-busy="true" />;
  }

  const addCollectionToCart = async () => {
    const products = collection.products ?? [];
    if (!products.length) {
      setCartStatus('Այս հավաքածուում դեռ ապրանքներ չկան։');
      showArtworkNotification('Այս հավաքածուում դեռ ապրանքներ չկան', 'error');
      return;
    }

    try {
      if (isAuthorized()) {
        await api.addCartItem({ collectionSlug: collection.slug, quantity: 1 });
      } else {
        addGuestCollectionCartItem(collection, 1);
      }

      setCartStatus(`${collection.title} ավելացվել է զամբյուղ։`);
      showArtworkNotification(`${collection.title} ավելացվել է զամբյուղ`);
    } catch (error) {
      setCartStatus(error.message);
      showArtworkNotification(error.message, 'error');
    }
  };

  return (
    <main className="spec-collection-page" lang="hy">
      <SeoMeta
        title={`${collection.title} | ARTWORK հավաքածու`}
        description={collection.description ?? `Բացահայտեք ARTWORK-ի ${collection.title} հավաքածուն՝ կուրացված դիզայներական առարկաներով և նուրբ ինտերիերի լուծումներով։`}
        image={collection.image ?? collection.heroImage ?? collection.products?.[0]?.image}
        url={`/${collection.slug ?? collectionSlug}`}
        keywords={`${collection.title}, ARTWORK հավաքածու, կուրացված կահույք, դիզայներական կահույք Հայաստան`}
      />
      <motion.header
        className="spec-collection-header container"
        variants={staggerGroup}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={staggerGroup}>
          <motion.nav variants={fadeUp}>
            <a className="label-caps spec-back-link" href="/collections">
              <Icon name="arrow_back" />
              ՎԵՐԱԴԱՌՆԱԼ ՀԱՎԱՔԱԾՈՒՆԵՐ
            </a>
          </motion.nav>
          <motion.h1 variants={fadeUp}>{collection.title}</motion.h1>
          <motion.strong className="spec-collection-price" variants={fadeUp}>{formatAmdPrice(collectionPrice)}</motion.strong>
        </motion.div>
        <motion.p variants={fadeUp}>{collection.detailDescription}</motion.p>
      </motion.header>

      <motion.section
        className="spec-product-grid products-collage container"
        variants={staggerGroup}
        initial="hidden"
        whileInView="visible"
        viewport={viewportReveal}
      >
        {(collection.products ?? []).map((product, index) => (
          <CollectionProductCard product={product} index={index} key={product.id ?? `${collection.slug}-${index}`} />
        ))}

        <motion.aside className="spec-collection-quote reveal-section is-active" data-reveal variants={fadeUp}>
          <motion.div variants={staggerGroup}>
            <motion.h4 variants={fadeUp}>&ldquo;Ընտրություն, որն արդարացնում է սպասելիքները։&rdquo;</motion.h4>
            <motion.p variants={fadeUp}>
              Մենք ստեղծում ենք կահույք, որը համապատասխանում է ժամանակակից կյանքի պահանջներին՝ ապահովելով հարմարավետություն, ամրություն և երկարատև որակ։
            </motion.p>
          </motion.div>
        </motion.aside>
      </motion.section>

      <motion.section
        className="spec-collection-cart container"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={viewportReveal}
      >
        <motion.button className="spec-collection-cart-button" type="button" onClick={addCollectionToCart}>
          <span>Ավելացնել հավաքածուն զամբյուղ</span>
          <strong>{formatAmdPrice(collectionPrice)}</strong>
        </motion.button>
        <motion.button className="spec-collection-buy-button" type="button" onClick={() => setIsDirectCheckoutOpen(true)}>
          <span>Գնել</span>
          <strong>{formatAmdPrice(collectionPrice)}</strong>
        </motion.button>
        {cartStatus ? <p className="sr-only">{cartStatus}</p> : null}
      </motion.section>

      <DirectCheckoutModal
        isOpen={isDirectCheckoutOpen}
        title={collection.title}
        total={collectionPrice}
        items={[{ productSlug: `collection:${collection.slug}`, collectionSlug: collection.slug, itemType: 'collection', quantity: 1 }]}
        onClose={() => setIsDirectCheckoutOpen(false)}
      />

      <ShopCta href="/rooms" />
    </main>
  );
}
