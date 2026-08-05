import { images } from '../../data/homepage.js';

function SocialIcon({ name }) {
  if (name === 'instagram') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.9" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M14 8.2V6.6c0-.8.5-1.2 1.3-1.2h1.4V3.1C16 3 15.2 3 14.2 3c-2.2 0-3.7 1.3-3.7 3.7v1.5H8v2.6h2.5V21H14V10.8h2.4l.4-2.6H14Z" />
    </svg>
  );
}

const footerNavLinks = [
  { label: 'ԳԼԽԱՎՈՐ', href: '/' },
  { label: 'ՍԵՆՅԱԿՆԵՐ', href: '/rooms' },
  { label: 'ՀԱՎԱՔԱԾՈՒՆԵՐ', href: '/collections' },
  { label: 'ՄԵՐ ՄԱՍԻՆ', href: '/about' },
  { label: 'ԿԱՊ', href: '/contact' },
];

const footerContactLinks = [
  { label: '+374 98 871555', href: 'tel:+37498871555' },
  { label: 'artworkarmenia@gmail.com', href: 'mailto:artworkarmenia@gmail.com' },
];

const socialLinks = {
  instagram: 'https://www.instagram.com/artwork_furniture_official?igsh=Z2FiMjlrZnQ4bjRp',
  facebook: 'https://www.facebook.com/share/1EexLxBJow/',
};

export default function Footer() {
  return (
    <footer className="site-footer" lang="hy">
      <div className="container footer-grid">
        <section className="footer-brand" aria-label="ARTWORK ամփոփում">
          <img src={images.logo} alt="ARTWORK լոգո" />
          <p>Արհեստից դեպի արվեստ՝ ստեղծելով կահույք, որը համադրում է որակը, դիզայնը և վարպետությունը</p>
        </section>

        <section className="footer-links" aria-label="Ներքևի նավիգացիա">
          <h5 className="label-caps">ՆԱՎԻԳԱՑԻԱ</h5>
          <nav className="footer-nav" aria-label="ARTWORK էջեր">
            {footerNavLinks.map((link) => (
              <a href={link.href} key={link.href}>{link.label}</a>
            ))}
          </nav>
        </section>

        <section className="footer-contact" aria-label="Կապ">
          <h5 className="label-caps">ԿԱՊ</h5>
          <div className="footer-contact-list">
            {footerContactLinks.map((link) => (
              <a href={link.href} key={link.href}>{link.label}</a>
            ))}
          </div>
          <div className="footer-socials footer-socials-contact">
            <a href={socialLinks.instagram} aria-label="Instagram" target="_blank" rel="noreferrer"><SocialIcon name="instagram" /></a>
            <a href={socialLinks.facebook} aria-label="Facebook" target="_blank" rel="noreferrer"><SocialIcon name="facebook" /></a>
          </div>
        </section>
      </div>

      <div className="container footer-bottom">
        <p className="label-caps">©2026 ARTWORK. ԵՐԵՎԱՆ</p>
      </div>
    </footer>
  );
}
