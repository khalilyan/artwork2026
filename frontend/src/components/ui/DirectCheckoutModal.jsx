import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, isAuthorized } from '../../services/api.js';
import { formatAmdPrice } from '../../utils/currency.js';
import Icon from './Icon.jsx';

export default function DirectCheckoutModal({ isOpen, title, total, items, onClose }) {
  const [accountUser, setAccountUser] = useState(null);
  const [status, setStatus] = useState('');
  const hasAccount = isAuthorized();

  useEffect(() => {
    if (!isOpen || !hasAccount) return undefined;

    let isCurrent = true;
    api.account()
      .then(({ user }) => {
        if (isCurrent) setAccountUser(user);
      })
      .catch((error) => {
        if (isCurrent) setStatus(error.message);
      });

    return () => {
      isCurrent = false;
    };
  }, [hasAccount, isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const submitOrder = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      ...Object.fromEntries(formData.entries()),
      items,
      preserveCart: true,
    };

    try {
      if (hasAccount) await api.createAccountOrder(payload);
      else await api.createGuestOrder(payload);
      setStatus('Պատվերը ստեղծված է։ Շուտով կապ կհաստատենք։');
    } catch (error) {
      setStatus(error.message);
    }
  };

  return createPortal(
    <div className="checkout-modal direct-checkout-modal">
      <button className="checkout-backdrop" type="button" aria-label="Փակել պատվերի պատուհանը" onClick={onClose} />
      <section className="checkout-dialog reveal-section is-active" role="dialog" aria-modal="true" aria-label="Գնել հիմա">
        <button className="checkout-close" type="button" aria-label="Փակել պատվերի պատուհանը" onClick={onClose}><Icon name="close" /></button>
        <div className="checkout-heading">
          <h2>Գնել հիմա</h2>
          <div><p>{title}</p><strong>{formatAmdPrice(total)}</strong></div>
        </div>
        <form className="checkout-form" onSubmit={submitOrder}>
          <label><span className="label-caps">Անուն*</span><input name="name" required type="text" defaultValue={accountUser?.fullName ?? ''} /></label>
          <label><span className="label-caps">Հեռախոս*</span><input name="phone" required type="tel" defaultValue={accountUser?.profile?.phone ?? ''} /></label>
          <label className="is-wide"><span className="label-caps">Էլ. հասցե</span><input name="email" type="email" defaultValue={accountUser?.email ?? ''} /></label>
          <label className="is-wide"><span className="label-caps">Առաքման հասցե</span><input name="shippingAddress" type="text" defaultValue={accountUser?.profile?.defaultShippingAddress ?? ''} /></label>
          <label className="is-wide"><span className="label-caps">Լրացուցիչ նշումներ</span><textarea name="notes" rows="2" /></label>
          <button className="label-caps" type="submit">Պատվիրել</button>
          {status ? <p className="label-caps">{status}</p> : <p className="label-caps">Մեր ներկայացուցիչը կկապվի ձեզ հետ պատվերը վերջնականացնելու համար։</p>}
        </form>
      </section>
    </div>,
    document.body,
  );
}
