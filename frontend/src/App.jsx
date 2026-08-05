import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';
import MobileAppNav from './components/layout/MobileAppNav.jsx';
import AiChatAssistant from './components/ui/AiChatAssistant.jsx';
import CustomCursor from './components/ui/CustomCursor.jsx';
import PageTransition from './components/ui/PageTransition.jsx';
import ToastNotifications from './components/ui/ToastNotifications.jsx';
import HomePage from './pages/HomePage.jsx';
import ShopByRoomsPage from './pages/ShopByRoomsPage.jsx';
import FurnitureRoomPage from './pages/FurnitureRoomPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import ProductDetailsPage from './pages/ProductDetailsPage.jsx';
import CartPage from './pages/CartPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import CollectionsPage from './pages/CollectionsPage.jsx';
import CollectionDetailPage from './pages/CollectionDetailPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import { useParallax } from './hooks/useParallax.js';
import { useRevealOnScroll } from './hooks/useRevealOnScroll.js';
import { useCardTilt } from './hooks/useCardTilt.js';
import { useSmoothScroll } from './hooks/useSmoothScroll.js';
import { usePushNotifications } from './hooks/usePushNotifications.js';
import { useWatermarkedImageDownloads } from './hooks/useWatermarkedImageDownloads.js';

export default function App() {
  const currentPath = window.location.pathname.toLowerCase();
  const isRooms = currentPath === '/rooms' || currentPath === '/shopbyrooms';
  const isCart = currentPath === '/cart';
  const isContact = currentPath === '/contact';
  const isAbout = currentPath === '/about';
  const isAccount = currentPath === '/account';
  const isAdmin = currentPath === '/admin';
  const isCollections = currentPath === '/collections';
  const isProducts = currentPath === '/products';
  const isAuth = currentPath === '/auth';
  const isHome = currentPath === '/';
  const hasStandaloneShell = isAuth || isAdmin;
  const detailsMatch = currentPath.match(/^\/rooms\/([^/]+)\/([^/]+)\/([^/]+)$/);
  const productsMatch = currentPath.match(/^\/rooms\/([^/]+)\/([^/]+)$/);
  const roomMatch = currentPath.match(/^\/rooms\/([^/]+)$/) ?? currentPath.match(/^\/shopbyroom\/([^/]+)$/);
  const collectionMatch = currentPath.match(/^\/([^/]+)$/);

  useSmoothScroll(isAccount);
  useParallax();
  useRevealOnScroll();
  useCardTilt();
  useWatermarkedImageDownloads(!hasStandaloneShell);
  usePushNotifications(!hasStandaloneShell);

  const renderPage = () => {
    if (isCart) return <CartPage />;
    if (isContact) return <ContactPage />;
    if (isAbout) return <AboutPage />;
    if (isAccount) return <AccountPage />;
    if (isAdmin) return <AdminPage />;
    if (isCollections) return <CollectionsPage />;
    if (isProducts) return <ProductsPage />;
    if (isAuth) return <AuthPage />;
    if (detailsMatch) return <ProductDetailsPage roomSlug={detailsMatch[1]} furnitureSlug={detailsMatch[2]} productId={detailsMatch[3]} />;
    if (productsMatch) return <ProductsPage roomSlug={productsMatch[1]} furnitureSlug={productsMatch[2]} />;
    if (roomMatch) return <FurnitureRoomPage roomSlug={roomMatch[1]} />;
    if (isRooms) return <ShopByRoomsPage />;
    if (collectionMatch) return <CollectionDetailPage collectionSlug={collectionMatch[1]} />;
    if (isHome) return <HomePage />;
    return <NotFoundPage />;
  };

  return (
    <>
      <CustomCursor />
      <PageTransition />
      <ToastNotifications />
      {hasStandaloneShell ? null : <Header />}
      {hasStandaloneShell ? null : <MobileAppNav />}
      <div data-smooth-content>
        {renderPage()}
        {hasStandaloneShell ? null : <Footer />}
      </div>
      {hasStandaloneShell ? null : <AiChatAssistant />}
    </>
  );
}
