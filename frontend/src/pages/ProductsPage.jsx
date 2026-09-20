import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/ui/Icon.jsx';
import SeoMeta from '../components/ui/SeoMeta.jsx';
import { api } from '../services/api.js';
import { formatAmdPrice, formatAmdPriceByUnit, formatCatalogProductPrice, getPriceAmount } from '../utils/currency.js';
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
const armenianToLatinMap = {
  ա: 'a', բ: 'b', գ: 'g', դ: 'd', ե: 'e', զ: 'z', է: 'e', ը: 'y', թ: 't', ժ: 'zh', ի: 'i', լ: 'l',
  խ: 'kh', ծ: 'ts', կ: 'k', հ: 'h', ձ: 'dz', ղ: 'gh', ճ: 'ch', մ: 'm', յ: 'y', ն: 'n', շ: 'sh',
  ո: 'o', չ: 'ch', պ: 'p', ջ: 'j', ռ: 'r', ս: 's', վ: 'v', տ: 't', ր: 'r', ց: 'ts', ու: 'u',
  փ: 'p', ք: 'q', օ: 'o', ֆ: 'f', և: 'ev',
};

function toSearchKey(value) {
  const normalized = String(value ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  let transliterated = '';

  for (let index = 0; index < normalized.length; index += 1) {
    const twoLetters = normalized.slice(index, index + 2);
    if (armenianToLatinMap[twoLetters]) {
      transliterated += armenianToLatinMap[twoLetters];
      index += 1;
      continue;
    }

    const letter = normalized[index];
    transliterated += armenianToLatinMap[letter] ?? letter;
  }

  return transliterated.replace(/[^a-z0-9]+/g, ' ').trim();
}

function splitSearchWords(value) {
  return String(value ?? '').split(/\s+/).filter((word) => word.length > 1);
}

function levenshteinDistance(left, right) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = new Array(right.length + 1);
  const current = new Array(right.length + 1);

  for (let column = 0; column <= right.length; column += 1) {
    previous[column] = column;
  }

  for (let row = 1; row <= left.length; row += 1) {
    current[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + substitutionCost,
      );
    }

    for (let column = 0; column <= right.length; column += 1) {
      previous[column] = current[column];
    }
  }

  return previous[right.length];
}

function wordsRoughlyMatch(baseWord, queryWord) {
  if (!baseWord || !queryWord) return false;
  if (baseWord === queryWord || baseWord.includes(queryWord) || queryWord.includes(baseWord)) return true;
  if (Math.abs(baseWord.length - queryWord.length) > 1) return false;
  if (baseWord.length < 4 || queryWord.length < 4) return false;
  return levenshteinDistance(baseWord, queryWord) <= 1;
}

function getProductSearchKey(product) {
  return toSearchKey([
    product.name,
    product.slug,
    product.id,
    product.sku,
    product.description,
    product.type,
    product.categorySlug,
    product.group,
    ...(product.roomSlugs ?? []),
    ...(product.hashtags ?? []),
  ].filter(Boolean).join(' '));
}

function getProductSearchWords(product) {
  return splitSearchWords(getProductSearchKey(product));
}

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
  const [isFiltersOpen, setIsFiltersOpen] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth > 1024));

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

  useEffect(() => {
    let isCurrentRequest = true;
    let loadingTimer = null;
    const loadingStartedAt = performance.now();

    setIsProductsLoading(true);
    api.products({ roomSlug, categorySlug: categoryFilter })
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
  }, [categoryFilter, query, roomSlug]);

  const absoluteMaxPrice = defaultMaxPrice;

  const visibleProducts = useMemo(() => {
    const low = Math.max(defaultMinPrice, Math.min(minPrice, maxPrice));
    const high = Math.min(defaultMaxPrice, Math.max(minPrice, maxPrice));
    const queryKey = toSearchKey(query);
    const queryWords = splitSearchWords(queryKey);

    return products
      .filter((product) => {
        if (queryKey) {
          const productKey = getProductSearchKey(product);
          const productWords = getProductSearchWords(product);
          const hasFuzzyWordMatch = queryWords.length
            ? queryWords.every((queryWord) => productWords.some((word) => wordsRoughlyMatch(word, queryWord)))
            : false;
          const matchesQuery = productKey.includes(queryKey)
            || queryWords.some((word) => productKey.includes(word))
            || hasFuzzyWordMatch;
          if (!matchesQuery) return false;
        }

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
  }, [isPriceFilterActive, maxPrice, minPrice, products, query, sort]);

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
  const roomEyebrowLabel = room ? `${roomHeadingTitle}ային կահույք` : 'ԸՆՏՐՎԱԾ ԿԱՀՈՒՅՔ';
  const productsEyebrow = isRoomCategoryPage
    ? `${roomHeadingTitle} - ${furnitureTypeName || 'Բոլոր ապրանքները'}`
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
            <h1>{query ? `Որոնում՝ ${query}` : isRoomCategoryPage ? `${roomHeadingTitle} - ${furnitureTypeName}` : isRoomAllPage ? `${roomHeadingTitle} • ամբողջ տեսականին` : 'Ցանկալի կահույք'}</h1>
            <p>
              {isRoomCategoryPage
                ? `Ձեռագործ ${furnitureTypeName}ներ, որոնք համադրում են բարձրակարգ նյութերը, վարպետական մշակումը և ժամանակակից դիզայնը՝ ստեղծելով ներդաշնակ ինտերիեր`
                : isRoomAllPage
                  ? `${roomHeadingTitle}ի համար նախատեսված կահույքի ամբողջ տեսականին՝ մեկ էջում`
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
              <span className="label-caps">{String(visibleProducts.length).padStart(2, '0')} ԱՊՐԱՆՔ</span>
              <h2>{roomHeadingTitle}</h2>
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
          </section>
        ) : <p className="products-empty">Այս գնի միջակայքում կահույք չկա։</p>}
      </section>
    </main>
  );
}
