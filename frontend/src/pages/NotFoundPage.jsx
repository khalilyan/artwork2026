import { useEffect } from 'react';
import { motion } from 'framer-motion';
import SeoMeta from '../components/ui/SeoMeta.jsx';
import { images } from '../data/homepage.js';
import { fadeUp, staggerGroup } from '../utils/motion.js';

const quickLinks = [
  { label: 'Գլխավոր էջ', href: '/' },
  { label: 'Ապրանքներ', href: '/products' },
  { label: 'Հավաքածուներ', href: '/collections' },
];

export default function NotFoundPage() {
  useEffect(() => {
    document.body.classList.add('is-not-found-view');

    return () => document.body.classList.remove('is-not-found-view');
  }, []);

  return (
    <main className="not-found-page" lang="hy">
      <SeoMeta
        title="404 | ARTWORK Furniture"
        description="Այս ARTWORK էջը չի գտնվել։ Դիտեք կահույքը, սենյակները, հավաքածուները կամ կապ հաստատեք արհեստանոցի հետ։"
        url={typeof window === 'undefined' ? '/404' : window.location.pathname}
        robots="noindex, follow"
      />
      <motion.section className="not-found-shell" variants={staggerGroup} initial="hidden" animate="visible">
        <motion.header className="not-found-topbar" variants={fadeUp}>
          <a className="not-found-brand" href="/" aria-label="ARTWORK գլխավոր էջ">
            <img src={images.logo} alt="" />
            <span>ARTWORK</span>
          </a>
          <span className="label-caps">404</span>
        </motion.header>

        <motion.div className="not-found-content" variants={staggerGroup}>
          <motion.div className="not-found-mark" variants={fadeUp} aria-hidden="true">
            <span>4</span>
            <span className="not-found-zero">0</span>
            <span>4</span>
          </motion.div>

          <motion.div className="not-found-copy" variants={staggerGroup}>
            <motion.p className="label-caps" variants={fadeUp}>Էջը չի գտնվել</motion.p>
            <motion.h1 variants={fadeUp}>Այս հասցեն այլևս հասանելի չէ</motion.h1>
            <motion.p className="not-found-text" variants={fadeUp}>
              Կարող եք վերադառնալ գլխավոր էջ, դիտել ապրանքները կամ շարունակել հավաքածուներից։
            </motion.p>
            <motion.div className="not-found-actions" variants={fadeUp}>
              <a className="not-found-primary label-caps" href="/">Գնալ գլխավոր</a>
              <a className="not-found-secondary label-caps" href="/products">Դիտել ապրանքները</a>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.nav className="not-found-links" variants={fadeUp} aria-label="Օգտակար հղումներ">
          {quickLinks.map((link) => (
            <a href={link.href} key={link.href}>{link.label}</a>
          ))}
        </motion.nav>
      </motion.section>
    </main>
  );
}
