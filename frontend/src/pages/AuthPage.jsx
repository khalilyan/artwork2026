import { useEffect, useState } from 'react';
import { images } from '../data/homepage.js';
import Icon from '../components/ui/Icon.jsx';
import { api, isAuthorized, setAuthSession } from '../services/api.js';
import usePageAssets from '../hooks/usePageAssets.js';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pageImages = usePageAssets('auth');
  const isLogin = mode === 'login';

  useEffect(() => {
    if (isAuthorized()) {
      window.location.replace('/account');
    }
  }, []);

  const getRedirectTarget = () => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect?.startsWith('/') && !redirect.startsWith('/auth')) return redirect;

    try {
      const referrer = new URL(document.referrer);
      if (referrer.origin === window.location.origin && referrer.pathname !== '/auth') {
        return `${referrer.pathname}${referrer.search}${referrer.hash}`;
      }
    } catch {
      return '/';
    }

    return '/';
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    setIsSubmitting(true);
    setStatusMessage('');

    try {
      const session = isLogin ? await api.login(payload) : await api.signup(payload);
      setAuthSession(session);
      window.location.href = getRedirectTarget();
    } catch (error) {
      setStatusMessage(!isLogin && error.status === 409 && error.message.includes('հեռախոս')
        ? 'Տվյալ հեռախոսահամարով գրանցում արդեն կա'
        : !isLogin && error.status === 409
        ? 'Այս էլ. հասցեով հաշիվ արդեն գրանցված է։ Մուտք գործեք ձեր հաշիվ։'
        : error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setStatusMessage('');
  };

  return (
    <main className="auth-page" lang="hy">
      <a className="auth-logo" href="/" aria-label="ARTWORK տուն">
        <img src={images.logo} alt="ARTWORK լոգո" />
      </a>

      <section className="auth-visual">
        <div className="auth-visual-overlay" />
        <div
          className="auth-visual-image"
          style={pageImages.visual ? { backgroundImage: `url("${pageImages.visual}")` } : undefined}
        />
        <div className="auth-visual-copy">
          <p className="label-caps">ARTWORK</p>
          <h2>Ձևավորելով գաղափարները՝ վերածեք դրանք իրականության</h2>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-tabs">
            <button className={`label-caps ${isLogin ? 'is-active' : ''}`} type="button" onClick={() => switchMode('login')}>
              ՄՈՒՏՔ
            </button>
            <button className={`label-caps ${!isLogin ? 'is-active' : ''}`} type="button" onClick={() => switchMode('signup')}>
              ՍՏԵՂԾԵԼ ՀԱՇԻՎ
            </button>
          </div>

          <div className={`auth-form-shell ${isLogin ? 'is-visible' : ''}`}>
            <h1>Բարի գալուստ</h1>
            <p>Մուտք գործեք՝ ձեր ընտրյալներն ու գնումների պատմությունը դիտելու համար</p>
            {statusMessage ? <p className="auth-status">{statusMessage}</p> : null}
            <form onSubmit={handleAuthSubmit}>
              <label className="auth-field">
                <input name="email" type="email" placeholder=" " required />
                <span className="label-caps">ԷԼ. ՀԱՍՑԵ</span>
              </label>
              <label className="auth-field">
                <input name="password" type="password" placeholder=" " required />
                <span className="label-caps">ԳԱՂՏՆԱԲԱՌ</span>
              </label>
              <button className="auth-submit label-caps" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'ԽՆԴՐՈՒՄ ԵՆՔ ՍՊԱՍԵԼ' : 'ՄՏՆԵԼ ՍՏՈՒԴԻԱ'}
                <Icon name="arrow_forward" />
              </button>
            </form>
          </div>

          <div className={`auth-form-shell auth-signup-shell ${!isLogin ? 'is-visible' : ''}`}>
            <h1>Միացեք հավաքածուին</h1>
            <p>Բացահայտեք առցանց ձեռքբերման նոր, հարմար եւ նուրբ փորձառություն։</p>
            {statusMessage ? <p className="auth-status">{statusMessage}</p> : null}
            <form onSubmit={handleAuthSubmit}>
              <label className="auth-field">
                <input name="fullName" type="text" placeholder=" " required />
                <span className="label-caps">ԱՆՈՒՆ ԱԶԳԱՆՈՒՆ</span>
              </label>
              <label className="auth-field">
                <input name="email" type="email" placeholder=" " required />
                <span className="label-caps">ԷԼ. ՀԱՍՑԵ</span>
              </label>
              <label className="auth-field">
                <input name="password" type="password" placeholder=" " minLength="8" required />
                <span className="label-caps">ԳԱՂՏՆԱԲԱՌ</span>
              </label>
              <label className="auth-field">
                <input name="phone" type="tel" placeholder=" " required />
                <span className="label-caps">ՀԵՌԱԽՈՍԱՀԱՄԱՐ</span>
              </label>
              <label className="auth-field">
                <input name="defaultShippingAddress" type="text" placeholder=" " required />
                <span className="label-caps">ԱՌԱՔՄԱՆ ՀԱՍՑԵ</span>
              </label>
              <button className="auth-submit label-caps" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'ԽՆԴՐՈՒՄ ԵՆՔ ՍՊԱՍԵԼ' : 'ԳՐԱՆՑԵԼ ՀԱՇԻՎ'}
                <Icon name="person_add" />
              </button>
            </form>
          </div>

          <footer className="auth-footer">
            <p className="label-caps">© 2026 ARTWORK. ԲՈԼՈՐ ԻՐԱՎՈՒՆՔՆԵՐԸ ՊԱՀՊԱՆՎԱԾ ԵՆ</p>
          </footer>
        </div>
      </section>
    </main>
  );
}
