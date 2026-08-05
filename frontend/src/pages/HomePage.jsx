import { useEffect, useState } from 'react';
import Hero from '../components/sections/Hero.jsx';
import Collections from '../components/sections/Collections.jsx';
import { RestorationSection, TradeInSection } from '../components/sections/HomeServices.jsx';
import Studio from '../components/sections/Studio.jsx';
import ShopCta from '../components/sections/ShopCta.jsx';
import SeoMeta from '../components/ui/SeoMeta.jsx';
import { heroSlides } from '../data/homepage.js';
import usePageAssets from '../hooks/usePageAssets.js';
import { api } from '../services/api.js';
import { createOrganizationSchema, createWebsiteSchema, defaultSeoImage } from '../utils/seo.js';

export default function HomePage() {
  const [homePage, setHomePage] = useState(null);
  const pageImages = usePageAssets('home');
  const baseSlides = homePage?.heroSlides?.length ? homePage.heroSlides : heroSlides;
  const slides = baseSlides.map((slide, index) => ({
    ...slide,
    image: pageImages[`heroSlide${index + 1}`] ?? pageImages[`hero${index + 1}`] ?? slide.image,
  }));
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

  useEffect(() => {
    api.page('home')
      .then(({ page }) => setHomePage(page))
      .catch(() => setHomePage(null));
  }, []);

  return (
    <main className="home-page" lang="hy">
      <SeoMeta
        title="ARTWORK Furniture | Designer Furniture in Armenia"
        description="Discover ARTWORK Furniture: designer furniture, curated collections, custom interior pieces, restoration, and trade-in services for refined homes in Armenia."
        image={pageImages.heroSlide1 ?? pageImages.hero1 ?? slides[0]?.image ?? defaultSeoImage}
        url="/"
        keywords="ARTWORK Furniture, designer furniture Armenia, custom furniture Yerevan, luxury furniture Armenia, interior design furniture, furniture restoration Armenia"
        jsonLd={[createWebsiteSchema('/'), createOrganizationSchema('/')]}
      />
      <Hero slides={slides} />
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
