import { useEffect, useMemo, useState } from 'react';
import { getFurnitureCategory, getFurnitureRoom } from '../data/furnitureRooms.js';
import Icon from '../components/ui/Icon.jsx';
import SeoMeta from '../components/ui/SeoMeta.jsx';
import { api } from '../services/api.js';
import { formatAmdPrice, getPriceAmount } from '../utils/currency.js';
import { getProductBadgeLabel } from '../utils/productBadge.js';
import { defaultSeoImage } from '../utils/seo.js';

const sortOptions = [
  { value: 'newest', label: 'Նորերը' },
  { value: 'price-asc', label: 'Գին՝ ցածրից բարձր' },
  { value: 'price-desc', label: 'Գին՝ բարձրից ցածր' },
  { value: 'az', label: 'Ա-Ֆ' },
  { value: 'za', label: 'Ֆ-Ա' },
];
const productLayouts = ['feature', 'narrow-drop', 'square-left', 'wide-mid', 'narrow', 'large-square'];
const defaultMinPrice = 0;
const defaultMaxPrice = 1000000;
const minimumSkeletonMs = 1700;

function getProductLayout(index) {
  return productLayouts[index % productLayouts.length];
}

function getProductPrice(product) {
  return getPriceAmount(product.price?.amount, product.priceAmount, product.price, product.snapshot?.price);
}

function getProductDate(product) {
  return new Date(product.createdAt ?? product.updatedAt ?? 0).getTime() || 0;
}

function clampPrice(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return fallback;

  return Math.max(defaultMinPrice, Math.min(numericValue, defaultMaxPrice));
}

function getFurnitureTypeName(category) {
  return category?.title ?? category?.name ?? category?.slug ?? '';
}

function pluralizeFurnitureTypeName(name) {
  const cleanName = String(name ?? '').trim();
  if (!cleanName) return '';
  if (cleanName.endsWith('ներ')) return cleanName;
  return `${cleanName}ներ`;
}

function ProductCard({ product, href, index }) {
  const layout = getProductLayout(index);
  const primaryImage = product.image ?? product.images?.primary ?? product.images?.gallery?.[0] ?? '';
  const hoverImage = product.hoverImage ?? product.images?.hover ?? primaryImage;
  const viewCount = Number(product.views ?? 0).toLocaleString('hy-AM');
  const badgeLabel = getProductBadgeLabel(product);

  return (
    <a
      className={`products-card products-card-${layout} products-form-card product-card`}
      href={href}
      data-cursor-target
    >
      <span className="products-form-index label-caps">{String(index + 1).padStart(2, '0')}</span>
      <div className="products-form-image products-image-wrap">
        {badgeLabel ? <span className="products-badge label-caps">{badgeLabel}</span> : null}
        <img className="products-card-image card-img-primary" src={primaryImage} alt={product.name} />
        <img className="products-card-image card-img-secondary" src={hoverImage} alt={`${product.name} լրացուցիչ տեսք`} />
      </div>
      <div className="products-form-copy">
        <p className="label-caps products-views-label"><Icon name="visibility" />Դիտումներ՝ {viewCount}</p>
        <h3>{product.name}</h3>
        <span>{product.description ?? product.type ?? 'ARTWORK ԱՌԱՐԿԱ'}</span>
      </div>
      <div className="products-form-meta">
        <div>
          <span className="label-caps">Գին</span>
          {product.oldPrice ? <del>{formatAmdPrice(product.oldPrice)}</del> : null}
          <strong>{formatAmdPrice(product.price?.amount ?? product.priceAmount ?? product.price)}</strong>
        </div>
        <Icon name="arrow_forward" />
      </div>
    </a>
  );
}

function ProductsSkeleton() {
  return (
    <div className="products-skeleton" aria-hidden="true">
      {Array.from({ length: 2 }, (_, groupIndex) => (
        <section className="products-group products-skeleton-group" key={groupIndex}>
          <div className="products-group-heading">
            <span className="products-skeleton-line is-label" />
            <span className="products-skeleton-line is-heading" />
          </div>
          <div className="products-collage">
            {Array.from({ length: 4 }, (_, index) => (
              <article className={`products-card products-card-${getProductLayout(index)} products-form-card products-skeleton-card`} key={index}>
                <span className="products-skeleton-line is-index" />
                <div className="products-form-image products-image-wrap products-skeleton-block" />
                <div className="products-form-copy">
                  <span className="products-skeleton-line is-label" />
                  <span className="products-skeleton-line is-title" />
                  <span className="products-skeleton-line is-copy" />
                </div>
                <div className="products-form-meta">
                  <div>
                    <span className="products-skeleton-line is-label" />
                    <span className="products-skeleton-line is-price" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function ProductsPage({ roomSlug, furnitureSlug }) {
  const searchParams = new URLSearchParams(window.location.search);
  const [room, setRoom] = useState(() => (roomSlug ? getFurnitureRoom(roomSlug) : null));
  const [category, setCategory] = useState(() => (furnitureSlug ? getFurnitureCategory(furnitureSlug) : null));
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'newest');
  const [minPrice, setMinPrice] = useState(() => clampPrice(searchParams.get('min'), defaultMinPrice));
  const [maxPrice, setMaxPrice] = useState(() => clampPrice(searchParams.get('max'), defaultMaxPrice));
  const [draftMinPrice, setDraftMinPrice] = useState(() => clampPrice(searchParams.get('min'), defaultMinPrice));
  const [draftMaxPrice, setDraftMaxPrice] = useState(() => clampPrice(searchParams.get('max'), defaultMaxPrice));
  const [isPriceFilterActive, setIsPriceFilterActive] = useState(() => searchParams.has('min') || searchParams.has('max'));
  const [isPriceRangeDragging, setIsPriceRangeDragging] = useState(false);
  const [hasPendingPriceCommit, setHasPendingPriceCommit] = useState(false);
  const [isProductsLoading, setIsProductsLoading] = useState(true);

  useEffect(() => {
    if (!roomSlug || !furnitureSlug) {
      setRoom(null);
      setCategory(null);
      return;
    }

    api.room(roomSlug)
      .then(({ room: nextRoom }) => {
        setRoom(nextRoom);
        setCategory(nextRoom.categories?.find((item) => item.slug === furnitureSlug) ?? getFurnitureCategory(furnitureSlug));
      })
      .catch(() => {
        setRoom(getFurnitureRoom(roomSlug));
        setCategory(getFurnitureCategory(furnitureSlug));
      });
  }, [roomSlug, furnitureSlug]);

  useEffect(() => {
    let isCurrentRequest = true;
    let loadingTimer = null;
    const loadingStartedAt = performance.now();

    setIsProductsLoading(true);
    api.products({ roomSlug, categorySlug: furnitureSlug, q: query })
      .then(({ products: nextProducts }) => {
        if (isCurrentRequest) setProducts(nextProducts ?? []);
      })
      .catch(() => {
        if (isCurrentRequest) setProducts([]);
      })
      .finally(() => {
        const elapsed = performance.now() - loadingStartedAt;
        const remaining = Math.max(0, minimumSkeletonMs - elapsed);

        loadingTimer = window.setTimeout(() => {
          if (isCurrentRequest) setIsProductsLoading(false);
        }, remaining);
      });

    return () => {
      isCurrentRequest = false;
      if (loadingTimer) window.clearTimeout(loadingTimer);
    };
  }, [roomSlug, furnitureSlug, query]);

  const absoluteMaxPrice = defaultMaxPrice;

  const visibleProducts = useMemo(() => {
    const low = Math.max(defaultMinPrice, Math.min(minPrice, maxPrice));
    const high = Math.min(defaultMaxPrice, Math.max(minPrice, maxPrice));

    return products
      .filter((product) => {
        if (!isPriceFilterActive) return true;

        const price = getProductPrice(product);
        return price >= low && price <= high;
      })
      .map((product, index) => ({ product, originalIndex: index }))
      .sort((first, second) => {
        if (sort === 'price-asc') return getProductPrice(first.product) - getProductPrice(second.product);
        if (sort === 'price-desc') return getProductPrice(second.product) - getProductPrice(first.product);
        if (sort === 'az') return first.product.name.localeCompare(second.product.name);
        if (sort === 'za') return second.product.name.localeCompare(first.product.name);
        return getProductDate(second.product) - getProductDate(first.product) || second.originalIndex - first.originalIndex;
      })
      .map(({ product }) => product);
  }, [isPriceFilterActive, maxPrice, minPrice, products, sort]);

  const groupedProducts = useMemo(() => {
    const groups = new Map();

    visibleProducts.forEach((product) => {
      const group = product.group ?? product.categorySlug ?? product.type ?? 'other';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(product);
    });

    return Array.from(groups.entries()).map(([group, groupProducts]) => ({
      group,
      label: pluralizeFurnitureTypeName(
        category
          ? getFurnitureTypeName(category)
          : room?.categories?.find((item) => item.slug === group)?.title ?? group.replace(/-/g, ' '),
      ),
      products: groupProducts,
    }));
  }, [category, room?.categories, visibleProducts]);

  useEffect(() => {
    if (isProductsLoading || typeof window === 'undefined') return undefined;

    const isTouchLayout = window.matchMedia('(max-width: 1024px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (!isTouchLayout.matches || reducedMotion.matches) return undefined;

    const cards = Array.from(document.querySelectorAll('.product-card'));
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

    let animationFrame = null;

    const updatePreviewState = () => {
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const isInView = rect.top < viewportHeight * 0.82 && rect.bottom > viewportHeight * 0.18;

        if (isInView) markCardVisible(card);
        else markCardHidden(card);
      });

      animationFrame = null;
    };

    const requestPreviewStateUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updatePreviewState);
    };

    const initialTimer = window.setTimeout(updatePreviewState, 80);
    window.addEventListener('scroll', requestPreviewStateUpdate, { passive: true });
    window.addEventListener('resize', requestPreviewStateUpdate, { passive: true });

    return () => {
      window.clearTimeout(initialTimer);
      window.removeEventListener('scroll', requestPreviewStateUpdate);
      window.removeEventListener('resize', requestPreviewStateUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      cards.forEach((card) => stopPreview(card));
    };
  }, [isProductsLoading, visibleProducts.length]);

  const getProductHref = (product) => {
    const nextRoomSlug = room?.slug ?? product.roomSlugs?.[0] ?? 'living-room';
    const nextCategorySlug = category?.slug ?? product.categorySlug ?? product.type ?? 'seating';
    return `/rooms/${nextRoomSlug}/${nextCategorySlug}/${product.id}`;
  };

  const clearFilters = () => {
    setQuery('');
    setSort('newest');
    setMinPrice(defaultMinPrice);
    setMaxPrice(defaultMaxPrice);
    setDraftMinPrice(defaultMinPrice);
    setDraftMaxPrice(defaultMaxPrice);
    setIsPriceFilterActive(false);
    setHasPendingPriceCommit(false);
  };

  const commitPriceRange = (nextMinPrice = draftMinPrice, nextMaxPrice = draftMaxPrice) => {
    setMinPrice(nextMinPrice);
    setMaxPrice(nextMaxPrice);
    setIsPriceFilterActive(true);
    setHasPendingPriceCommit(false);
  };

  const updateDraftMinPrice = (value) => {
    const nextValue = clampPrice(value, defaultMinPrice);
    setDraftMinPrice(Math.min(nextValue, draftMaxPrice));
    setHasPendingPriceCommit(true);
  };

  const updateDraftMaxPrice = (value) => {
    const nextValue = clampPrice(value, defaultMaxPrice);
    setDraftMaxPrice(Math.max(nextValue, draftMinPrice));
    setHasPendingPriceCommit(true);
  };

  useEffect(() => {
    if (!hasPendingPriceCommit || isPriceRangeDragging) return undefined;

    const debounceTimer = window.setTimeout(() => {
      setMinPrice(draftMinPrice);
      setMaxPrice(draftMaxPrice);
      setIsPriceFilterActive(true);
      setHasPendingPriceCommit(false);
    }, 1000);

    return () => window.clearTimeout(debounceTimer);
  }, [draftMaxPrice, draftMinPrice, hasPendingPriceCommit, isPriceRangeDragging]);

  const furnitureTypeName = getFurnitureTypeName(category);
  const isRoomCategoryPage = Boolean(room && category);
  const seoTitle = query
    ? `Search results for "${query}" | ARTWORK Furniture`
    : isRoomCategoryPage
      ? `${furnitureTypeName} for ${room.roomName ?? room.title ?? room.name} | ARTWORK Furniture`
      : 'Designer Furniture Catalog | ARTWORK Furniture';
  const seoDescription = isRoomCategoryPage
    ? `Shop ARTWORK ${furnitureTypeName} for ${room.roomName ?? room.title ?? room.name}: refined furniture with premium materials, careful craftsmanship, and modern interior design.`
    : 'Browse ARTWORK designer furniture, curated home pieces, collections, seating, lighting, beds, sofas, and refined interior objects in Armenia.';
  const seoUrl = typeof window === 'undefined' ? '/products' : `${window.location.pathname}${window.location.search}`;
  const seoImage = visibleProducts[0]?.image ?? visibleProducts[0]?.images?.primary ?? defaultSeoImage;

  return (
    <main className="products-page" lang="hy">
      <SeoMeta
        title={seoTitle}
        description={seoDescription}
        image={seoImage}
        url={seoUrl}
        keywords="designer furniture, furniture catalog Armenia, ARTWORK products, luxury furniture, custom furniture, home decor Armenia"
      />
      <header className="products-header container">
        <div className="products-header-inner" data-products-header>
          <div>
            <span className="label-caps products-eyebrow">{isRoomCategoryPage ? 'ԸՆՏՐՎԱԾ ԱՌԱՐԿԱՆԵՐ - ԼԱՅՆ ԸՆՏՐԱՆԻ' : 'ԸՆՏՐՎԱԾ ԱՌԱՐԿԱՆԵՐ'}</span>
            <h1>{query ? `Որոնում՝ ${query}` : isRoomCategoryPage ? `${furnitureTypeName}ների լայն տեսականի` : 'Ցանկալի առարկաներ'}</h1>
            <p>
              {isRoomCategoryPage
                ? `Ձեռագործ ${furnitureTypeName}ներ, որոնք համադրում են բարձրակարգ նյութերը, վարպետական մշակումը և ժամանակակից դիզայնը՝ ստեղծելով ներդաշնակ ինտերիեր`
                : 'Գտեք ձեր նախընտրած կահույքը՝ որոնելով և դասավորելով ամբողջ տեսականին ըստ անվան, գնի, նորույթի կամ ընտրած գնային միջակայքի։'}
            </p>
          </div>
          <div className="products-filters" aria-label="Ապրանքների դասավորման կառավարիչներ">
            <div className="products-control-panel">
              <label className="products-sort-control">
                <span className="label-caps">Դասավորել</span>
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  {sortOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                </select>
                <Icon name="expand_more" />
              </label>

              <div className="products-price-control">
                <div className="products-control-heading">
                  <span className="label-caps">Գնի միջակայք</span>
                  <strong>{formatAmdPrice(Math.min(draftMinPrice, draftMaxPrice), '0')} - {formatAmdPrice(Math.max(draftMinPrice, draftMaxPrice), '0')}</strong>
                </div>
                <div className="products-range-track">
                  <input
                    type="range"
                    min="0"
                    max={absoluteMaxPrice}
                    step="1000"
                    value={draftMinPrice}
                    aria-label="Նվազագույն գին"
                    onChange={(event) => updateDraftMinPrice(event.target.value)}
                    onPointerDown={() => setIsPriceRangeDragging(true)}
                    onPointerUp={() => {
                      setIsPriceRangeDragging(false);
                      commitPriceRange(draftMinPrice, draftMaxPrice);
                    }}
                    onTouchEnd={() => {
                      setIsPriceRangeDragging(false);
                      commitPriceRange(draftMinPrice, draftMaxPrice);
                    }}
                    onKeyUp={() => commitPriceRange(draftMinPrice, draftMaxPrice)}
                    onBlur={() => commitPriceRange(draftMinPrice, draftMaxPrice)}
                  />
                  <input
                    type="range"
                    min="0"
                    max={absoluteMaxPrice}
                    step="1000"
                    value={draftMaxPrice}
                    aria-label="Առավելագույն գին"
                    onChange={(event) => updateDraftMaxPrice(event.target.value)}
                    onPointerDown={() => setIsPriceRangeDragging(true)}
                    onPointerUp={() => {
                      setIsPriceRangeDragging(false);
                      commitPriceRange(draftMinPrice, draftMaxPrice);
                    }}
                    onTouchEnd={() => {
                      setIsPriceRangeDragging(false);
                      commitPriceRange(draftMinPrice, draftMaxPrice);
                    }}
                    onKeyUp={() => commitPriceRange(draftMinPrice, draftMaxPrice)}
                    onBlur={() => commitPriceRange(draftMinPrice, draftMaxPrice)}
                  />
                </div>
                <div className="products-price-inputs">
                  <label>
                    <span className="label-caps">Նվազ.</span>
                    <input type="number" min="0" max={absoluteMaxPrice} value={draftMinPrice} onChange={(event) => updateDraftMinPrice(event.target.value)} />
                  </label>
                  <label>
                    <span className="label-caps">Առավ.</span>
                    <input type="number" min="0" max={absoluteMaxPrice} value={draftMaxPrice} onChange={(event) => updateDraftMaxPrice(event.target.value)} />
                  </label>
                </div>
              </div>

              <button type="button" className="products-clear-control label-caps" onClick={clearFilters}>Մաքրել</button>
            </div>
          </div>
        </div>
      </header>

      <section className="products-grouped container">
        {isProductsLoading ? <ProductsSkeleton /> : visibleProducts.length ? groupedProducts.map(({ group, label, products: groupProducts }) => (
          <section className="products-group" key={group}>
            <div className="products-group-heading">
              <span className="label-caps">{String(groupProducts.length).padStart(2, '0')} ՏԵՍԱԿ</span>
              <h2>{label}</h2>
            </div>
            <div className="products-collage">
              {groupProducts.map((product, index) => (
                <ProductCard product={product} href={getProductHref(product)} index={index} key={product.id} />
              ))}
            </div>
          </section>
        )) : <p className="products-empty">Այս գնի միջակայքում առարկաներ չկան։</p>}
      </section>
    </main>
  );
}
