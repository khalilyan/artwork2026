import { useEffect, useMemo, useState } from 'react';
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

export default function RestavrationPage() {
  const [pageData, setPageData] = useState(restavrationFallbackPage);
  const [previewImage, setPreviewImage] = useState(null);

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

  useEffect(() => {
    if (!previewImage) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setPreviewImage(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [previewImage]);

  const entries = useMemo(() => normalizePage(pageData).entries, [pageData]);
  const hero = pageData?.hero ?? restavrationFallbackPage.hero;
  const seoImage = entries[0]?.afterImage ?? entries[0]?.beforeImage ?? '';
  const previewDialog = previewImage && typeof document !== 'undefined'
    ? createPortal(
      <div className="restavration-image-preview" role="dialog" aria-modal="true" aria-label="Մեծացված նկար" onClick={() => setPreviewImage(null)}>
        <button className="restavration-preview-close" type="button" aria-label="Փակել նկարը" onClick={() => setPreviewImage(null)}>
          <Icon name="close" />
        </button>
        <img src={previewImage.src} alt={previewImage.alt} onClick={(event) => event.stopPropagation()} />
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
                    <button className="restavration-shot-button" type="button" aria-label="Մեծացնել նկար" onClick={() => setPreviewImage({ src: entry.beforeImage, alt: entry.beforeAlt })}>
                      <img src={entry.beforeImage} alt={entry.beforeAlt} loading="lazy" decoding="async" />
                    </button>
                    <figcaption>ԱՌԱՋ / ՀԵՏՈ</figcaption>
                    <span className="restavration-zoom-chip"><Icon name="zoom_in" /></span>
                  </figure>
                ) : (
                  <>
                    <figure className="restavration-shot">
                      <button className="restavration-shot-button" type="button" aria-label="Մեծացնել առաջ նկարը" onClick={() => setPreviewImage({ src: entry.beforeImage, alt: entry.beforeAlt })}>
                        <img src={entry.beforeImage} alt={entry.beforeAlt} loading="lazy" decoding="async" />
                      </button>
                      <figcaption>ԱՌԱՋ</figcaption>
                      <span className="restavration-zoom-chip"><Icon name="zoom_in" /></span>
                    </figure>
                    <figure className="restavration-shot">
                      <button className="restavration-shot-button" type="button" aria-label="Մեծացնել հետո նկարը" onClick={() => setPreviewImage({ src: entry.afterImage, alt: entry.afterAlt })}>
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
