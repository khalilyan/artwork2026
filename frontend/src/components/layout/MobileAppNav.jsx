import { useEffect, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import { api, getGuestCart, isAuthorized } from '../../services/api.js';

function countCartItems(items) {
  return items.reduce((sum, item) => {
    const quantity = Number(item.quantity ?? 1);
    const includedCount = item.itemType === 'collection' ? Math.max(item.productSlugs?.length ?? item.products?.length ?? 1, 1) : 1;
    return sum + quantity * includedCount;
  }, 0);
}

export default function MobileAppNav() {
  const currentPath = typeof window === 'undefined' ? '/' : window.location.pathname.toLowerCase();
  const currentTarget = typeof window === 'undefined' ? '/' : `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const [hasAccount, setHasAccount] = useState(() => (typeof window === 'undefined' ? false : isAuthorized()));
  const [cartCount, setCartCount] = useState(0);
  const [isHomeTop, setIsHomeTop] = useState(() => currentPath === '/' && typeof window !== 'undefined' && window.scrollY < 12);

  useEffect(() => {
    if (currentPath !== '/') {
      setIsHomeTop(false);
      return undefined;
    }

    const updateHomeTop = () => setIsHomeTop(window.scrollY < 12);
    updateHomeTop();
    window.addEventListener('scroll', updateHomeTop, { passive: true });

    return () => window.removeEventListener('scroll', updateHomeTop);
  }, [currentPath]);

  useEffect(() => {
    let isMounted = true;

    const syncNavState = async () => {
      const nextHasAccount = isAuthorized();
      setHasAccount(nextHasAccount);

      if (!nextHasAccount) {
        setCartCount(countCartItems(getGuestCart()));
        return;
      }

      try {
        const { user } = await api.account();
        if (isMounted) setCartCount(countCartItems(user.cart ?? []));
      } catch {
        if (isMounted) setCartCount(0);
      }
    };

    syncNavState();
    window.addEventListener('storage', syncNavState);
    window.addEventListener('artwork-auth-change', syncNavState);
    window.addEventListener('artwork-cart-change', syncNavState);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', syncNavState);
      window.removeEventListener('artwork-auth-change', syncNavState);
      window.removeEventListener('artwork-cart-change', syncNavState);
    };
  }, []);

  const accountHref = hasAccount ? '/account' : `/auth?redirect=${encodeURIComponent(currentTarget)}`;
  const accountLabel = hasAccount ? 'Հաշիվ' : 'Մուտք';
  const items = [
    { label: 'Սենյակներ', href: '/rooms', icon: 'chair', active: currentPath.startsWith('/rooms') },
    { label: 'Պահված', href: hasAccount ? '/account#saved-items' : `/auth?redirect=${encodeURIComponent('/account#saved-items')}`, icon: 'favorite', active: currentPath === '/account' },
    { label: 'Զամբյուղ', href: '/cart', icon: 'shopping_bag', count: cartCount, active: currentPath === '/cart' },
    { label: accountLabel, href: accountHref, icon: 'person', active: currentPath === '/account' || currentPath === '/auth' },
  ];

  return (
    <nav className={`mobile-app-nav ${isHomeTop ? 'is-home-top-hidden' : ''}`} aria-label="Արագ նավիգացիա">
      {items.map((item) => (
        <a className={`mobile-app-nav-item ${item.active ? 'is-active' : ''}`} href={item.href} key={item.label}>
          <span className="mobile-app-nav-icon">
            <Icon name={item.icon} />
            {item.count ? <span className="mobile-app-nav-count">{item.count}</span> : null}
          </span>
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}
