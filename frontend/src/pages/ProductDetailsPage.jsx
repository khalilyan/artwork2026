import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../components/ui/Icon.jsx';
import DirectCheckoutModal from '../components/ui/DirectCheckoutModal.jsx';
import SeoMeta from '../components/ui/SeoMeta.jsx';
import { showArtworkNotification } from '../components/ui/ToastNotifications.jsx';
import { getFurnitureCategory, getFurnitureRoom } from '../data/furnitureRooms.js';
import { getProduct, productDetails, products as fallbackProducts } from '../data/products.js';
import { addGuestCartItem, api, isAuthorized } from '../services/api.js';
import { formatAmdPrice, getPriceAmount } from '../utils/currency.js';
import { compressImageFiles } from '../utils/imageUpload.js';
import { getProductBadgeLabel } from '../utils/productBadge.js';
import { getAbsoluteUrl, resolvePublicAssetUrl, siteName } from '../utils/seo.js';

const reviews = [
  {
    name: 'ADRIAN STERLING',
    text: 'Այս առարկայի քանդակային որակը առանձնանում է։ Այն նույնքան գեղարվեստական ներկայություն ունի, որքան գործնական նշանակություն։',
  },
  {
    name: 'ELENA ROSSI',
    text: 'Չնայած խիստ տեսքին՝ շատ հարմարավետ է։ Էրգոնոմիկ աջակցությունը ճիշտ է նկարագրված։',
  },
  {
    name: 'JULIAN VANCE',
    text: 'Դետալների մշակումը շատ նուրբ է։ Առարկան դարձավ իմ աշխատասենյակի գլխավոր շեշտադրումը։',
  },
];
const initialReviewLimit = 3;
const minimumSkeletonMs = 1700;
const fallbackMaterials = [
  { id: 'walnut', name: 'Ընկուզենի', color: '#633005' },
  { id: 'stone', name: 'Քար', color: '#d7d0c5' },
  { id: 'brass', name: 'Պղինձ', color: '#c2a24e' },
];

function getDefaultMaterial(materials = fallbackMaterials) {
  return materials[0] ?? fallbackMaterials[0];
}

function normalizeReviews(nextReviews) {
  return (nextReviews ?? []).map((review, index) => ({
    id: review._id ?? `${review.username ?? review.name ?? 'review'}-${review.createdAt ?? index}`,
    name: review.username ?? review.name ?? 'ARTWORK ՀԱՃԱԽՈՐԴ',
    text: review.review ?? review.text ?? '',
    rate: Number(review.rate ?? 5),
    images: Array.isArray(review.images) ? review.images : [],
    createdAt: review.createdAt,
  }));
}

function uniqueProductsById(items) {
  const seenIds = new Set();

  return items.filter((item) => {
    const id = item.id ?? item.slug;

    if (!id || seenIds.has(id)) {
      return false;
    }

    seenIds.add(id);
    return true;
  });
}

function ViewIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function compressRoomImage(file) {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const maxSize = 1600;
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.round(image.naturalWidth * scale);
      const height = Math.round(image.naturalHeight * scale);
      const canvas = document.createElement('canvas');

      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(imageUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Չհաջողվեց կարդալ նկարը։'));
    };

    image.src = imageUrl;
  });
}

async function imageSourceToDataUrl(source) {
  const imageUrl = new URL(source, window.location.origin).href;
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error('Չհաջողվեց բեռնել ապրանքի նկարը։');
  }

  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Չհաջողվեց պատրաստել ապրանքի նկարը։'));
    reader.readAsDataURL(blob);
  });
}

function formatCooldownMessage(error) {
  if (error.status !== 429) return error.message;

  const secondsRemaining = Number(error.data?.error?.details?.secondsRemaining ?? 0);
  const cooldownHours = Number(error.data?.error?.details?.cooldownHours ?? 5);
  const cooldownText = Number.isFinite(cooldownHours) && cooldownHours > 0
    ? `${cooldownHours} ժամը մեկ`
    : 'սահմանված ընդմիջումից հետո';

  if (!Number.isFinite(secondsRemaining) || secondsRemaining <= 0) {
    return `AI նկարի գեներացումը հասանելի է յուրաքանչյուր ${cooldownText}։`;
  }

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.ceil((secondsRemaining % 3600) / 60);
  const parts = [
    hours ? `${hours} ժ` : '',
    minutes ? `${minutes} ր` : '',
  ].filter(Boolean).join(' ');

  return `AI նկարի գեներացումը հասանելի է յուրաքանչյուր ${cooldownText}։ Կրկին փորձեք ${parts}-ից։`;
}

function StarRating({ value, onChange }) {
  return (
    <span className="details-star-rating" role="radiogroup" aria-label="Գնահատական">
      {Array.from({ length: 5 }).map((_, index) => {
        const rating = index + 1;
        return (
          <button
            className={rating <= value ? 'is-active' : ''}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${rating} աստղ`}
            onClick={() => onChange(rating)}
            key={rating}
          >
            <Icon name={rating <= value ? 'star' : 'star_outline'} />
          </button>
        );
      })}
    </span>
  );
}

function ComplementaryProduct({ product }) {
  const productId = product.id ?? product.slug;
  const image = product.image ?? product.images?.primary ?? product.images?.gallery?.[0] ?? '';
  const roomSlug = product.roomSlugs?.[0] ?? 'living-room';
  const furnitureSlug = product.categorySlug ?? product.type ?? 'seating';
  const href = `/rooms/${roomSlug}/${furnitureSlug}/${productId}`;

  return (
    <a className="details-complementary-card" href={href}>
      <div>
        <img src={image} alt={product.name} />
      </div>
      <p className="label-caps details-complementary-views">
        <ViewIcon className="details-view-icon" />
        Դիտումներ՝ {Number(product.views ?? 0).toLocaleString('hy-AM')}
      </p>
      <h4>{product.name}</h4>
      <span>{formatAmdPrice(product.price?.amount ?? product.priceAmount ?? product.price)}</span>
    </a>
  );
}

function ProductDetailsSkeleton() {
  return (
    <main className="product-details-page" lang="hy" aria-busy="true">
      <section className="details-hero container product-details-skeleton" aria-hidden="true">
        <div className="details-gallery">
          <div className="details-main-image details-skeleton-block" />
          <div className="details-thumbnails">
            {Array.from({ length: 4 }, (_, index) => (
              <span className="details-thumbnail details-skeleton-block" key={index} />
            ))}
          </div>
        </div>

        <aside className="details-summary">
          <span className="details-skeleton-line is-label" />
          <span className="details-skeleton-line is-title" />
          <span className="details-skeleton-line is-price" />
          <div className="details-options">
            <span className="details-skeleton-line is-label" />
            <span className="details-skeleton-line is-copy" />
          </div>
          <div className="details-description">
            <span className="details-skeleton-line is-label" />
            <span className="details-skeleton-line is-copy" />
            <span className="details-skeleton-line is-copy is-short" />
          </div>
          <div className="details-action-row">
            <span className="details-skeleton-button" />
            <span className="details-skeleton-icon" />
          </div>
          <span className="details-skeleton-button is-wide" />
          <span className="details-skeleton-line is-copy" />
          <span className="details-skeleton-line is-copy" />
        </aside>
      </section>

      <section className="details-technical">
        <div className="container details-technical-grid product-details-skeleton" aria-hidden="true">
          <div>
            <span className="details-skeleton-line is-title" />
            <span className="details-skeleton-line is-copy" />
            <span className="details-skeleton-line is-copy is-short" />
          </div>
          <div className="details-skeleton-block" />
        </div>
      </section>
    </main>
  );
}

export default function ProductDetailsPage({ roomSlug, furnitureSlug, productId }) {
  const room = getFurnitureRoom(roomSlug);
  const category = getFurnitureCategory(furnitureSlug);
  const listedProduct = getProduct(productId);
  const fallbackProduct = useMemo(
    () => (listedProduct.gallery ? listedProduct : { ...productDetails, id: listedProduct.id, name: listedProduct.name.toUpperCase(), price: listedProduct.price }),
    [listedProduct],
  );
  const [product, setProduct] = useState(fallbackProduct);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isAdded, setIsAdded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [reviewItems, setReviewItems] = useState(() => normalizeReviews(reviews));
  const [visibleReviewCount, setVisibleReviewCount] = useState(initialReviewLimit);
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewStatus, setReviewStatus] = useState('');
  const [reviewImages, setReviewImages] = useState([]);
  const [previewReviewImage, setPreviewReviewImage] = useState('');
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isGalleryPreviewOpen, setIsGalleryPreviewOpen] = useState(false);
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);
  const [isDirectCheckoutOpen, setIsDirectCheckoutOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  const [isRoomPreviewOpen, setIsRoomPreviewOpen] = useState(false);
  const [roomImage, setRoomImage] = useState('');
  const [roomImageName, setRoomImageName] = useState('');
  const [roomPreviewImage, setRoomPreviewImage] = useState('');
  const [roomPreviewStatus, setRoomPreviewStatus] = useState('');
  const [isGeneratingRoomPreview, setIsGeneratingRoomPreview] = useState(false);
  const [isImageGenerationEnabled, setIsImageGenerationEnabled] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState(() => uniqueProductsById(fallbackProducts).filter((item) => item.id !== productId).slice(0, 3));
  const [materials, setMaterials] = useState(fallbackMaterials);
  const [selectedFinish, setSelectedFinish] = useState(() => getDefaultMaterial());
  const [isProductLoading, setIsProductLoading] = useState(true);
  const dimensionsText = product.dimensionsText || 'Լ 60սմ x Խ 55սմ x Բ 78սմ։ Նստատեղի բարձրություն՝ 45սմ։';
  const craftsmanshipText = product.craftsmanshipText || 'Յուրաքանչյուր առարկա մշակվում եւ հավաքվում է անհատական մոտեցմամբ՝ փորձառու վարպետների կողմից։';
  const technicalTitle = product.technicalTitle || 'Ճշգրիտ էլեգանտություն';
  const technicalDescription = product.technicalDescription || 'Յուրաքանչյուր անկյուն հաշվարկված է հարմարավետության համար՝ պահպանելով թեթեւ, մաքուր եւ հավասարակշռված տեսքը։';
  const technicalNoteOne = product.technicalNoteOne || 'Ամուր ընկուզենու կառուցվածք';
  const technicalNoteTwo = product.technicalNoteTwo || 'Իտալական անիլին կաշի';
  const productPriceAmount = getPriceAmount(product.price?.amount, product.priceAmount, product.price);
  const productPrice = formatAmdPrice(productPriceAmount);
  const oldPriceAmount = getPriceAmount(product.oldPrice?.amount, product.oldPriceAmount, product.oldPrice);
  const hasSalePrice = oldPriceAmount > 0 && oldPriceAmount > productPriceAmount;
  const oldProductPrice = hasSalePrice ? formatAmdPrice(oldPriceAmount) : '';
  const badgeLabel = getProductBadgeLabel(product);

  useEffect(() => {
    api.aiSettings()
      .then(({ imageGeneration }) => setIsImageGenerationEnabled(imageGeneration?.enabled !== false))
      .catch(() => setIsImageGenerationEnabled(true));
  }, []);

  useEffect(() => {
    api.materials()
      .then(({ materials: nextMaterials }) => {
        const activeMaterials = nextMaterials?.length ? nextMaterials : fallbackMaterials;
        setMaterials(activeMaterials);
        setSelectedFinish((current) => activeMaterials.find((material) => material.id === current.id) ?? getDefaultMaterial(activeMaterials));
      })
      .catch(() => setMaterials(fallbackMaterials));
  }, [product]);

  useEffect(() => {
    let isCurrentRequest = true;
    let loadingTimer = null;
    const loadingStartedAt = performance.now();

    setIsProductLoading(true);
    api.product(productId)
      .then(({ product: nextProduct }) => {
        if (!isCurrentRequest) return;

        setProduct({
          ...fallbackProduct,
          ...nextProduct,
          gallery: nextProduct.gallery?.length ? nextProduct.gallery : fallbackProduct.gallery,
          description: nextProduct.description ?? fallbackProduct.description,
        });
        setReviewItems(normalizeReviews(nextProduct.reviews ?? reviews));
        setVisibleReviewCount(initialReviewLimit);
      })
      .catch(() => {
        if (!isCurrentRequest) return;

        setProduct(fallbackProduct);
        setReviewItems(normalizeReviews(reviews));
        setVisibleReviewCount(initialReviewLimit);
      })
      .finally(() => {
        const elapsed = performance.now() - loadingStartedAt;
        const remaining = Math.max(0, minimumSkeletonMs - elapsed);

        loadingTimer = window.setTimeout(() => {
          if (isCurrentRequest) setIsProductLoading(false);
        }, remaining);
      });

    return () => {
      isCurrentRequest = false;
      if (loadingTimer) window.clearTimeout(loadingTimer);
    };
  }, [fallbackProduct, productId]);

  useEffect(() => {
    setSelectedFinish((current) => materials.find((material) => material.id === current.id) ?? getDefaultMaterial(materials));
  }, [materials, product.id]);

  useEffect(() => {
    if (!isAuthorized()) {
      setIsSaved(false);
      return;
    }

    api.account()
      .then(({ user }) => {
        setIsSaved((user.saved_items ?? []).some((savedProduct) => savedProduct.productSlug === product.id));
      })
      .catch(() => setIsSaved(false));
  }, [product.id]);

  useEffect(() => {
    const targetCategorySlug = product.categorySlug ?? product.type ?? furnitureSlug;
    const targetRoomSlug = product.roomSlugs?.[0] ?? roomSlug;
    const relatedParams = targetCategorySlug
      ? { categorySlug: targetCategorySlug, sort: 'newest' }
      : { roomSlug: targetRoomSlug, sort: 'newest' };

    api.products(relatedParams)
      .then(({ products: nextProducts }) => {
        const nextRelatedProducts = uniqueProductsById(nextProducts)
          .filter((item) => item.id !== product.id)
          .slice(0, 3);

        setRelatedProducts(nextRelatedProducts.length ? nextRelatedProducts : uniqueProductsById(fallbackProducts).filter((item) => item.id !== product.id).slice(0, 3));
      })
      .catch(() => {
        setRelatedProducts(uniqueProductsById(fallbackProducts).filter((item) => item.id !== product.id).slice(0, 3));
      });
  }, [furnitureSlug, product.categorySlug, product.id, product.roomSlugs, product.type, roomSlug]);

  const productGallery = useMemo(() => {
    const images = Array.from(new Set([
      product.image,
      ...(product.gallery ?? []),
      product.hoverImage,
      product.technicalImage,
      ...(fallbackProduct.gallery ?? []),
      fallbackProduct.image,
      fallbackProduct.hoverImage,
      ...fallbackProducts.map((item) => item.image),
      ...fallbackProducts.map((item) => item.hoverImage),
    ].filter(Boolean)));

    return images.slice(0, 5);
  }, [fallbackProduct.gallery, fallbackProduct.hoverImage, fallbackProduct.image, product.gallery, product.hoverImage, product.image, product.technicalImage]);

  useEffect(() => {
    setActiveImageIndex((currentIndex) => (productGallery.length ? Math.min(currentIndex, productGallery.length - 1) : 0));
  }, [productGallery.length]);

  useEffect(() => {
    document.querySelector('.details-thumbnail.is-active')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeImageIndex]);

  const showImage = (nextIndex) => {
    if (!productGallery.length) return;

    setActiveImageIndex((nextIndex + productGallery.length) % productGallery.length);
  };

  const openGalleryPreview = () => {
    if (productGallery.length) setIsGalleryPreviewOpen(true);
  };

  const addToCart = async () => {
    try {
      if (isAuthorized()) {
        await api.addCartItem({ productSlug: product.id, quantity: 1, material: selectedFinish.name });
      } else {
        addGuestCartItem({ ...product, material: selectedFinish.name }, 1);
      }
      setIsAdded(true);
      showArtworkNotification(`${product.name} ավելացվեց զամբյուղում`);
      window.setTimeout(() => setIsAdded(false), 1800);
    } catch (error) {
      setReviewStatus(error.message);
      showArtworkNotification(error.message, 'error');
    }
  };

  const toggleSavedProduct = async () => {
    if (!isAuthorized()) {
      window.location.href = `/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)}`;
      return;
    }

    if (isSaved) {
      await api.removeSavedItem(product.id);
      setIsSaved(false);
      showArtworkNotification(`${product.name} հեռացվեց պահպանվածներից`);
      return;
    }

    await api.addSavedItem({ productSlug: product.id });
    setIsSaved(true);
    showArtworkNotification(`${product.name} ավելացվեց պահպանվածներում`);
  };

  const submitReview = async (event) => {
    event.preventDefault();

    if (!isAuthorized()) {
      window.location.href = `/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)}`;
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = { ...Object.fromEntries(formData.entries()), rate: selectedRating, images: reviewImages };

    try {
      const result = await api.createReview(product.id, payload);
      setReviewItems(normalizeReviews(result.reviews));
      setVisibleReviewCount(initialReviewLimit);
      setReviewStatus('Կարծիքը ուղարկված է։');
      showArtworkNotification('Կարծիքը ուղարկված է');
      setReviewImages([]);
      form.reset();
      setSelectedRating(5);
    } catch (error) {
      setReviewStatus(error.message);
      showArtworkNotification(error.message, 'error');
    }
  };

  const selectReviewImages = async (event) => {
    const remainingSlots = Math.max(0, 4 - reviewImages.length);

    if (!remainingSlots) {
      event.target.value = '';
      return;
    }

    try {
      setReviewStatus('Նկարները պատրաստվում են...');
      const nextImages = await compressImageFiles(event.target.files, remainingSlots);
      setReviewImages((currentImages) => [...currentImages, ...nextImages].slice(0, 4));
      setReviewStatus('');
    } catch (error) {
      setReviewStatus(error.message);
      showArtworkNotification(error.message, 'error');
    } finally {
      event.target.value = '';
    }
  };

  const removeReviewImage = (image) => {
    setReviewImages((currentImages) => currentImages.filter((currentImage) => currentImage !== image));
  };

  const productUrl = typeof window === 'undefined' ? '' : window.location.href;
  const encodedProductUrl = encodeURIComponent(productUrl);
  const shareText = `Դիտեք ${product.name} ARTWORK-ից՝ ${productPrice}`;
  const encodedShareText = encodeURIComponent(shareText);
  const metaImage = productGallery[0] ?? product.image;
  const metaDescription = [
    productPrice,
    product.description,
  ].filter(Boolean).join(' · ');
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: productGallery.map((image) => resolvePublicAssetUrl(image)),
    brand: {
      '@type': 'Brand',
      name: siteName,
    },
    sku: product.id,
    offers: {
      '@type': 'Offer',
      url: getAbsoluteUrl(productUrl || window.location.pathname),
      priceCurrency: product.price?.currency ?? 'AMD',
      price: productPriceAmount,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
  const visibleReviews = reviewItems.slice(0, visibleReviewCount);
  const hasMoreReviews = reviewItems.length > visibleReviewCount;

  const copyProductLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      setShareStatus('Հղումը պատճենված է։');
      showArtworkNotification('Ապրանքի հղումը պատճենված է');
    } catch {
      setShareStatus('Չհաջողվեց պատճենել։ Խնդրում ենք պատճենել հղումը ձեռքով։');
      showArtworkNotification('Չհաջողվեց պատճենել հղումը', 'error');
    }
  };

  const selectRoomImage = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setRoomPreviewStatus('Նկարը պատրաստվում է...');
      setRoomImage(await compressRoomImage(file));
      setRoomImageName(file.name);
      setRoomPreviewImage('');
      setRoomPreviewStatus('');
    } catch (error) {
      setRoomPreviewStatus(error.message);
      showArtworkNotification(error.message, 'error');
    } finally {
      event.target.value = '';
    }
  };

  const generateRoomPreview = async () => {
    if (!isImageGenerationEnabled) {
      setRoomPreviewStatus('AI image generation is currently disabled.');
      return;
    }

    if (!roomImage) {
      setRoomPreviewStatus('Խնդրում ենք ընտրել կամ նկարել սենյակը։');
      return;
    }

    const productImage = productGallery[activeImageIndex] ?? productGallery[0] ?? product.image;
    try {
      setIsGeneratingRoomPreview(true);
      setRoomPreviewStatus('AI-ն տեղադրում է կահույքը ձեր սենյակում...');
      const productImageUrl = await imageSourceToDataUrl(productImage);
      const result = await api.visualizeProductInRoom({
        roomImage,
        productImageUrl,
        productName: product.name,
        productDescription: product.description,
      });
      setRoomPreviewImage(result.image);
      setRoomPreviewStatus('Պատրաստ է։');
      showArtworkNotification('AI սենյակի նախադիտումը պատրաստ է');
    } catch (error) {
      const message = formatCooldownMessage(error);
      setRoomPreviewStatus(message);
      showArtworkNotification(message, 'error');
    } finally {
      setIsGeneratingRoomPreview(false);
    }
  };

  const shareDialog = isShareOpen && typeof document !== 'undefined' ? createPortal(
    <div className="details-share-dialog" role="dialog" aria-modal="true" aria-label="Կիսվել ապրանքով">
      <div>
        <button className="details-share-close" type="button" onClick={() => setIsShareOpen(false)} aria-label="Փակել կիսվելու պատուհանը">
          <Icon name="close" />
        </button>
        <h3>Կիսվել այս կահույքով</h3>
        <p>{product.name}</p>
        {shareStatus ? <span className="label-caps">{shareStatus}</span> : null}
        <div className="details-share-options">
          <a className="label-caps" href={`https://www.facebook.com/sharer/sharer.php?u=${encodedProductUrl}`} target="_blank" rel="noreferrer">Facebook</a>
          <a className="label-caps" href={`https://twitter.com/intent/tweet?url=${encodedProductUrl}&text=${encodedShareText}`} target="_blank" rel="noreferrer">X / Twitter</a>
          <a className="label-caps" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedProductUrl}`} target="_blank" rel="noreferrer">LinkedIn</a>
          <button className="label-caps" type="button" onClick={copyProductLink}>Պատճենել հղումը</button>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  const roomPreviewDialog = isRoomPreviewOpen && typeof document !== 'undefined' ? createPortal(
    <div className="details-ai-dialog" role="dialog" aria-modal="true" aria-label="Տեսնել իմ սենյակում">
      <div>
        <button className="details-share-close" type="button" onClick={() => setIsRoomPreviewOpen(false)} aria-label="Փակել AI նախադիտումը">
          <Icon name="close" />
        </button>
        <div className="details-ai-heading">
          <p className="label-caps">ԱՐՀԵՍՏԱԿԱՆ ԲԱՆԱԿԱՆՈՒԹՅԱՄԲ ԴԻՏՈՒՄ</p>
          <h3>Տեսնել իմ սենյակում</h3>
        </div>
        <div className="details-ai-grid">
          <div className="details-ai-controls">
            <img src={productGallery[activeImageIndex] ?? productGallery[0]} alt={product.name} />
            <div className="details-ai-upload-row">
              <label className="details-ai-upload label-caps">
                Ընտրել սենյակի նկար
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectRoomImage} />
              </label>
              <label className="details-ai-upload label-caps">
                Բացել տեսախցիկը
                <input type="file" accept="image/*" capture="environment" onChange={selectRoomImage} />
              </label>
            </div>
            {roomImage ? (
              <div className="details-ai-room-thumb">
                <img src={roomImage} alt={roomImageName || 'Սենյակի նկար'} />
                <span className="label-caps">{roomImageName || 'Ընտրված նկար'}</span>
              </div>
            ) : null}
            <button className="details-ai-generate label-caps" type="button" onClick={generateRoomPreview} disabled={isGeneratingRoomPreview}>
              {isGeneratingRoomPreview ? 'Գեներացվում է...' : 'Գեներացնել'}
              <Icon name="auto_awesome" />
            </button>
            {roomPreviewStatus ? <p>{roomPreviewStatus}</p> : null}
          </div>
          <div className="details-ai-result">
            {roomPreviewImage ? (
              <>
                <img src={roomPreviewImage} alt={`${product.name} ձեր սենյակում`} />
                <a className="details-ai-download label-caps" href={roomPreviewImage} download={`${product.id}-room-preview.png`}>
                  Ներբեռնել արդյունքը
                  <Icon name="download" />
                </a>
              </>
            ) : (
              <div>
                <Icon name="image" />
                <p>Արդյունքը կհայտնվի այստեղ</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  const galleryPreviewDialog = isGalleryPreviewOpen && typeof document !== 'undefined' ? createPortal(
    <div className="details-image-preview" role="dialog" aria-modal="true" aria-label="Դիտել ապրանքի նկարը">
      <button className="details-preview-close" type="button" onClick={() => setIsGalleryPreviewOpen(false)} aria-label="Փակել նկարը">
        <Icon name="close" />
      </button>
      <button className="details-preview-arrow is-prev" type="button" onClick={() => showImage(activeImageIndex - 1)} aria-label="Նախորդ նկար">
        <Icon name="arrow_back" />
      </button>
      <img src={productGallery[activeImageIndex] ?? product.image} alt={product.name} />
      <button className="details-preview-arrow is-next" type="button" onClick={() => showImage(activeImageIndex + 1)} aria-label="Հաջորդ նկար">
        <Icon name="arrow_forward" />
      </button>
    </div>,
    document.body,
  ) : null;

  const reviewImagePreviewDialog = previewReviewImage && typeof document !== 'undefined' ? createPortal(
    <div className="details-image-preview" role="dialog" aria-modal="true" aria-label="Դիտել հաճախորդի նկարը">
      <button className="details-preview-close" type="button" onClick={() => setPreviewReviewImage('')} aria-label="Փակել նկարը">
        <Icon name="close" />
      </button>
      <img src={previewReviewImage} alt="Հաճախորդի սենյակի մեծացված նկար" />
    </div>,
    document.body,
  ) : null;

  const materialDialog = isMaterialDialogOpen && typeof document !== 'undefined' ? createPortal(
    <div className="details-material-dialog" role="dialog" aria-modal="true" aria-label="Ընտրել նյութը">
      <div>
        <button className="details-share-close" type="button" onClick={() => setIsMaterialDialogOpen(false)} aria-label="Փակել նյութերի պատուհանը">
          <Icon name="close" />
        </button>
        <div className="details-material-heading">
          <p className="label-caps">ՆՅՈՒԹ / ԳՈՒՅՆ</p>
          <h3>Ընտրեք նյութը/գույնը</h3>
        </div>
        <div className="details-material-grid">
          {materials.map((material) => (
            <button
              className={`details-material-option ${selectedFinish.id === material.id ? 'is-selected' : ''}`}
              type="button"
              onClick={() => {
                setSelectedFinish(material);
                setIsMaterialDialogOpen(false);
              }}
              key={material.id}
            >
              <span style={{ background: material.image ? `url(${material.image}) center / cover` : material.color }} />
              <strong>{material.name}</strong>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  const shareProduct = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: shareText, url: productUrl });
        return;
      } catch {
        // Keep dialog open if native sharing is cancelled.
      }
    }

    setIsShareOpen(true);
  };

  if (isProductLoading) {
    return <ProductDetailsSkeleton />;
  }

  return (
    <main className="product-details-page" lang="hy">
      <SeoMeta
        title={`${product.name} | ARTWORK`}
        description={metaDescription}
        image={metaImage}
        url={productUrl}
        type="product"
        keywords={`${product.name}, ARTWORK Furniture, designer furniture Armenia, custom furniture, luxury furniture`}
        jsonLd={productSchema}
        priceAmount={productPriceAmount}
        priceCurrency={product.price?.currency ?? 'AMD'}
      />
      <section className="details-hero container">
        <div className="details-gallery">
          <div className="details-main-image parallax-container">
            <img
              className="details-parallax-image"
              data-detail-parallax
              src={productGallery[activeImageIndex] ?? product.image}
              alt={product.name}
              key={productGallery[activeImageIndex] ?? product.image}
              role="button"
              tabIndex="0"
              onClick={openGalleryPreview}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openGalleryPreview();
                }
              }}
            />
            <button className="details-gallery-arrow is-prev" type="button" onClick={() => showImage(activeImageIndex - 1)} aria-label="Նախորդ նկար">
              <span className="label-caps">Նախորդ</span>
              <i />
            </button>
            <button className="details-gallery-arrow is-next" type="button" onClick={() => showImage(activeImageIndex + 1)} aria-label="Հաջորդ նկար">
              <i />
              <span className="label-caps">Հաջորդ</span>
            </button>
          </div>
          <div className="details-thumbnails">
            {productGallery.map((image, index) => (
              <button className={`details-thumbnail ${index === activeImageIndex ? 'is-active' : ''}`} type="button" onClick={() => showImage(index)} key={image}>
                <img src={image} alt={`${product.name} փոքր նկար ${index + 1}`} />
              </button>
            ))}
          </div>
        </div>

        <aside className="details-summary">
          <div className="details-meta-row">
            <p className="label-caps details-views-label"><ViewIcon className="details-view-icon" />Դիտումներ՝ {Number(product.views ?? 0).toLocaleString('hy-AM')}</p>
            {badgeLabel ? <span className="details-sale-badge label-caps">{badgeLabel}</span> : null}
          </div>
          <h1>{product.name}</h1>
          <div className="details-price">
            {hasSalePrice ? <del>{oldProductPrice}</del> : null}
            <strong>{productPrice}</strong>
          </div>
          <div className="details-options">
            <span className="label-caps">ՆՅՈՒԹ</span>
            <button className="details-material-trigger" type="button" onClick={() => setIsMaterialDialogOpen(true)}>
              <span className="details-material-stack" aria-hidden="true">
                {materials.slice(0, 3).map((material) => (
                  <i style={{ background: material.image ? `url(${material.image}) center / cover` : material.color }} key={material.id} />
                ))}
              </span>
              <span className="details-material-count label-caps">{Math.max(materials.length - 3, 0)}+ գույն/կտոր</span>
            </button>
            <p className="details-selected-finish label-caps">Ընտրված՝ {selectedFinish.name}</p>
            {materialDialog}
          </div>
          <div className="details-description">
            <span className="label-caps">ՆԿԱՐԱԳՐՈՒԹՅՈՒՆ</span>
            <p>{product.description}</p>
          </div>
          <div className="details-action-row">
            <button className={`details-cart-button label-caps ${isAdded ? 'is-added' : ''}`} type="button" onClick={addToCart}>
              {isAdded ? 'Ավելացված է' : 'Ավելացնել զամբյուղ'}
              <Icon name={isAdded ? 'check' : 'arrow_forward'} />
            </button>
            <button
              className={`details-save-button ${isSaved ? 'is-saved' : ''}`}
              type="button"
              onClick={toggleSavedProduct}
              aria-label={isSaved ? 'Հեռացնել պահպանվածներից' : 'Պահպանել ապրանքը'}
            >
              <Icon name="favorite" />
            </button>
          </div>
          <button className="details-buy-button label-caps" type="button" onClick={() => setIsDirectCheckoutOpen(true)}>
            Գնել
            <Icon name="shopping_bag" />
          </button>
          {isImageGenerationEnabled ? (
            <>
              <button className="details-ai-button label-caps" type="button" onClick={() => setIsRoomPreviewOpen(true)}>
                Տեսնել իմ սենյակում
                <Icon name="auto_awesome" />
              </button>
              {roomPreviewDialog}
            </>
          ) : null}
          <button className="details-share-button" type="button" onClick={shareProduct}>
            Կիսվել այս առարկայով
            <Icon name="ios_share" />
          </button>
          {shareDialog}
          {galleryPreviewDialog}
          <DirectCheckoutModal
            isOpen={isDirectCheckoutOpen}
            title={product.name}
            total={product.price?.amount ?? product.priceAmount ?? product.price}
            items={[{ productSlug: product.id, quantity: 1 }]}
            onClose={() => setIsDirectCheckoutOpen(false)}
          />
          <details>
            <summary><span className="label-caps">ՉԱՓԵՐ</span><Icon name="expand_more" /></summary>
            <p>{dimensionsText}</p>
          </details>
          <details>
            <summary><span className="label-caps">ՎԱՐՊԵՏՈՒԹՅՈՒՆ</span><Icon name="expand_more" /></summary>
            <p>{craftsmanshipText}</p>
          </details>
        </aside>
      </section>

      <section className="details-technical">
        <div className="container details-technical-grid">
          <div>
            <h2>{technicalTitle}</h2>
            <p>{technicalDescription}</p>
            <span className="label-caps">{technicalNoteOne}</span>
            <span className="label-caps">{technicalNoteTwo}</span>
          </div>
          <div>
            <img src={product.technicalImage} alt="Տեխնիկական գծագիր" />
          </div>
        </div>
      </section>

      <section className="details-reviews container">
        <div className="details-reviews-header">
          <h2>Հաճախորդների կարծիքներ</h2>
        </div>

        <div className="details-review-form">
          <h3>Կիսվեք ձեր կարծիքով</h3>
          {reviewStatus ? <p>{reviewStatus}</p> : null}
          <form onSubmit={submitReview}>
            <label className="details-rating-field">
              <span className="label-caps">Գնահատական</span>
              <StarRating value={selectedRating} onChange={setSelectedRating} />
              <input name="rate" type="hidden" value={selectedRating} readOnly />
            </label>
            <label>
              <span className="label-caps">Ձեր կարծիքը</span>
              <textarea name="review" rows="3" placeholder="Գրեք ձեր տպավորությունը այս առարկայի մասին..." required />
            </label>
            <div className="details-review-upload">
              <span className="label-caps">Սենյակի նկարներ</span>
              <div className="details-review-upload-actions">
                <label className="details-review-upload-button label-caps">
                  Վերբեռնել
                  <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={selectReviewImages} />
                </label>
                <label className="details-review-upload-button label-caps">
                  Տեսախցիկ
                  <input type="file" accept="image/*" capture="environment" onChange={selectReviewImages} />
                </label>
              </div>
              {reviewImages.length ? (
                <div className="details-review-thumbs">
                  {reviewImages.map((image, index) => (
                    <span className="details-review-thumb" key={`${image.slice(0, 32)}-${index}`}>
                      <button type="button" onClick={() => setPreviewReviewImage(image)} aria-label={`Մեծացնել սենյակի նկար ${index + 1}`}>
                        <img src={image} alt={`Սենյակի նկար ${index + 1}`} />
                      </button>
                      <button type="button" onClick={() => removeReviewImage(image)} aria-label="Հեռացնել նկարը">
                        <Icon name="close" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <button className="details-review-submit label-caps" type="submit">Ուղարկել կարծիքը</button>
          </form>
        </div>

        <div className="details-review-list">
          {visibleReviews.length ? visibleReviews.map((review) => (
            <article className="details-review" key={review.id}>
              <div className="details-review-author">
                <span><Icon name="person" /></span>
                <div>
                  <p className="label-caps">{review.name}</p>
                  <div aria-label={`${review.rate} աստղ գնահատական`}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <span className={index < review.rate ? 'is-active' : ''} key={index}>
                        <Icon name="star" />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p>&ldquo;{review.text}&rdquo;</p>
              {review.images?.length ? (
                <div className="details-review-gallery">
                  {review.images.map((image, index) => (
                    <button type="button" onClick={() => setPreviewReviewImage(image)} aria-label={`Մեծացնել հաճախորդի նկար ${index + 1}`} key={`${review.id}-${index}`}>
                      <img src={image} alt={`Հաճախորդի սենյակի նկար ${index + 1}`} />
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          )) : <p className="details-empty-reviews">Դեռ կարծիքներ չկան։ Եղեք առաջինը։</p>}
        </div>
        {reviewImagePreviewDialog}

        {hasMoreReviews ? (
          <button className="details-load-more label-caps" type="button" onClick={() => setVisibleReviewCount((count) => count + initialReviewLimit)}>
            Ցուցադրել ավելին
            <Icon name="arrow_forward" />
          </button>
        ) : null}
      </section>

      <section className="details-image-stack container">
        {productGallery.slice(0, 5).map((image, index) => (
          <div className={`details-stack-item ${index % 2 ? 'is-offset' : ''}`} key={`${image}-${index}`}>
            <img src={image} alt={`${product.name} լրացուցիչ տեսք ${index + 1}`} />
          </div>
        ))}
      </section>

      <section className="details-complementary container">
        <div className="details-complementary-header">
          <h2>Նման առարկաներ</h2>
          <a className="label-caps" href={`/rooms/${room.slug}/${category.slug}`}>ԴԻՏԵԼ ԱՄԲՈՂՋ ԲԱԺԻՆԸ</a>
        </div>
        <div className="details-complementary-grid">
          {relatedProducts.map((item) => (
            <ComplementaryProduct product={item} key={item.id} />
          ))}
        </div>
      </section>
    </main>
  );
}
