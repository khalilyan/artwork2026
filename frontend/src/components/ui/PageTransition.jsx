import { useEffect, useState } from 'react';

const transitionOutDelay = 1250;
const entranceHold = 1150;

export default function PageTransition() {
  const [isActive, setIsActive] = useState(true);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    const entranceTimer = window.setTimeout(() => {
      setIsActive(false);
    }, entranceHold);

    const handleInternalLink = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      if (!(event.target instanceof Element)) return;

      const link = event.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || link.target || link.hasAttribute('download')) return;

      const nextUrl = new URL(href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;
      if (nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search && nextUrl.hash) return;

      event.preventDefault();
      setAnimationKey((key) => key + 1);
      setIsActive(true);

      window.setTimeout(() => {
        window.location.href = nextUrl.href;
      }, transitionOutDelay);
    };

    document.addEventListener('click', handleInternalLink);

    return () => {
      window.clearTimeout(entranceTimer);
      document.removeEventListener('click', handleInternalLink);
    };
  }, []);

  return (
    <div className={`page-transition ${isActive ? 'is-active' : ''}`} aria-hidden="true">
      <div className="page-transition-mark" key={animationKey}>
        <svg className="blueprint-logo" viewBox="0 0 160 160" role="img" aria-label="">
          <defs>
            <path id="transition-logo-word-arc" d="M30 80a50 50 0 1 1 100 0" />
          </defs>
          <path className="blueprint-path blueprint-construction" d="M20 80h120M80 20v120M39 39l82 82M121 39l-82 82" />
          <path className="blueprint-path blueprint-construction" d="M31 31h98v98H31ZM47 20v120M113 20v120M20 47h120M20 113h120" />
          <circle className="blueprint-path blueprint-dashed" cx="80" cy="80" r="70" />
          <circle className="blueprint-path blueprint-construction" cx="80" cy="80" r="62" />
          <circle className="blueprint-path blueprint-soft" cx="80" cy="80" r="49" />
          <circle className="blueprint-path blueprint-soft" cx="80" cy="80" r="36" />
          <path className="blueprint-path blueprint-soft blueprint-wreath" d="M35 80c0-25 20-45 45-45s45 20 45 45-20 45-45 45-45-20-45-45Z" />
          <path className="blueprint-path blueprint-monogram" d="M52 114 80 42l28 72M63 84h34M60 114l20-52 20 52" />
          <line className="blueprint-path blueprint-measure" x1="80" x2="80" y1="4" y2="17" />
          <line className="blueprint-path blueprint-measure" x1="80" x2="80" y1="143" y2="156" />
          <line className="blueprint-path blueprint-measure" x1="4" x2="17" y1="80" y2="80" />
          <line className="blueprint-path blueprint-measure" x1="143" x2="156" y1="80" y2="80" />
          <line className="blueprint-path blueprint-measure" x1="132" x2="148" y1="32" y2="16" />
          <line className="blueprint-path blueprint-measure" x1="122" x2="146" y1="116" y2="140" />
          <path className="blueprint-path blueprint-ticks" d="M75 10h10M75 150h10M10 75v10M150 75v10M35 25l-7-7M125 25l7-7M35 135l-7 7M125 135l7 7" />
          <text className="blueprint-arc-text">
            <textPath href="#transition-logo-word-arc" startOffset="50%" textAnchor="middle">ARTWORK</textPath>
          </text>
          <text className="blueprint-text" x="87" y="15">R70.00</text>
          <text className="blueprint-text" x="119" y="77">DIA 140</text>
          <text className="blueprint-text" x="19" y="76">AXIS A</text>
          <text className="blueprint-text" x="58" y="146">REF LOGO-24</text>
        </svg>
        <span className="page-transition-label label-caps">Technical Branding Protocol</span>
      </div>
    </div>
  );
}
