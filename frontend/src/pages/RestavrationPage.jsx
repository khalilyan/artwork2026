import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../components/ui/Icon.jsx';
import SeoMeta from '../components/ui/SeoMeta.jsx';
import { restavrationFallbackPage } from '../data/restavrationPage.js';
import { api } from '../services/api.js';

function normalizePage(page) {
  if (!page || typeof page !== 'object') return restavrationFallbackPage;

  return {
    ...restavrationFallbackPage,
    ...page,
    hero: {
      ...restavrationFallbackPage.hero,
      ...(page.hero ?? {}),
    },
    entries: Array.isArray(page.entries) && page.entries.length
      ? page.entries.map((entry, index) => ({
        id: entry.id ?? String(index + 1).padStart(2, '0'),
        beforeImage: entry.beforeImage ?? restavrationFallbackPage.entries[index]?.beforeImage ?? '',
        afterImage: entry.afterImage ?? restavrationFallbackPage.entries[index]?.afterImage ?? entry.beforeImage ?? '',
        beforeAlt: entry.beforeAlt ?? 'Մինչ վերականգնումը',
        afterAlt: entry.afterAlt ?? 'Վերականգնումից հետո',
        price: entry.price ?? 'Գինը կհստակեցվի',
        description: entry.description ?? '',
        notes: Array.isArray(entry.notes) ? entry.notes.filter(Boolean) : [],
      }))
      : restavrationFallbackPage.entries,
  };
}

function getEntryPreviewImages(entry) {
  if (!entry) return [];

  const beforeImage = entry.beforeImage ?? '';
  const afterImage = entry.afterImage ?? '';

  if (beforeImage && afterImage && beforeImage === afterImage) {
    return [{ src: beforeImage, alt: entry.beforeAlt ?? 'Մեծացված նկար', label: 'ԱՌԱՋ / ՀԵՏՈ' }];
  }

  const images = [];
  if (beforeImage) images.push({ src: beforeImage, alt: entry.beforeAlt ?? 'Մինչ վերականգնումը', label: 'ԱՌԱՋ' });
  if (afterImage) images.push({ src: afterImage, alt: entry.afterAlt ?? 'Վերականգնումից հետո', label: 'ՀԵՏՈ' });
  return images;
}

export default function RestavrationPage() {
  const [pageData, setPageData] = useState(restavrationFallbackPage);
  const [previewState, setPreviewState] = useState(null);
  const previewTouchStartRef = useRef(null);

  useEffect(() => {
    let isActive = true;

    api.page('restavration')
      .then(({ page }) => {
        if (!isActive) return;
        setPageData(normalizePage(page));
      })
      .catch(() => {
        if (!isActive) return;
        setPageData(restavrationFallbackPage);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const entries = useMemo(() => normalizePage(pageData).entries, [pageData]);
  const previewImages = useMemo(() => {
    if (!previewState) return [];
    return getEntryPreviewImages(entries[previewState.entryIndex]);
  }, [entries, previewState]);
  const currentPreview = previewState
    ? previewImages[previewState.imageIndex] ?? previewImages[0] ?? null
    : null;
  const canGoPrev = Boolean(previewState && previewState.imageIndex > 0);
  const canGoNext = Boolean(previewState && previewState.imageIndex < previewImages.length - 1);

  const closePreview = useCallback(() => setPreviewState(null), []);

  const openPreview = useCallback((entryIndex, imageIndex = 0) => {
    const images = getEntryPreviewImages(entries[entryIndex]);
    if (!images.length) return;

    setPreviewState({
      entryIndex,
      imageIndex: Math.max(0, Math.min(imageIndex, images.length - 1)),
    });
  }, [entries]);

  const movePreview = useCallback((direction) => {
    setPreviewState((current) => {
      if (!current) return current;
      const images = getEntryPreviewImages(entries[current.entryIndex]);
      if (images.length < 2) return current;

      const nextIndex = current.imageIndex + direction;
      if (nextIndex < 0 || nextIndex >= images.length) return current;

      return { ...current, imageIndex: nextIndex };
    });
  }, [entries]);

  useEffect(() => {
    if (!previewState) return;

    const images = getEntryPreviewImages(entries[previewState.entryIndex]);
    if (!images.length) {
      setPreviewState(null);
      return;
    }

    if (previewState.imageIndex > images.length - 1) {
      setPreviewState((current) => (current
        ? { ...current, imageIndex: images.length - 1 }
        : current));
    }
  }, [entries, previewState]);

  useEffect(() => {
    if (!currentPreview) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        closePreview();
      }
      if (event.key === 'ArrowLeft') {
        movePreview(-1);
      }
      if (event.key === 'ArrowRight') {
        movePreview(1);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [closePreview, currentPreview, movePreview]);

  const hero = pageData?.hero ?? restavrationFallbackPage.hero;
  const seoImage = entries[0]?.afterImage ?? entries[0]?.beforeImage ?? '';

  const handlePreviewTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    previewTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handlePreviewTouchEnd = (event) => {
    const start = previewTouchStartRef.current;
    const touch = event.changedTouches?.[0];
    previewTouchStartRef.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absY > absX && deltaY > 70) {
      closePreview();
      return;
    }

    if (absX > absY && absX > 56) {
      if (deltaX > 0) movePreview(-1);
      else movePreview(1);
    }
  };

  const previewDialog = currentPreview && typeof document !== 'undefined'
    ? createPortal(
      <div className="restavration-image-preview" role="dialog" aria-modal="true" aria-label="Մեծացված նկար" onClick={closePreview}>
        <button className="restavration-preview-close" type="button" aria-label="Փակել նկարը" onClick={closePreview}>
          <Icon name="close" />
        </button>
        <div
          className="restavration-preview-stage"
          onClick={(event) => event.stopPropagation()}
          onTouchStart={handlePreviewTouchStart}
          onTouchEnd={handlePreviewTouchEnd}
        >
          <button
            className="restavration-preview-nav is-prev"
            type="button"
            aria-label="Նախորդ նկարը"
            onClick={() => movePreview(-1)}
            disabled={!canGoPrev}
          >
            <Icon name="chevron_left" />
          </button>
          <img src={currentPreview.src} alt={currentPreview.alt} />
          <button
            className="restavration-preview-nav is-next"
            type="button"
            aria-label="Հաջորդ նկարը"
            onClick={() => movePreview(1)}
            disabled={!canGoNext}
          >
            <Icon name="chevron_right" />
          </button>
        </div>
        <div className="restavration-preview-footer" onClick={(event) => event.stopPropagation()}>
          {previewImages.length > 1 ? (
            <span className="restavration-preview-counter label-caps">{previewState.imageIndex + 1} / {previewImages.length} - {currentPreview.label}</span>
          ) : (
            <span className="restavration-preview-counter label-caps">{currentPreview.label}</span>
          )}
          <span className="restavration-preview-swipe label-caps">ՍԱՀԵՑՐԵՔ ՆԵՐՔԵՎ՝ ՓԱԿԵԼՈՒ ՀԱՄԱՐ</span>
        </div>
      </div>,
      document.body,
    )
    : null;

  return (
    <main className="restavration-page" lang="hy">
      <SeoMeta
        title="Վերականգնում | ARTWORK"
        description="ARTWORK վերականգնման աշխատանքների արխիվ. մինչ/հետո իրական օրինակներ, գներ և կատարված աշխատանքի նկարագրություններ։"
        image={seoImage}
        url="/restavration"
        keywords="վերականգնում, կահույքի վերանորոգում, մինչ հետո վերականգնում, ARTWORK"
      />

      <section className="restavration-hero container">
        <div className="restavration-hero-copy">
          <p className="label-caps">{hero.eyebrow}</p>
          <h1>{hero.title}</h1>
          <p>{hero.body}</p>
        </div>
      </section>

      <section className="restavration-list container" aria-label="Վերականգնման աշխատանքներ">
        {entries.map((entry, index) => {
          const isSingleVisual = entry.beforeImage === entry.afterImage;

          return (
            <article className="restavration-item" key={entry.id ?? index}>
              <div className={`restavration-visual ${isSingleVisual ? 'is-single' : ''}`}>
                {isSingleVisual ? (
                  <figure className="restavration-shot">
                    <button className="restavration-shot-button" type="button" aria-label="Մեծացնել նկար" onClick={() => openPreview(index, 0)}>
                      <img src={entry.beforeImage} alt={entry.beforeAlt} loading="lazy" decoding="async" />
                    </button>
                    <figcaption>ԱՌԱՋ / ՀԵՏՈ</figcaption>
                    <span className="restavration-zoom-chip"><Icon name="zoom_in" /></span>
                  </figure>
                ) : (
                  <>
                    <figure className="restavration-shot">
                      <button className="restavration-shot-button" type="button" aria-label="Մեծացնել առաջ նկարը" onClick={() => openPreview(index, 0)}>
                        <img src={entry.beforeImage} alt={entry.beforeAlt} loading="lazy" decoding="async" />
                      </button>
                      <figcaption>ԱՌԱՋ</figcaption>
                      <span className="restavration-zoom-chip"><Icon name="zoom_in" /></span>
                    </figure>
                    <figure className="restavration-shot">
                      <button className="restavration-shot-button" type="button" aria-label="Մեծացնել հետո նկարը" onClick={() => openPreview(index, 1)}>
                        <img src={entry.afterImage} alt={entry.afterAlt} loading="lazy" decoding="async" />
                      </button>
                      <figcaption>ՀԵՏՈ</figcaption>
                      <span className="restavration-zoom-chip"><Icon name="zoom_in" /></span>
                    </figure>
                  </>
                )}
              </div>

              <div className="restavration-content">
                <div className="restavration-meta-row">
                  <span className="label-caps">#{String(index + 1).padStart(2, '0')}</span>
                  <span className="restavration-meta-arrow"><Icon name="trending_flat" /> ԱՌԱՋ → ՀԵՏՈ</span>
                </div>
                <p className="restavration-price">{entry.price}</p>
                <div className="restavration-description-box">
                  <p className="restavration-description">{entry.description}</p>
                </div>
                {entry.notes?.length ? (
                  <ul>
                    {entry.notes.map((note) => (
                      <li key={note}>
                        <Icon name="arrow_right_alt" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </article>
          );
        })}

        <div className="restavration-cta-wrap">
          <a className="restavration-cta label-caps" href="/contact">ՍԿՍԵԼ ԿԱՀՈՒՅՔԻ ՎԵՐԱՆՈՐՈԳՈՒՄԸ</a>
        </div>
      </section>

      {previewDialog}
    </main>
  );
}
