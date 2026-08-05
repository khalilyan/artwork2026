import { motion } from 'framer-motion';
import { fadeUp, staggerGroup, viewportReveal } from '../../utils/motion.js';

export default function Statement() {
  return (
    <motion.section
      className="section section-spacious container reveal-section is-active"
      data-reveal
      variants={staggerGroup}
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
    >
      <div className="statement-grid">
        <motion.h2 variants={fadeUp}>
          Դիզայնը սկսվում է այն պահից, երբ <em>ձևը</em> հանդիպում է <em className="secondary-emphasis">գաղափարին</em>։ Մենք ստեղծում ենք կահույք, որն արտահայտում է ժամանակակից ճաշակ և դառնում ինտերիերի գլխավոր շեշտադրումը
        </motion.h2>
        <motion.div className="statement-aside" variants={staggerGroup}>
          <motion.p variants={fadeUp}>Իրական որակը ժամանակի ընթացքում միայն ավելի արժեքավոր է դառնում։ Այդ պատճառով ARTWORK-ում յուրաքանչյուր նյութ, յուրաքանչյուր գիծ և յուրաքանչյուր մանրուք ընտրվում է երկար տարիներ ծառայելու նպատակով</motion.p>
          <motion.a className="primary-button" href="/about" variants={fadeUp}>ՄԵՐ ՓԻԼԻՍՈՓԱՅՈՒԹՅՈՒՆԸ</motion.a>
        </motion.div>
      </div>
    </motion.section>
  );
}
