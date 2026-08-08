import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Icon from '../components/ui/Icon.jsx';
import SeoMeta from '../components/ui/SeoMeta.jsx';
import { api } from '../services/api.js';
import { fadeUp, staggerGroup, viewportReveal } from '../utils/motion.js';

function FurnitureCategory({ category, index, roomName }) {
  const categoryHref = `/rooms/${category.roomSlug}/${category.slug}`;
  const cardSide = (index + 1) % 2 === 0 ? 'left' : 'right';
  const roomLabel = `${roomName.toLocaleUpperCase('hy-AM')}-Ի ՀԱՄԱՐ`;
  const categoryName = category.title ?? category.name ?? '';

  return (
    <motion.article
      className={`furniture-category is-card-${cardSide}`}
      variants={staggerGroup}
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
    >
      <motion.a className="furniture-image-shell" href={categoryHref} aria-label={`Բացել ${category.title}`} variants={fadeUp}>
        <div className="parallax-container furniture-parallax-frame">
          <img className="furniture-parallax-image" data-furniture-parallax src={category.image} alt={category.title} />
        </div>
      </motion.a>
      <motion.div className="furniture-category-panel reveal-section is-active" data-reveal variants={staggerGroup}>
        <motion.p className="label-caps" variants={fadeUp}>{roomLabel}</motion.p>
        <motion.h2 variants={fadeUp}>{category.title}</motion.h2>
        <motion.p variants={fadeUp}>{category.description}</motion.p>
        <motion.a className="furniture-link label-caps" href={categoryHref} variants={fadeUp}>Տեսնել {categoryName}-ները</motion.a>
      </motion.div>
    </motion.article>
  );
}

export default function FurnitureRoomPage({ roomSlug }) {
  const [room, setRoom] = useState(null);

  useEffect(() => {
    api.room(roomSlug)
      .then(({ room: nextRoom }) => setRoom({ ...nextRoom, categories: nextRoom.categories ?? [] }))
      .catch(() => setRoom(null));
  }, [roomSlug]);

  const roomName = room?.roomName ?? room?.title ?? room?.name ?? '';
  const roomImage = room?.image ?? room?.categories?.[0]?.image ?? '/artwork-logo.png';
  const roomBrandLogo = '/artwork-logo.png';
  const categories = room?.categories ?? [];

  return (
    <main className="furniture-room-page" lang="hy">
      <SeoMeta
        title={`${roomName || 'Սենյակ'} | ARTWORK կահույք`}
        description={`${roomName || 'Այս սենյակի'} համար բացահայտեք ARTWORK-ի դիզայներական կահույքը, ընտրված բաժինները, նուրբ նյութերը և անհատական ինտերիերի լուծումները։`}
        image={roomImage}
        url={`/rooms/${roomSlug}`}
        keywords={`${roomName || 'սենյակ'} կահույք, ARTWORK, դիզայներական կահույք Հայաստան, անհատական սենյակային կահույք`}
      />
      <motion.section
        className="furniture-hero"
        variants={staggerGroup}
        initial="hidden"
        animate="visible"
      >
        <motion.img className="furniture-brand-logo reveal-section is-active" data-reveal src={roomBrandLogo} alt="ARTWORK լոգո" variants={fadeUp} />
        <motion.p className="label-caps reveal-section is-active" data-reveal variants={fadeUp}>ԿԱՀՈՒՅՔԻ ՏԵՍԱԿՆԵՐԸ</motion.p>
        <motion.h1 className="reveal-section is-active" data-reveal variants={fadeUp}>{roomName}</motion.h1>
        <motion.div className="furniture-hero-line reveal-section is-active" data-reveal variants={fadeUp} />
      </motion.section>

      <section className="furniture-category-stack">
        {categories.map((category, index) => (
          <FurnitureCategory category={category} index={index} roomName={roomName} key={category.slug ?? category.title ?? index} />
        ))}
      </section>

      <motion.section
        className="furniture-quote"
        variants={staggerGroup}
        initial="hidden"
        whileInView="visible"
        viewport={viewportReveal}
      >
        <motion.div className="container reveal-section is-active" data-reveal variants={staggerGroup}>
          <Icon name="format_quote" className="furniture-quote-icon" />
          <motion.p variants={fadeUp}>Մենք վերածում ենք արհեստը արվեստի, իսկ գաղափարները՝ ապրելու միջավայրի։ {roomName}-ի համար ընտրված յուրաքանչյուր կահույք համադրում է դիզայնը, ֆունկցիոնալությունն ու բարձր վարպետությունը</motion.p>
          <motion.span className="label-caps" variants={fadeUp}>- ARTWORK ՓԻԼԻՍՈՓԱՅՈՒԹՅՈՒՆ</motion.span>
        </motion.div>
      </motion.section>
    </main>
  );
}
