import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import SeoMeta from '../components/ui/SeoMeta.jsx';
import { api } from '../services/api.js';
import { fadeUp, staggerGroup, viewportReveal } from '../utils/motion.js';
import { defaultSeoImage } from '../utils/seo.js';

const roomAlignments = ['left', 'right'];
const roomTones = ['light', 'primary', 'walnut'];
const fallbackFurnitureTypeCount = 3;
const roomDesignPattern = [
  { align: 'right', tone: 'light', imageClass: 'is-muted', tall: false, italicDescription: false },
  { align: 'left', tone: 'light', imageClass: '', tall: false, italicDescription: true },
  { align: 'right', tone: 'primary', imageClass: 'is-grayscale', tall: false, italicDescription: false },
  { align: 'left', tone: 'walnut', imageClass: '', tall: true, italicDescription: false },
];

function withRoomPattern(room, index) {
  const pattern = roomDesignPattern[index % roomDesignPattern.length];

  return {
    ...room,
    align: pattern.align,
    tone: room.tone ?? pattern.tone,
    imageClass: room.imageClass ?? pattern.imageClass,
    tall: room.tall ?? pattern.tall,
    italicDescription: room.italicDescription ?? pattern.italicDescription,
  };
}

function normalizeRooms(rooms) {
  return rooms.map((room, index) => ({
    ...room,
    slug: room.slug ?? `room-${index + 1}`,
    roomName: room.roomName ?? room.name ?? room.title ?? `Սենյակ ${index + 1}`,
    title: room.title ?? room.name ?? room.roomName ?? `Սենյակ ${index + 1}`,
    eyebrow: room.eyebrow ?? `ԳԼՈՒԽ ${index + 1}`,
    description: room.description ?? 'Բացահայտեք այս սենյակի համար ընտրված կահույքը։',
    image: room.image ?? '',
  }));
}

function getRoomAlign(room, index) {
  return roomAlignments.includes(room.align) ? room.align : roomAlignments[index % roomAlignments.length];
}

function getRoomTone(room) {
  return roomTones.includes(room.tone) ? room.tone : 'light';
}

function getFurnitureTypeCount(room) {
  return room.categories?.length
    ?? room.furnitureTypes?.length
    ?? room.furnitureTypeCount
    ?? room.typeCount
    ?? fallbackFurnitureTypeCount;
}

function RoomFeature({ room, index }) {
  const patternedRoom = withRoomPattern(room, index);
  const roomHref = `/rooms/${room.slug}`;
  const align = getRoomAlign(patternedRoom, index);
  const tone = getRoomTone(patternedRoom);
  const title = patternedRoom.title ?? patternedRoom.roomName ?? 'Սենյակ';
  const roomName = patternedRoom.roomName ?? patternedRoom.name ?? title;
  const furnitureTypeCount = getFurnitureTypeCount(patternedRoom);
  const ctaText = `ՄՈՒՏՔ ԴԵՊԻ ${roomName}`;

  return (
    <motion.section
      className={`room-feature ${patternedRoom.tall ? 'is-tall' : ''}`}
      variants={staggerGroup}
      initial="hidden"
      whileInView="visible"
      viewport={viewportReveal}
    >
      <motion.a className={`room-background parallax-container reveal-section is-active ${patternedRoom.imageClass ?? ''}`} href={roomHref} data-reveal aria-label={`Բացել ${title}`} variants={fadeUp}>
        {patternedRoom.image ? <img className="room-parallax-image" data-room-parallax src={patternedRoom.image} alt={title} /> : null}
      </motion.a>
      <div className="room-content-grid">
        <motion.a className={`room-card is-${align} tone-${tone} reveal-section is-active`} href={roomHref} data-reveal variants={fadeUp}>
          <motion.span className="label-caps" variants={fadeUp}>ՊԱՐՈՒՆԱԿՈՒՄ Է {furnitureTypeCount} տեսակ կահույք</motion.span>
          <motion.h2 variants={fadeUp}>{title}</motion.h2>
          <motion.p className={patternedRoom.italicDescription ? 'is-italic' : ''} variants={fadeUp}>{patternedRoom.description ?? 'Բացահայտեք այս սենյակի համար ընտրված կահույքը։'}</motion.p>
          <motion.span className="room-link label-caps" variants={fadeUp}>{ctaText}</motion.span>
        </motion.a>
      </div>
    </motion.section>
  );
}

export default function ShopByRoomsPage() {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    api.rooms()
      .then(({ rooms: nextRooms }) => {
        setRooms(nextRooms?.length ? normalizeRooms(nextRooms) : []);
      })
      .catch(() => setRooms([]));
  }, []);

  return (
    <main className="shopbyrooms-page" lang="hy">
      <SeoMeta
        title="Կահույք ըստ սենյակների | ARTWORK"
        description="Գտեք ARTWORK-ի դիզայներական կահույքը ըստ սենյակների՝ հյուրասենյակ, ննջասենյակ, ճաշասենյակ, աշխատասենյակ և այլ ինտերիերներ։"
        image={rooms[0]?.image ?? defaultSeoImage}
        url="/rooms"
        keywords="կահույք ըստ սենյակների, հյուրասենյակի կահույք, ննջասենյակի կահույք, ճաշասենյակի կահույք, ARTWORK"
      />
      <motion.header
        className="rooms-hero container"
        variants={staggerGroup}
        initial="hidden"
        animate="visible"
      >
        <div className="rooms-hero-grid">
          <motion.div className="rooms-hero-copy reveal-section is-active" data-reveal variants={staggerGroup}>
            <motion.h1 variants={fadeUp}>Ինտերիեր դիզայն<br /><em>Ըստ սենյակների</em></motion.h1>
            <motion.p variants={fadeUp}>Յուրաքանչյուր տարածք ունի իր բնավորությունը։ Ընտրեք սենյակը և բացահայտեք այն կահույքը, որը ստեղծված է հենց դրա համար։</motion.p>
          </motion.div>
        </div>
      </motion.header>

      {rooms.map((room, index) => (
        <RoomFeature room={room} index={index} key={room.slug ?? room.eyebrow ?? index} />
      ))}

      <motion.section
        className="rooms-cta"
        variants={staggerGroup}
        initial="hidden"
        whileInView="visible"
        viewport={viewportReveal}
      >
        <div className="container">
          <motion.h2 className="reveal-section is-active rooms-cta-title" data-reveal variants={fadeUp}>
            <span>Անհատական</span>
            <em>պատվերնորի համար</em>
          </motion.h2>
          <motion.a className="primary-button rooms-cta-button" href="/contact" variants={fadeUp}>Կապ հաստատել</motion.a>
        </div>
      </motion.section>
    </main>
  );
}
