import { useEffect, useRef, useState } from 'react';
import { images } from '../../data/homepage.js';
import Icon from '../ui/Icon.jsx';
import { api, getGuestCart, isAuthorized } from '../../services/api.js';

export default function Header() {
  const currentPath = typeof window === 'undefined' ? '/' : window.location.pathname.toLowerCase();
  const currentTarget = typeof window === 'undefined' ? '/' : `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasAccount, setHasAccount] = useState(() => (typeof window === 'undefined' ? false : isAuthorized()));
  const [cartCount, setCartCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isHomePage = currentPath === '/';
  const [isHomeAtTop, setIsHomeAtTop] = useState(() => (typeof window === 'undefined' ? true : window.scrollY < 12));

  useEffect(() => {
    let isMounted = true;

    const countItems = (items) => items.reduce((sum, item) => {
      const quantity = Number(item.quantity ?? 1);
      const includedCount = item.itemType === 'collection' ? Math.max(item.productSlugs?.length ?? item.products?.length ?? 1, 1) : 1;
      return sum + quantity * includedCount;
    }, 0);

    const syncHeaderState = async () => {
      const nextHasAccount = isAuthorized();
      setHasAccount(nextHasAccount);

      if (!nextHasAccount) {
        setCartCount(countItems(getGuestCart()));
        return;
      }

      try {
        const { user } = await api.account();
        if (isMounted) setCartCount(countItems(user.cart ?? []));
      } catch {
        if (isMounted) setCartCount(0);
      }
    };

    syncHeaderState();
    window.addEventListener('storage', syncHeaderState);
    window.addEventListener('artwork-auth-change', syncHeaderState);
    window.addEventListener('artwork-cart-change', syncHeaderState);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', syncHeaderState);
      window.removeEventListener('artwork-auth-change', syncHeaderState);
      window.removeEventListener('artwork-cart-change', syncHeaderState);
    };
  }, []);

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    document.body.classList.toggle('has-mobile-menu-open', isMenuOpen);

    const closeMenuOnEscape = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    const closeMenuOnWideScreen = () => {
      if (window.innerWidth > 1024) setIsMenuOpen(false);
    };

    document.addEventListener('keydown', closeMenuOnEscape);
    window.addEventListener('resize', closeMenuOnWideScreen, { passive: true });

    return () => {
      document.body.classList.remove('has-mobile-menu-open');
      document.removeEventListener('keydown', closeMenuOnEscape);
      window.removeEventListener('resize', closeMenuOnWideScreen);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isHomePage) {
      setIsHomeAtTop(false);
      return undefined;
    }

    const updateHeaderSurface = () => setIsHomeAtTop(window.scrollY < 12);

    updateHeaderSurface();
    window.addEventListener('scroll', updateHeaderSurface, { passive: true });

    return () => window.removeEventListener('scroll', updateHeaderSurface);
  }, [isHomePage]);

  useEffect(() => {
    const closeSearchOnOutsideClick = (event) => {
      if (!searchRef.current?.contains(event.target)) setIsSearchOpen(false);
    };

    document.addEventListener('pointerdown', closeSearchOnOutsideClick);

    return () => document.removeEventListener('pointerdown', closeSearchOnOutsideClick);
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();

    if (!isSearchOpen) {
      setIsSearchOpen(true);
      return;
    }

    const query = searchTerm.trim();
    if (query) window.location.href = `/products?q=${encodeURIComponent(query)}`;
  };

  const navClass = (href, extraClass = '') => {
    const isActive = href === '/'
      ? currentPath === '/'
      : currentPath === href || currentPath.startsWith(`${href}/`);

    return `label-caps nav-link ${isActive ? 'nav-link-strong is-active' : 'nav-link-muted'} ${extraClass}`.trim();
  };

  const closeMobileMenu = () => setIsMenuOpen(false);
  const authHref = `/auth?redirect=${encodeURIComponent(currentTarget)}`;

  return (
    <header className={`site-header ${isHomePage && isHomeAtTop ? 'is-home-top' : ''} ${isMenuOpen ? 'is-menu-open' : ''}`} lang="hy">
      <a className="header-logo" href="/" aria-label="ARTWORK տուն">
        <img src={images.logo} alt="ARTWORK լոգո" />
      </a>

      <nav id="mobile-menu-panel" className="header-menu" aria-label="Հիմնական նավիգացիա">
        <a className={navClass('/')} href="/">ԳԼԽԱՎՈՐ</a>
        <a className={navClass('/rooms')} href="/rooms">ՍԵՆՅԱԿՆԵՐ</a>
        <a className={navClass('/collections', 'hide-mobile')} href="/collections">ՀԱՎԱՔԱԾՈՒՆԵՐ</a>
        <a className={navClass('/about', 'hide-mobile')} href="/about">ՄԵՐ ՄԱՍԻՆ</a>
        <a className={navClass('/contact', 'hide-tablet')} href="/contact">ԿԱՊ</a>
      </nav>

      <div className="header-actions">
        <button
          className="mobile-menu-toggle icon-button"
          type="button"
          aria-label={isMenuOpen ? 'Փակել նավիգացիան' : 'Բացել նավիգացիան'}
          aria-controls="mobile-menu-panel"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
        >
          <Icon name={isMenuOpen ? 'close' : 'menu'} />
        </button>
        <div className="header-icons" aria-label="Խանութի գործիքներ">
          <form className={`header-search ${isSearchOpen ? 'is-open' : ''}`} role="search" onSubmit={submitSearch} ref={searchRef}>
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Որոնել"
              aria-label="Որոնել ապրանքներ"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button
              className="icon-button"
              type="submit"
              aria-label={isSearchOpen ? 'Որոնել ապրանքներ' : 'Բացել որոնումը'}
            >
              <Icon name="search" />
            </button>
          </form>
          {hasAccount ? (
            <a className="icon-button" href="/account" aria-label="Հաշիվ">
              <Icon name="person" />
            </a>
          ) : (
            <>
              <a className="header-signin label-caps" href={authHref}>ՄՈՒՏՔ</a>
              <a className="header-account-mobile icon-button" href={authHref} aria-label="ՄՈՒՏՔ">
                <Icon name="person" />
              </a>
            </>
          )}
          <a className="icon-button header-cart-button" href="/cart" aria-label={`Զամբյուղ${cartCount ? `, ${cartCount} ապրանք` : ''}`}>
            <Icon name="shopping_bag" />
            {cartCount ? <span className="header-cart-count">{cartCount}</span> : null}
          </a>
        </div>
      </div>
      <div className="mobile-menu-backdrop" aria-hidden="true" onClick={closeMobileMenu} />
    </header>
  );
}
