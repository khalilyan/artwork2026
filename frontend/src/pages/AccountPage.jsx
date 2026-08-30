import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/ui/Icon.jsx';
import { api, clearAuthSession, isAuthorized } from '../services/api.js';
import { formatAmdPrice } from '../utils/currency.js';

const accountNavItems = [
  { id: 'dashboard', label: 'Կառավարում' },
  { id: 'order-history', label: 'Պատվերներ' },
  { id: 'saved-items', label: 'Պահպանվածներ' },
  { id: 'account-details', label: 'Կարգավորումներ' },
];

const orderStatusLabels = {
  quote_requested: 'Հարցում',
  processing: 'Ընթացքում',
  completed: 'Ավարտված',
  cancelled: 'Մերժված',
  rejected: 'Մերժված',
};
const armenianMonths = [
  'հունվարի',
  'փետրվարի',
  'մարտի',
  'ապրիլի',
  'մայիսի',
  'հունիսի',
  'հուլիսի',
  'օգոստոսի',
  'սեպտեմբերի',
  'հոկտեմբերի',
  'նոյեմբերի',
  'դեկտեմբերի',
];

function AccountSectionHeader({ title, meta }) {
  return (
    <div className="account-section-header">
      <h2>{title}</h2>
      <span className="label-caps">{meta}</span>
    </div>
  );
}

function formatOrderDate(date) {
  if (!date) return 'Ամսաթիվը սպասվում է';

  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return 'Ամսաթիվը սպասվում է';

  return `${String(value.getDate()).padStart(2, '0')} ${armenianMonths[value.getMonth()]} ${value.getFullYear()}`;
}

function uniqueImages(images) {
  return Array.from(new Set(images.filter(Boolean)));
}

function getProductSlug(item) {
  return item.productSlug ?? item.slug ?? item.snapshot?.productSlug ?? item.snapshot?.slug ?? '';
}

function getOrderItemImages(item, product) {
  return uniqueImages([
    item.image,
    item.snapshot?.image,
    ...(item.gallery ?? []),
    ...(item.images?.gallery ?? []),
    item.images?.primary,
    product?.image,
    ...(product?.gallery ?? []),
    product?.hoverImage,
  ]);
}

function getOrderCoverImages(order, productsBySlug) {
  const items = order.items ?? [];

  return uniqueImages(items.map((item) => getOrderItemImages(item, productsBySlug.get(getProductSlug(item)))[0]));
}

function getOrderTitle(order) {
  const firstItem = order.items?.[0];
  if (!firstItem) return 'Հավաքածուի պատվեր';
  if ((order.items?.length ?? 0) === 1) return firstItem.name ?? 'Հավաքածուի պատվեր';
  return `${firstItem.name ?? 'Ապրանք'} ևս ${(order.items?.length ?? 1) - 1}`;
}

function getSavedItemHref(item) {
  const roomSlug = item.roomSlug ?? item.roomSlugs?.[0] ?? item.snapshot?.roomSlugs?.[0] ?? 'living-room';
  const furnitureSlug = item.categorySlug ?? item.snapshot?.categorySlug ?? item.type ?? item.snapshot?.type ?? 'seating';
  return `/rooms/${roomSlug}/${furnitureSlug}/${item.productSlug}`;
}

function getOrderItemHref(item, product) {
  const productSlug = getProductSlug(item);
  if (!productSlug) return '';

  return getSavedItemHref({
    ...item,
    productSlug,
    roomSlug: item.roomSlug ?? item.roomSlugs?.[0] ?? item.snapshot?.roomSlugs?.[0] ?? product?.roomSlugs?.[0],
    roomSlugs: item.roomSlugs ?? item.snapshot?.roomSlugs ?? product?.roomSlugs,
    categorySlug: item.categorySlug ?? item.snapshot?.categorySlug ?? product?.categorySlug,
    type: item.type ?? item.snapshot?.type ?? product?.type,
  });
}

function getOrderStatusLabel(status) {
  return orderStatusLabels[status] ?? 'Ընթացքում';
}

function getOrderStatusClass(status) {
  return `account-order-status order-status-${status ?? 'processing'}`;
}

export default function AccountPage() {
  const [activeSection, setActiveSection] = useState(accountNavItems[0].id);
  const [user, setUser] = useState(null);
  const [formState, setFormState] = useState({ fullName: '', email: '', phone: '', defaultShippingAddress: '' });
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [passwordState, setPasswordState] = useState({ currentPassword: '', nextPassword: '', confirmPassword: '' });
  const [statusMessage, setStatusMessage] = useState('Բեռնվում է հաշիվը...');
  const [expandedOrderId, setExpandedOrderId] = useState('');
  const [productCatalog, setProductCatalog] = useState([]);

  useEffect(() => {
    if (!isAuthorized()) {
      window.location.href = '/auth';
      return;
    }

    Promise.all([api.account(), api.products()])
      .then(([{ user: nextUser }, productsData]) => {
        setUser(nextUser);
        setProductCatalog(productsData.products ?? []);
        setFormState({
          fullName: nextUser.fullName ?? '',
          email: nextUser.email ?? '',
          phone: nextUser.profile?.phone ?? '',
          defaultShippingAddress: nextUser.profile?.defaultShippingAddress ?? '',
        });
        setStatusMessage('');
      })
      .catch((error) => {
        if (error.status === 401) {
          clearAuthSession();
          window.location.href = '/auth';
          return;
        }
        setStatusMessage(error.message);
      });
  }, []);

  useEffect(() => {
    let animationFrame = null;

    const updateActiveSection = () => {
      const sectionOffset = 180;
      const currentSection = accountNavItems.reduce((activeItem, item) => {
        const section = document.getElementById(item.id);
        if (!section) return activeItem;

        return section.getBoundingClientRect().top <= sectionOffset ? item : activeItem;
      }, accountNavItems[0]);

      setActiveSection(currentSection.id);
      animationFrame = null;
    };

    const requestUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });

    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  const scrollToSection = (event, sectionId) => {
    event.preventDefault();
    const section = document.getElementById(sectionId);
    if (!section) return;

    const sectionTop = section.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top: sectionTop, behavior: 'smooth' });
    setActiveSection(sectionId);
    window.history.replaceState(null, '', `#${sectionId}`);
  };

  const logout = (event) => {
    event.preventDefault();
    clearAuthSession();
    window.location.href = '/auth';
  };

  const removeSavedItem = async (productSlug) => {
    const { saved_items: savedItems } = await api.removeSavedItem(productSlug);
    setUser((currentUser) => ({ ...currentUser, saved_items: savedItems }));
  };

  const saveAccountDetails = async (event) => {
    event.preventDefault();
    setStatusMessage('Պահպանվում է...');

    try {
      const { user: nextUser } = await api.updateAccount(formState);
      setUser(nextUser);
      setStatusMessage('Հաշվի տվյալները պահպանված են։');
    } catch (error) {
      setStatusMessage(error.message);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();

    if (passwordState.nextPassword !== passwordState.confirmPassword) {
      setStatusMessage('Նոր գաղտնաբառերը չեն համընկնում։');
      return;
    }

    setStatusMessage('Գաղտնաբառը թարմացվում է...');

    try {
      await api.updatePassword({
        currentPassword: passwordState.currentPassword,
        nextPassword: passwordState.nextPassword,
      });
      setPasswordState({ currentPassword: '', nextPassword: '', confirmPassword: '' });
      setIsPasswordOpen(false);
      setStatusMessage('Գաղտնաբառը հաջողությամբ փոխված է։');
    } catch (error) {
      setStatusMessage(error.message);
    }
  };

  const orders = user?.orders ?? [];
  const savedItems = user?.saved_items ?? [];
  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const productsBySlug = useMemo(() => new Map(productCatalog.map((product) => [product.slug ?? product.id, product])), [productCatalog]);

  return (
    <main className="account-page" lang="hy">
      <section id="dashboard" className="account-hero container reveal-section is-active" data-reveal>
        <span className="label-caps">Հաշվի ամփոփում</span>
        <h1>{user ? `Բարի գալուստ ${firstName}` : 'Բարի գալուստ'}</h1>
        {statusMessage ? <p>{statusMessage}</p> : null}
      </section>

      <section className="account-layout container">
        <aside className="account-sidebar">
          <nav>
            {accountNavItems.map((item) => (
              <a
                className={`${activeSection === item.id ? 'is-active ' : ''}label-caps`}
                href={`#${item.id}`}
                onClick={(event) => scrollToSection(event, item.id)}
                key={item.id}
              >
                {item.label}
              </a>
            ))}
            <a className="label-caps is-muted" href="/auth" onClick={logout}>Դուրս գալ</a>
          </nav>
        </aside>

        <div className="account-content">
          <section id="order-history" className="account-section reveal-section is-active" data-reveal>
            <AccountSectionHeader title="Պատվերներ" meta={`${orders.length} պատվեր`} />
            <div className="account-orders">
              {orders.length ? orders.map((order) => {
                const orderId = order.orderNumber ?? order.id;
                const isExpanded = expandedOrderId === orderId;
                const orderImages = getOrderCoverImages(order, productsBySlug);

                return (
                  <article className={`account-order ${isExpanded ? 'is-expanded' : ''}`} key={orderId}>
                    <div className="account-order-summary">
                      <div className={`account-order-image ${orderImages.length <= 1 ? 'is-single' : ''}`} data-cursor-target>
                        {orderImages.map((image, index) => (
                          <img src={image} alt={`${order.orderNumber} ապրանքի նկար ${index + 1}`} key={`${orderId}-image-${image}`} />
                        ))}
                      </div>
                      <div>
                        <p className="label-caps">{formatOrderDate(order.createdAt)}</p>
                        <h3>{getOrderTitle(order)}</h3>
                        <span className={getOrderStatusClass(order.status)}>Պատվեր #{order.orderNumber} - {getOrderStatusLabel(order.status)}</span>
                        <button className="label-caps account-order-toggle" type="button" onClick={() => setExpandedOrderId(isExpanded ? '' : orderId)} aria-expanded={isExpanded}>
                          <Icon name={isExpanded ? 'expand_more' : 'chevron_right'} />
                          <span>Դիտել մանրամասները</span>
                        </button>
                      </div>
                    </div>
                    {isExpanded ? (
                      <div className="account-order-details">
                        {(order.items ?? []).map((item, itemIndex) => {
                          const product = productsBySlug.get(getProductSlug(item));
                          const itemHref = getOrderItemHref(item, product);
                          const itemImage = getOrderItemImages(item, product)[0];
                          const itemName = item.name ?? product?.name ?? 'Ապրանք';

                          return (
                            <div className="account-order-detail-item" key={`${orderId}-${getProductSlug(item) || itemIndex}`}>
                              <div className="account-order-detail-gallery">
                                {itemImage && itemHref ? (
                                  <a href={itemHref} aria-label={`Բացել ${itemName}`}>
                                    <img src={itemImage} alt={`${itemName} նկար`} />
                                  </a>
                                ) : itemImage ? (
                                  <span>
                                    <img src={itemImage} alt={`${itemName} նկար`} />
                                  </span>
                                ) : null}
                              </div>
                              <div>
                                <h4>{itemHref ? <a href={itemHref}>{itemName}</a> : itemName}</h4>
                                <p className="label-caps">Քանակ՝ {Number(item.quantity) || 1}</p>
                                <p>{formatAmdPrice(item.unitPrice ?? item.price)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>
                );
              }) : <p>Պատվերներ դեռ չկան։</p>}
            </div>
          </section>

          <section id="saved-items" className="account-section reveal-section is-active" data-reveal>
            <AccountSectionHeader title="Պահպանված առարկաներ" meta={`${savedItems.length} պահպանված`} />
            <div className="account-saved-grid">
              {savedItems.length ? savedItems.map((item) => {
                const productHref = getSavedItemHref(item);

                return (
                  <article className="account-saved-card" key={item.productSlug}>
                    <div data-cursor-target>
                      <a className="account-saved-image-link" href={productHref} aria-label={`Բացել ${item.name}`}>
                        <img src={item.image} alt={item.name} />
                      </a>
                      <button className="is-filled" type="button" aria-label="Հեռացնել պահպանվածներից" onClick={() => removeSavedItem(item.productSlug)}>
                        <Icon name="favorite" />
                      </button>
                    </div>
                    <h3><a href={productHref}>{item.name}</a></h3>
                    <p className="label-caps">{formatAmdPrice(item.price?.amount ?? item.price)}</p>
                  </article>
                );
              }) : <p>Պահպանված առարկաներ դեռ չկան։</p>}
            </div>
          </section>

          <section id="account-details" className="account-section reveal-section is-active" data-reveal>
            <AccountSectionHeader title="Հաշվի տվյալներ" meta={user?.email ?? ''} />
            <form className="account-form" onSubmit={saveAccountDetails}>
              <label><span className="label-caps">Անուն ազգանուն</span><input type="text" value={formState.fullName} onChange={(event) => setFormState({ ...formState, fullName: event.target.value })} /></label>
              <label><span className="label-caps">Էլ. հասցե</span><input type="email" value={formState.email} onChange={(event) => setFormState({ ...formState, email: event.target.value })} /></label>
              <label><span className="label-caps">Հեռախոս</span><input type="tel" value={formState.phone} onChange={(event) => setFormState({ ...formState, phone: event.target.value })} /></label>
              <label className="is-wide"><span className="label-caps">Առաքման հասցե</span><input type="text" value={formState.defaultShippingAddress} onChange={(event) => setFormState({ ...formState, defaultShippingAddress: event.target.value })} /></label>
              <div className="account-actions">
                <button className="label-caps" type="submit">Պահպանել փոփոխությունները</button>
                <button className="label-caps is-link" type="button" onClick={() => setIsPasswordOpen((isOpen) => !isOpen)}>Կառավարել գաղտնաբառը</button>
              </div>
            </form>
            {isPasswordOpen ? (
              <form className="account-form account-password-form" onSubmit={savePassword}>
                <label><span className="label-caps">Ընթացիկ գաղտնաբառ</span><input type="password" value={passwordState.currentPassword} onChange={(event) => setPasswordState({ ...passwordState, currentPassword: event.target.value })} required /></label>
                <label><span className="label-caps">Նոր գաղտնաբառ</span><input type="password" minLength="8" value={passwordState.nextPassword} onChange={(event) => setPasswordState({ ...passwordState, nextPassword: event.target.value })} required /></label>
                <label><span className="label-caps">Կրկնել նոր գաղտնաբառը</span><input type="password" minLength="8" value={passwordState.confirmPassword} onChange={(event) => setPasswordState({ ...passwordState, confirmPassword: event.target.value })} required /></label>
                <div className="account-actions">
                  <button className="label-caps" type="submit">Փոխել գաղտնաբառը</button>
                </div>
              </form>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}
