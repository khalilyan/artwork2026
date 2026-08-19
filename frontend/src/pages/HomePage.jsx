import { useEffect, useMemo, useState } from 'react';
import Hero from '../components/sections/Hero.jsx';
import Collections from '../components/sections/Collections.jsx';
import { RestorationSection, TradeInSection } from '../components/sections/HomeServices.jsx';
import Studio from '../components/sections/Studio.jsx';
import ShopCta from '../components/sections/ShopCta.jsx';
import SeoMeta from '../components/ui/SeoMeta.jsx';
import usePageAssets from '../hooks/usePageAssets.js';
import { api } from '../services/api.js';
import { getOptimizedImageUrl } from '../utils/imageCdn.js';
import { createOrganizationSchema, createWebsiteSchema, defaultSeoImage } from '../utils/seo.js';

export default function HomePage() {
  const [homePage, setHomePage] = useState(null);
  const pageImages = usePageAssets('home');
  const baseSlides = homePage?.heroSlides?.length ? homePage.heroSlides : [];
  const slides = useMemo(() => baseSlides.map((slide, index) => ({
    ...slide,
    image: pageImages[`heroSlide${index + 1}`] ?? pageImages[`hero${index + 1}`] ?? slide.image,
  })), [baseSlides, pageImages]);
  const restorationImages = [
    pageImages.restorationBefore ?? pageImages.restorationMain,
    pageImages.restorationAfter ?? pageImages.restorationDetail,
  ];
  const tradeImages = [
    pageImages.tradeMain,
    pageImages.tradeDetail,
  ];
  const hasRestorationImages = restorationImages.some(Boolean);
  const hasTradeImages = tradeImages.some(Boolean);
  const seoImage = getOptimizedImageUrl(pageImages.heroSlide1 ?? pageImages.hero1 ?? slides[0]?.image ?? defaultSeoImage, {
    width: 1600,
    quality: 76,
  });

  useEffect(() => {
    api.page('home')
      .then(({ page }) => setHomePage(page))
      .catch(() => setHomePage(null));
  }, []);

  return (
    <main className="home-page" lang="hy">
      <SeoMeta
        title="ARTWORK | Դիզայներական կահույք Հայաստանում"
        description="Բացահայտեք ARTWORK-ի դիզայներական կահույքը, հավաքածուները, անհատական ինտերիերի լուծումները, վերականգնումն ու trade-in ծառայությունները։"
        image={seoImage}
        url="/"
        keywords="ARTWORK, դիզայներական կահույք Հայաստան, անհատական կահույք Երևան, ինտերիերի կահույք, կահույքի վերականգնում"
        jsonLd={[createWebsiteSchema('/'), createOrganizationSchema('/')]}
      />
      {slides.length ? <Hero slides={slides} /> : null}
      <Collections />
      <RestorationSection images={hasRestorationImages ? restorationImages : undefined} />
      <Studio />
      <TradeInSection images={hasTradeImages ? tradeImages : undefined} />
      <ShopCta
        eyebrow="ՎԵՐՋՆԱԿԱՆ ՇԵՇՏԱԴՐՈՒՄ"
        title="Ձեր հաջորդ ինտերիերը"
        accentTitle="սկսվում է այստեղ"
        buttonText="ՄՈՒՏՔ"
        enterText="ԽԱՆՈՒԹ"
      />
    </main>
  );
}
