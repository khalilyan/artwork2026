import { useEffect, useState } from 'react';
import { images } from '../data/homepage.js';
import Icon from '../components/ui/Icon.jsx';
import { api, createApiUrl, isAuthorized, setAuthSession } from '../services/api.js';
import usePageAssets from '../hooks/usePageAssets.js';

function decodeBase64UrlJson(value) {
  try {
    const normalized = String(value ?? '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function GoogleLogo() {
  return (
    <svg className="auth-social-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M21.35 11.1h-9.18v2.98h5.26c-.23 1.52-1.82 4.45-5.26 4.45-3.17 0-5.75-2.62-5.75-5.85s2.58-5.85 5.75-5.85c1.8 0 3.01.77 3.7 1.42l2.52-2.44C16.8 4.31 14.7 3.4 12.17 3.4 7.2 3.4 3.18 7.47 3.18 12.68s4.02 9.28 8.99 9.28c5.19 0 8.62-3.64 8.62-8.76 0-.58-.06-1.02-.14-1.46Z" fill="#FFC107" />
      <path d="M4.2 7.12 6.65 8.9c.66-1.3 2-2.07 3.52-2.07 1.8 0 3.01.77 3.7 1.42l2.52-2.44C16.8 4.31 14.7 3.4 12.17 3.4 8.65 3.4 5.57 5.42 4.2 7.12Z" fill="#FF3D00" />
      <path d="M12.17 21.96c2.46 0 4.52-.8 6.03-2.18l-2.79-2.29c-.75.53-1.76.9-3.24.9-2.63 0-4.86-1.78-5.66-4.2l-2.54 1.96c1.35 2.75 4.15 4.81 8.2 4.81Z" fill="#4CAF50" />
      <path d="M21.35 11.1h-9.18v2.98h5.26c-.11.72-.52 1.76-1.28 2.41l2.79 2.29c1.62-1.5 2.56-3.72 2.56-6.46 0-.58-.06-1.02-.14-1.46Z" fill="#1976D2" />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg className="auth-social-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85v-8.39H7.08V12h3.05V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.95.93-1.95 1.88V12h3.32l-.53 3.46h-2.79v8.39C19.61 22.95 24 17.99 24 12Z" fill="#1877F2" />
      <path d="M16.67 15.46 17.2 12h-3.32V9.77c0-.95.46-1.88 1.95-1.88h1.51V4.93s-1.37-.24-2.68-.24c-2.74 0-4.53 1.66-4.53 4.67V12H7.08v3.46h3.05v8.39c.61.1 1.23.15 1.87.15s1.26-.05 1.87-.15v-8.39h2.8Z" fill="#fff" />
    </svg>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pageImages = usePageAssets('auth');
  const isLogin = mode === 'login';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const socialToken = params.get('socialToken');
    const socialUserEncoded = params.get('socialUser');
    const socialError = params.get('socialError');

    if (socialError) {
      setStatusMessage(socialError);
      return;
    }

    if (socialToken && socialUserEncoded) {
      const socialUser = decodeBase64UrlJson(socialUserEncoded);

      if (socialUser) {
        setAuthSession({ token: socialToken, user: socialUser });
        window.location.href = getRedirectTarget();
        return;
      }

      setStatusMessage('Սոցիալական մուտքը չհաջողվեց, փորձեք կրկին։');
      return;
    }

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

  const startSocialAuth = (provider) => {
    const params = new URLSearchParams({
      redirect: getRedirectTarget(),
      origin: window.location.origin,
    });

    window.location.href = createApiUrl(`/auth/${provider}?${params.toString()}`);
  };

  const renderSocialActions = () => (
    <div className="auth-social-stack">
      <p className="auth-social-divider label-caps">ԿԱՄ ՄՈՒՏՔ ԳՈՐԾԵՔ ՍՈՑԻԱԼԱԿԱՆ ՑԱՆՑԵՐՈՎ</p>
      <div className="auth-social-grid">
        <button className="auth-social-button is-google" type="button" onClick={() => startSocialAuth('google')}>
          <GoogleLogo />
          <span>Շարունակել Google-ով</span>
        </button>
        <button className="auth-social-button is-facebook" type="button" onClick={() => startSocialAuth('facebook')}>
          <FacebookLogo />
          <span>Շարունակել Facebook-ով</span>
        </button>
      </div>
    </div>
  );

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
          <h2>Արհեստից դեպի արվեստ՝ ստեղծելով կահույք, որը համադրում է որակը, դիզայնը և վարպետությունը</h2>
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
            <p>Մուտք գործեք ձեր հաշիվ՝ դիտելու ձեր նախընտրած կահույքներն ու գնումների պատմությունը, ինչպես նաև պատվերները</p>
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
            {renderSocialActions()}
          </div>

          <div className={`auth-form-shell auth-signup-shell ${!isLogin ? 'is-visible' : ''}`}>
            <h1>Միացեք մեզ</h1>
            <p>Գրանցվեք՝ ստանալու հատուկ առաջարկներ, զեղչեր և օգտվելու ավելի հարմար գնումների հնարավորություններից։</p>
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
            {renderSocialActions()}
          </div>

          <footer className="auth-footer">
            <a className="auth-footer-logo" href="/" aria-label="Գլխավոր էջ">
              <img src={images.logo} alt="ARTWORK լոգո" />
            </a>
            <p className="label-caps">© 2026 ARTWORK. ԲՈԼՈՐ ԻՐԱՎՈՒՆՔՆԵՐԸ ՊԱՀՊԱՆՎԱԾ ԵՆ</p>
          </footer>
        </div>
      </section>
    </main>
  );
}
