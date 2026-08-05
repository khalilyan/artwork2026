import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../components/ui/Icon.jsx';
import { api, clearGuestCart, getGuestCart, isAuthorized, setGuestCart } from '../services/api.js';
import { formatAmdPrice, getPriceAmount } from '../utils/currency.js';

const cartRemoveAnimationMs = 950;

function displayPrice(item) {
  return formatAmdPrice(item.price?.amount ?? item.price ?? item.snapshot?.price?.amount ?? item.snapshot?.price);
}

function displayImage(item) {
  return item.image ?? item.snapshot?.image;
}

function priceToNumber(item) {
  return getPriceAmount(item.price?.amount, item.price, item.snapshot?.price?.amount, item.snapshot?.price);
}

function getIncludedProducts(item) {
  return item.products ?? item.snapshot?.products ?? [];
}

function getCartItemHref(item) {
  if (item.itemType === 'collection' || item.collectionSlug) return `/${item.collectionSlug}`;

  const roomSlug = item.roomSlug ?? item.roomSlugs?.[0] ?? item.snapshot?.roomSlugs?.[0] ?? 'living-room';
  const furnitureSlug = item.categorySlug ?? item.snapshot?.categorySlug ?? item.type ?? item.snapshot?.type ?? 'seating';
  return `/rooms/${roomSlug}/${furnitureSlug}/${item.productSlug}`;
}

function CartItem({ item, isRemoving, onQuantityChange, onRemove }) {
  const productHref = getCartItemHref(item);
  const includedProducts = getIncludedProducts(item);

  return (
    <article className={`cart-item reveal-section is-active ${isRemoving ? 'is-removing' : ''}`} data-reveal>
      <a className="cart-item-image" href={productHref} data-cursor-target aria-label={`Բացել ${item.name}`}>
        <img src={displayImage(item)} alt={item.name} />
      </a>
      <div className="cart-item-body">
        <div>
          <div className="cart-item-heading">
            <h2><a href={productHref}>{item.name}</a></h2>
            <p>{displayPrice(item)}</p>
          </div>
          <p className="label-caps cart-item-material">{item.itemType === 'collection' ? 'ՀԱՎԱՔԱԾՈՒԻ ՓԱԹԵԹ' : item.productSku ?? item.material ?? 'ARTWORK ԱՌԱՐԿԱ'}</p>
          {includedProducts.length ? (
            <div className="cart-bundle-products">
              {includedProducts.map((product) => (
                <span key={product.productSlug ?? product.name}>
                  {product.image ? <img src={product.image} alt="" /> : null}
                  <small>{product.name}</small>
                </span>
              ))}
            </div>
          ) : null}
          <div className="cart-quantity">
            <button type="button" aria-label="Պակասեցնել քանակը" onClick={() => onQuantityChange(item.productSlug, item.quantity - 1)}><Icon name="remove" /></button>
            <span>{item.quantity}</span>
            <button type="button" aria-label="Ավելացնել քանակը" onClick={() => onQuantityChange(item.productSlug, item.quantity + 1)}><Icon name="add" /></button>
          </div>
        </div>
        <button className="cart-remove label-caps" type="button" disabled={isRemoving} onClick={() => onRemove(item.productSlug)}>
          <Icon name="close" />
          <span>ՀԵՌԱՑՆԵԼ</span>
        </button>
      </div>
    </article>
  );
}

export default function CartPage() {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [accountUser, setAccountUser] = useState(null);
  const [removingItems, setRemovingItems] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(null);
  const hasAccount = isAuthorized();

  useEffect(() => {
    const refreshCart = async () => {
      if (hasAccount) {
        const { user } = await api.account();
        setAccountUser(user);
        setCartItems(user.cart ?? []);
      } else {
        setAccountUser(null);
        setCartItems(getGuestCart());
      }
    };

    refreshCart().catch((error) => setStatusMessage(error.message));
  }, [hasAccount]);

  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + priceToNumber(item) * item.quantity, 0), [cartItems]);
  const total = subtotal;

  const updateQuantity = async (productSlug, quantity) => {
    if (hasAccount) {
      const { cart } = await api.updateCartItem(productSlug, { quantity });
      setCartItems(cart);
      return;
    }

    const nextCart = quantity < 1
      ? cartItems.filter((item) => item.productSlug !== productSlug)
      : cartItems.map((item) => (item.productSlug === productSlug ? { ...item, quantity } : item));
    setGuestCart(nextCart);
    setCartItems(nextCart);
  };

  const removeItem = async (productSlug) => {
    if (removingItems.includes(productSlug)) return;

    setRemovingItems((current) => [...current, productSlug]);
    await new Promise((resolve) => window.setTimeout(resolve, cartRemoveAnimationMs));

    if (hasAccount) {
      const { cart } = await api.removeCartItem(productSlug);
      setCartItems(cart);
      setRemovingItems((current) => current.filter((item) => item !== productSlug));
      return;
    }

    const nextCart = cartItems.filter((item) => item.productSlug !== productSlug);
    setGuestCart(nextCart);
    setCartItems(nextCart);
    setRemovingItems((current) => current.filter((item) => item !== productSlug));
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      ...Object.fromEntries(formData.entries()),
      items: cartItems.map((item) => ({
        productSlug: item.productSlug,
        collectionSlug: item.collectionSlug,
        itemType: item.itemType,
        quantity: item.quantity,
      })),
    };

    try {
      const customerName = String(payload.name ?? '').trim() || 'հաճախորդ';
      const result = hasAccount ? await api.createAccountOrder(payload) : await api.createGuestOrder(payload);
      if (hasAccount) {
        setCartItems(result.cart ?? []);
      } else {
        clearGuestCart();
        setCartItems([]);
      }
      setStatusMessage('');
      setOrderSuccess({ name: customerName });
      setIsCheckoutOpen(false);
    } catch (error) {
      setStatusMessage(error.message);
    }
  };

  const checkoutModal = isCheckoutOpen ? (
    <div className="checkout-modal">
      <button className="checkout-backdrop" type="button" aria-label="Փակել պատվերի պատուհանը" onClick={() => setIsCheckoutOpen(false)} />
      <section className="checkout-dialog reveal-section is-active">
        <button className="checkout-close" type="button" aria-label="Փակել պատվերի պատուհանը" onClick={() => setIsCheckoutOpen(false)}><Icon name="close" /></button>
        <div className="checkout-heading">
          <h2>Ավարտել պատվերը</h2>
          <div><p>{cartItems.length} առարկա զամբյուղում</p><strong>{formatAmdPrice(total)}</strong></div>
        </div>
        <form className="checkout-form" onSubmit={submitOrder}>
          <label><span className="label-caps">Անուն*</span><input name="name" required type="text" defaultValue={accountUser?.fullName ?? ''} /></label>
          <label><span className="label-caps">Հեռախոս*</span><input name="phone" required type="tel" defaultValue={accountUser?.profile?.phone ?? ''} /></label>
          <label className="is-wide"><span className="label-caps">Էլ. հասցե</span><input name="email" type="email" defaultValue={accountUser?.email ?? ''} /></label>
          <label className="is-wide"><span className="label-caps">Առաքման հասցե</span><input name="shippingAddress" type="text" defaultValue={accountUser?.profile?.defaultShippingAddress ?? ''} /></label>
          <label className="is-wide"><span className="label-caps">Լրացուցիչ նշումներ</span><textarea name="notes" rows="2" /></label>
          <button className="label-caps" type="submit">Պատվիրել</button>
          <p className="label-caps">Մեր ներկայացուցիչը շուտով կապ կհաստատի առաքումը վերջնականացնելու համար։</p>
        </form>
      </section>
    </div>
  ) : null;

  const orderSuccessDialog = orderSuccess ? (
    <div className="checkout-modal order-success-modal">
      <button className="checkout-backdrop" type="button" aria-label="Փակել պատվերի հաստատումը" onClick={() => setOrderSuccess(null)} />
      <section className="order-success-dialog reveal-section is-active" role="dialog" aria-modal="true" aria-label="Պատվերը ստեղծված է">
        <button className="checkout-close" type="button" aria-label="Փակել պատվերի հաստատումը" onClick={() => setOrderSuccess(null)}><Icon name="close" /></button>
        <span className="order-success-icon" aria-hidden="true"><Icon name="done" /></span>
        <h2>Պատվերը ստեղծված է</h2>
        <p>Հարգելի {orderSuccess.name}, շուտով կապ կհաստատենք ձեզ հետ։</p>
        <button className="order-success-action label-caps" type="button" onClick={() => setOrderSuccess(null)}>Լավ</button>
      </section>
    </div>
  ) : null;

  return (
    <>
      <main className="cart-page" lang="hy">
        <section className="cart-title container reveal-section is-active" data-reveal>
          <h1>Զամբյուղ</h1>
          <p>Ձեր ընտրած կահույքը մեկ տեղում։ Համեմատեք, պահպանեք և ընտրեք այն, որն ամենից լավ կհամապատասխանի ձեր ոճին</p>
          {statusMessage ? <p>{statusMessage}</p> : null}
        </section>

        <section className="cart-layout container">
          <div className="cart-items">
            {cartItems.length ? cartItems.map((item) => (
              <CartItem
                item={item}
                isRemoving={removingItems.includes(item.productSlug)}
                key={item.productSlug}
                onQuantityChange={updateQuantity}
                onRemove={removeItem}
              />
            )) : <p>Ձեր զամբյուղը դատարկ է։</p>}
          </div>

          {cartItems.length ? (
            <aside className="cart-summary reveal-section is-active" data-reveal>
            <h2 className="label-caps">Պատվերի ամփոփում</h2>
            <div className="cart-summary-lines">
              <p><span>Միջանկյալ գումար</span><span>{formatAmdPrice(subtotal)}</span></p>
            </div>
            <div className="cart-total">
              <span className="label-caps">Ընդհանուր</span>
              <strong>{formatAmdPrice(total)}</strong>
            </div>
            <label className="cart-gift">
              <span className="label-caps">Նվերի հաղորդագրություն</span>
              <textarea placeholder="Գրեք հաղորդագրություն ըստ ցանկության..." rows="3" />
            </label>
            <button className="cart-checkout label-caps" type="button" disabled={!cartItems.length} onClick={() => setIsCheckoutOpen(true)}>Ձեւակերպել</button>
            <p className="cart-secure"><Icon name="verified_user" /><span className="label-caps">{hasAccount ? 'Հաշվով պատվեր' : 'Հյուրի պատվեր հասանելի է'}</span></p>
            </aside>
          ) : null}
        </section>
      </main>
      {checkoutModal ? createPortal(checkoutModal, document.body) : null}
      {orderSuccessDialog ? createPortal(orderSuccessDialog, document.body) : null}
    </>
  );
}
