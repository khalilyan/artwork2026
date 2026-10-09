import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/ui/Icon.jsx';
import SeoMeta from '../components/ui/SeoMeta.jsx';
import { api } from '../services/api.js';
import { formatAmdPrice, formatAmdPriceByUnit, formatCatalogProductPrice } from '../utils/currency.js';
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
const defaultMaxPrice = 2000000;
const minimumSkeletonMs = 1700;
const productsPerPage = 10;

function getProductLayout(index) {
  return productLayouts[index % productLayouts.length];
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

function toPossessiveRoomName(roomName) {
  const normalizedRoomName = String(roomName ?? '').trim();
  if (!normalizedRoomName) return '';
  if (normalizedRoomName.endsWith('ի') || normalizedRoomName.endsWith('Ի')) return normalizedRoomName;
  return `${normalizedRoomName}ի`;
}

function toPluralFurnitureName(typeName) {
  const normalizedTypeName = String(typeName ?? '').trim();
  if (!normalizedTypeName) return 'Կահույքներ';
  if (/(ներ|եր)$/u.test(normalizedTypeName)) return normalizedTypeName;
  return `${normalizedTypeName}ներ`;
}

function ProductCard({ product, href, index }) {
  const layout = getProductLayout(index);
  const primaryImage = product.image ?? product.images?.primary ?? product.images?.gallery?.[0] ?? '';
  const hoverImage = product.hoverImage ?? product.images?.hover ?? primaryImage;
  const viewCount = Number(product.views ?? 0).toLocaleString('hy-AM');
  const badgeLabel = getProductBadgeLabel(product);
  const priceLabel = formatCatalogProductPrice(product);
  const oldPriceLabel = product.oldPrice
    ? formatAmdPriceByUnit(product.oldPrice, Boolean(product.pricePerSquareMeter))
    : null;

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
        <span>{product.description ?? product.type ?? 'ARTWORK ԿԱՀՈՒՅՔ'}</span>
      </div>
      <div className="products-form-meta">
        <div>
          <span className="label-caps">Գին</span>
          {oldPriceLabel ? <del>{oldPriceLabel}</del> : null}
          <strong>{priceLabel}</strong>
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
  const categoryFilter = furnitureSlug && furnitureSlug !== 'all' ? furnitureSlug : '';
  const isRoomAllPage = Boolean(roomSlug) && furnitureSlug === 'all';
  const searchParams = new URLSearchParams(window.location.search);
  const [room, setRoom] = useState(null);
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
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
  const [isLoadingMoreProducts, setIsLoadingMoreProducts] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth > 1024));
  const loadMoreTriggerRef = useRef(null);
  const isLoadingMoreProductsRef = useRef(false);

  useEffect(() => {
    if (!roomSlug) {
      setRoom(null);
      setCategory(null);
      return;
    }

    api.room(roomSlug)
      .then(({ room: nextRoom }) => {
        setRoom(nextRoom);
        setCategory(categoryFilter ? (nextRoom.categories?.find((item) => item.slug === categoryFilter) ?? null) : null);
      })
      .catch(() => {
        setRoom(null);
        setCategory(null);
      });
  }, [categoryFilter, roomSlug]);

  const absoluteMaxPrice = defaultMaxPrice;
  const normalizedQuery = query.trim();
  const low = Math.max(defaultMinPrice, Math.min(minPrice, maxPrice));
  const high = Math.min(defaultMaxPrice, Math.max(minPrice, maxPrice));

  const productRequestParams = useMemo(() => ({
    roomSlug,
    categorySlug: categoryFilter,
    q: normalizedQuery,
    sort,
    minPrice: isPriceFilterActive ? String(low) : undefined,
    maxPrice: isPriceFilterActive ? String(high) : undefined,
  }), [categoryFilter, high, isPriceFilterActive, low, normalizedQuery, roomSlug, sort]);

  const loadMoreProducts = useCallback(async (offset) => {
    if (isLoadingMoreProductsRef.current) return;

    isLoadingMoreProductsRef.current = true;
    setIsLoadingMoreProducts(true);

    try {
      const result = await api.products({
        ...productRequestParams,
        offset: String(offset),
        limit: String(productsPerPage),
      });

      const nextProducts = Array.isArray(result.products) ? result.products : [];
      const nextTotal = Number.isFinite(Number(result.total))
        ? Number(result.total)
        : offset + nextProducts.length;

      setTotalProducts(nextTotal);
      setProducts((currentProducts) => {
        const currentIds = new Set(currentProducts.map((item) => item.id ?? item.slug ?? item.productSlug));
        const uniqueNextProducts = nextProducts.filter((item) => {
          const itemId = item.id ?? item.slug ?? item.productSlug;
          if (!itemId || currentIds.has(itemId)) return false;
          currentIds.add(itemId);
          return true;
        });
        const mergedProducts = [...currentProducts, ...uniqueNextProducts];
        setHasMoreProducts(mergedProducts.length < nextTotal);
        return mergedProducts;
      });
    } finally {
      isLoadingMoreProductsRef.current = false;
      setIsLoadingMoreProducts(false);
    }
  }, [productRequestParams]);

  useEffect(() => {
    let isCancelled = false;
    let loadingTimer = null;
    const loadingStartedAt = performance.now();

    setProducts([]);
    setTotalProducts(0);
    setHasMoreProducts(false);
    setIsProductsLoading(true);
    setIsLoadingMoreProducts(false);
    isLoadingMoreProductsRef.current = false;

    api.products({
      ...productRequestParams,
      offset: '0',
      limit: String(productsPerPage),
    })
      .then((result) => {
        if (isCancelled) return;

        const nextProducts = Array.isArray(result.products) ? result.products : [];
        const nextTotal = Number.isFinite(Number(result.total))
          ? Number(result.total)
          : nextProducts.length;

        setProducts(nextProducts);
        setTotalProducts(nextTotal);
        setHasMoreProducts(nextProducts.length < nextTotal);
      })
      .catch(() => {
        if (isCancelled) return;

        setProducts([]);
        setTotalProducts(0);
        setHasMoreProducts(false);
      })
      .finally(() => {
        const elapsed = performance.now() - loadingStartedAt;
        const remaining = Math.max(0, minimumSkeletonMs - elapsed);

        loadingTimer = window.setTimeout(() => {
          if (isCancelled) return;
          setIsProductsLoading(false);
        }, remaining);
      });

    return () => {
      isCancelled = true;
      if (loadingTimer) window.clearTimeout(loadingTimer);
    };
  }, [productRequestParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (isProductsLoading || isLoadingMoreProducts || !hasMoreProducts) return undefined;

    const triggerNode = loadMoreTriggerRef.current;
    if (!triggerNode) return undefined;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
      loadMoreProducts(products.length);
    }, {
      root: null,
      rootMargin: '360px 0px',
      threshold: 0,
    });

    observer.observe(triggerNode);

    return () => observer.disconnect();
  }, [hasMoreProducts, isLoadingMoreProducts, isProductsLoading, loadMoreProducts, products.length]);

  const visibleProducts = products;

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
    const productId = product.id ?? product.slug ?? product.productSlug;
    const nextRoomSlug = roomSlug ?? room?.slug ?? product.roomSlug ?? product.roomSlugs?.[0];
    const routeCategorySlug = category?.slug ?? categoryFilter ?? (isRoomAllPage ? 'all' : '');
    const itemCategorySlug = product.categorySlug ?? product.type ?? '';
    const nextCategorySlug = routeCategorySlug || itemCategorySlug || (nextRoomSlug ? 'all' : '');

    if (!productId || !nextRoomSlug || !nextCategorySlug) return '/products';
    return `/rooms/${nextRoomSlug}/${nextCategorySlug}/${productId}`;
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
  const roomHeadingTitle = room?.roomName ?? room?.title ?? room?.name ?? 'Բոլոր ապրանքները';
  const roomPossessiveName = room ? toPossessiveRoomName(roomHeadingTitle) : '';
  const furniturePluralName = toPluralFurnitureName(furnitureTypeName);
  const roomCategoryHeading = `${roomPossessiveName} ${furniturePluralName}`.trim();
  const roomAllHeadingLine = room ? roomPossessiveName : 'Սենյակի';
  const roomEyebrowLabel = room ? `${roomHeadingTitle}ային կահույք` : 'ԸՆՏՐՎԱԾ ԿԱՀՈՒՅՔ';
  const productsEyebrow = isRoomCategoryPage
    ? roomCategoryHeading
    : isRoomAllPage
      ? roomAllHeadingLine
      : roomEyebrowLabel;
  const seoTitle = query
    ? `"${query}" որոնման արդյունքներ | ARTWORK`
    : isRoomAllPage
      ? `${room?.roomName ?? room?.title ?? room?.name ?? 'Սենյակ'} | ARTWORK`
    : isRoomCategoryPage
      ? `${room.roomName ?? room.title ?? room.name}-ի ${furnitureTypeName} | ARTWORK`
      : 'ARTWORK | Դիզայներական կահույքի կատալոգ';
  const seoDescription = isRoomCategoryPage
    ? `${room.roomName ?? room.title ?? room.name}-ի համար ARTWORK-ի ${furnitureTypeName}՝ ընտրված նյութերով, վարպետական մշակումով և ժամանակակից ինտերիերի շեշտադրումներով։`
    : isRoomAllPage
      ? `${room?.roomName ?? room?.title ?? room?.name ?? 'Այս սենյակի'} համար դիտեք ARTWORK-ի ամբողջ հասանելի կահույքը մեկ էջում։`
    : 'Դիտեք ARTWORK-ի դիզայներական կահույքը, հավաքածուները, բազկաթոռները, լուսավորությունը, մահճակալները, բազմոցները և ինտերիերի այլ կահույքի տեսակները։';
  const seoUrl = typeof window === 'undefined' ? '/products' : `${window.location.pathname}${window.location.search}`;
  const seoImage = visibleProducts[0]?.image ?? visibleProducts[0]?.images?.primary ?? defaultSeoImage;
  const sectionHeadingTitle = query.trim() ? 'Բոլոր արդյունքները' : roomHeadingTitle;

  return (
    <main className="products-page" lang="hy">
      <SeoMeta
        title={seoTitle}
        description={seoDescription}
        image={seoImage}
        url={seoUrl}
        keywords="դիզայներական կահույք, կահույքի կատալոգ Հայաստան, ARTWORK ապրանքներ, անհատական կահույք, տան ինտերիեր"
      />
      <header className="products-header container">
        <div className="products-header-inner" data-products-header>
          <div>
            <span className="label-caps products-eyebrow">{productsEyebrow}</span>
            <h1>
              {query
                ? `Որոնում՝ ${query}`
                : isRoomCategoryPage
                  ? roomCategoryHeading
                  : isRoomAllPage
                    ? (
                      <>
                        <span className="products-title-line">{roomAllHeadingLine}</span>
                        <span className="products-title-line">Ամբողջ տեսականին</span>
                      </>
                    )
                    : 'Ցանկալի կահույք'}
            </h1>
            <p>
              {isRoomCategoryPage
                ? `${roomPossessiveName} համար ստեղծված ${furniturePluralName.toLocaleLowerCase('hy-AM')}, որոնք համադրում են բարձրակարգ նյութերը, վարպետական մշակումը և ժամանակակից դիզայնը՝ ստեղծելով ներդաշնակ ինտերիեր`
                : isRoomAllPage
                  ? `${roomAllHeadingLine} համար նախատեսված կահույքի ամբողջ տեսականին՝ մեկ էջում`
                : 'Գտեք ձեր նախընտրած կահույքը՝ որոնելով և դասավորելով ամբողջ տեսականին ըստ անվան, գնի, նորույթի կամ ընտրած գնային միջակայքի։'}
            </p>
          </div>
          <div className="products-filters" aria-label="Ապրանքների դասավորման կառավարիչներ">
            <button
              type="button"
              className={`products-filters-toggle ${isFiltersOpen ? 'is-open' : ''}`}
              onClick={() => setIsFiltersOpen((currentState) => !currentState)}
              aria-expanded={isFiltersOpen}
              aria-controls="products-filters-panel"
            >
              <span className="label-caps">Ֆիլտրեր և դասավորում</span>
              <Icon name={isFiltersOpen ? 'close' : 'tune'} />
            </button>

            <div className={`products-filters-panel ${isFiltersOpen ? 'is-open' : ''}`} id="products-filters-panel">
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
        </div>
      </header>

      <section className="products-grouped container">
        {isProductsLoading ? <ProductsSkeleton /> : visibleProducts.length ? (
          <section className="products-group">
            <div className="products-group-heading">
              <span className="label-caps">{String(Math.max(totalProducts, visibleProducts.length)).padStart(2, '0')} ԿԱՀՈՒՅՔ</span>
              <h2>{sectionHeadingTitle}</h2>
            </div>
            <div className="products-collage">
              {visibleProducts.map((product, index) => (
                <ProductCard
                  product={product}
                  href={getProductHref(product)}
                  index={index}
                  key={product.id ?? product.slug ?? product.productSlug ?? `${product.name}-${index}`}
                />
              ))}
            </div>
            {isLoadingMoreProducts ? (
              <div className="products-infinite-loader" aria-live="polite" aria-label="Ապրանքները բեռնվում են">
                <span aria-hidden="true" />
              </div>
            ) : null}
            {hasMoreProducts ? <div className="products-infinite-trigger" ref={loadMoreTriggerRef} aria-hidden="true" /> : null}
          </section>
        ) : <p className="products-empty">{query.trim() ? 'Որոնման արդյունքներ չեն գտնվել։' : 'Այս գնի միջակայքում կահույք չկա։'}</p>}
      </section>
    </main>
  );
}
