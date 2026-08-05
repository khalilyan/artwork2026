import { motion } from 'framer-motion';
import { images } from '../../data/homepage.js';
import { fadeUp, staggerGroup, viewportReveal } from '../../utils/motion.js';

const logoRevealFromRight = {
  hidden: { opacity: 0, x: 80 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 3, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function Studio() {
  return (
    <motion.section
      id="showroom"
      className="section section-spacious container reveal-section is-active"
      data-reveal
      variants={staggerGroup}
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
    >
      <div className="studio-grid">
        <motion.div className="studio-copy" variants={staggerGroup}>
          <motion.p className="label-caps kicker" variants={fadeUp}>ՄԵՐ ՄԱՍԻՆ</motion.p>
          <motion.h2 variants={fadeUp}>ԱՐՀԵՍՏԻՑ ՄԻՆՉԵՎ <br /><em>ԱՐՎԵՍՏ</em></motion.h2>
          <motion.p className="studio-body" variants={fadeUp}>
            ARTWORK-ը միավորում է ժամանակակից դիզայնը, ճարտարապետական մտածողությունը և վարպետությունը։ Մենք ստեղծում ենք կահույք, որը ներդաշնակորեն միաձուլվում է տարածքին՝ հաղորդելով նրան բնավորություն, հավասարակշռություն և ինքնատիպություն
          </motion.p>
          <motion.div className="studio-stats" variants={staggerGroup}>
            <motion.div variants={fadeUp}>
              <strong>100%</strong>
              <span className="label-caps">ԲՆԱԿԱՆ ԵՎ ԲԱՐՁՐՈՐԱԿ ՆՅՈՒԹԵՐ</span>
            </motion.div>
            <motion.div variants={fadeUp}>
              <strong>50+</strong>
              <span className="label-caps">ԱՆՀԱՏԱԿԱՆ ԻՆՏԵՐԻԵՐԱՅԻՆ ՆԱԽԱԳԾԵՐ</span>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          className="studio-logo-orbit"
          variants={logoRevealFromRight}
        >
          <motion.img
            src={images.logo}
            alt="ARTWORK լոգո"
          />
        </motion.div>
      </div>
    </motion.section>
  );
}
