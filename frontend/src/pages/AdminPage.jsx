import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/ui/Icon.jsx';
import { showArtworkNotification } from '../components/ui/ToastNotifications.jsx';
import { api, getStoredAuthUser } from '../services/api.js';
import { formatAmdPrice, getPriceAmount } from '../utils/currency.js';

const productGroups = ['chairs', 'sofas', 'lighting', 'beds'];
const productGroupLabels = {
  chairs: 'Աթոռներ',
  sofas: 'Բազմոցներ',
  lighting: 'Լուսավորություն',
  beds: 'Մահճակալներ',
};
const orderStatuses = ['quote_requested', 'processing', 'completed', 'cancelled'];
const orderStatusLabels = {
  quote_requested: 'Հարցում',
  processing: 'Ընթացքում',
  completed: 'Ավարտված',
  cancelled: 'Չեղարկված',
};
const userStatusLabels = {
  active: 'Ակտիվ',
  disabled: 'Անջատված',
};
const userRoleLabels = {
  customer: 'Հաճախորդ',
  admin: 'Ադմին',
};
const contactStatusLabels = {
  new: 'Նոր',
};
const userStatuses = ['active', 'disabled'];
const userRoles = ['customer', 'admin'];
const collectionFieldLabels = {
  slug: 'Slug',
  title: 'Վերնագիր',
  subtitle: 'Ենթավերնագիր',
};
const tabs = [
  { id: 'overview', label: 'Ընդհանուր', icon: 'dashboard' },
  { id: 'homepage', label: 'Գլխավոր էջ', icon: 'web' },
  { id: 'products', label: 'Ապրանքներ', icon: 'inventory_2' },
  { id: 'rooms', label: 'Սենյակներ', icon: 'chair' },
  { id: 'collections', label: 'Հավաքածուներ', icon: 'category' },
  { id: 'orders', label: 'Պատվերներ', icon: 'receipt_long' },
  { id: 'contacts', label: 'Կոնտակտներ', icon: 'contact_mail' },
  { id: 'users', label: 'Օգտատերեր', icon: 'group' },
  { id: 'materials', label: 'Նյութեր', icon: 'palette' },
  { id: 'ai', label: 'ԱԲ', icon: 'auto_awesome' },
];
const adminSeenStorageKey = 'artworkAdminSeenNotifications';
const notificationTabIds = ['orders', 'contacts', 'ai'];

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('hy-AM', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function getTimestamp(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function getStoredSeenNotifications() {
  try {
    return JSON.parse(window.localStorage.getItem(adminSeenStorageKey) ?? '{}');
  } catch {
    return {};
  }
}

function setStoredSeenNotifications(value) {
  window.localStorage.setItem(adminSeenStorageKey, JSON.stringify(value));
}

function toCsv(value) {
  return Array.isArray(value) ? value.join(', ') : '';
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function getOrderItemPrice(item) {
  return getPriceAmount(item.unitPrice?.amount, item.price?.amount, item.snapshot?.price?.amount, item.price);
}

function getOrderSubtotal(order) {
  return (order.items ?? []).reduce((sum, item) => sum + getOrderItemPrice(item) * (Number(item.quantity) || 1), 0);
}

function normalizeFurnitureTypes(value) {
  return Array.isArray(value) ? value : [];
}

function createFurnitureType() {
  return {
    slug: '',
    title: '',
    description: '',
    image: '',
    isActive: true,
  };
}

function productFormState(product = {}) {
  const basePriceAmount = product.oldPriceAmount ?? product.oldPrice?.amount ?? product.priceAmount ?? product.price?.amount ?? '';

  return {
    group: product.group ?? '',
    slug: product.slug ?? '',
    name: product.name ?? '',
    sku: product.sku ?? '',
    badge: product.sale?.isActive ? '' : product.badge ?? '',
    description: product.description ?? '',
    dimensionsText: product.dimensionsText ?? '',
    categorySlug: product.categorySlug ?? '',
    type: product.type ?? '',
    priceAmount: basePriceAmount,
    saleIsActive: Boolean(product.sale?.isActive),
    salePercent: product.sale?.percent ?? 0,
    primaryImage: product.images?.primary ?? product.image ?? '',
    hoverImage: product.images?.hover ?? product.hoverImage ?? '',
    gallery: toArray(product.images?.gallery ?? product.gallery),
    roomSlugs: toArray(product.roomSlugs),
    hashtags: toCsv(product.hashtags),
    isActive: product.isActive !== false,
  };
}

function materialFormState(material = {}) {
  return {
    id: material.id ?? '',
    name: material.name ?? '',
    color: material.color ?? '#c2a24e',
    image: material.image ?? '',
  };
}

function getStorageGroupForType(typeSlug = '') {
  if (!typeSlug) return '';
  if (typeSlug.includes('sofa')) return 'sofas';
  if (typeSlug.includes('bed')) return 'beds';
  if (typeSlug.includes('light')) return 'lighting';
  return 'chairs';
}

function roomFormState(room = {}) {
  return {
    slug: room.slug ?? '',
    name: room.name ?? '',
    eyebrow: room.eyebrow ?? '',
    title: room.title ?? '',
    description: room.description ?? '',
    image: room.image ?? '',
    align: room.align ?? 'left',
    tone: room.tone ?? 'light',
    imageClass: room.imageClass ?? '',
    sortOrder: room.sortOrder ?? 0,
    italicDescription: Boolean(room.italicDescription),
    tall: Boolean(room.tall),
    isActive: room.isActive !== false,
    furnitureTypes: normalizeFurnitureTypes(room.furnitureTypes),
  };
}

function collectionFormState(collection = {}) {
  return {
    slug: collection.slug ?? '',
    title: collection.title ?? '',
    subtitle: collection.subtitle ?? '',
    description: collection.description ?? '',
    detailDescription: collection.detailDescription ?? '',
    heroImage: collection.heroImage ?? collection.image ?? '',
    priceAmount: collection.price?.amount ?? collection.priceAmount ?? '',
    productSlugs: toArray(collection.productSlugs),
    isActive: collection.isActive !== false,
  };
}

function homepageFormState(page = {}) {
  const heroSlides = Array.isArray(page.heroSlides) && page.heroSlides.length ? page.heroSlides : [{ title: '', subtitle: '', image: '' }];

  return {
    heroSlides: heroSlides.map((slide) => ({
      title: slide.title ?? '',
      subtitle: slide.subtitle ?? '',
      image: slide.image ?? '',
    })),
  };
}

function AdminMetric({ label, value }) {
  return (
    <div className="admin-metric">
      <span className="label-caps">{label}</span>
      <strong>{value ?? 0}</strong>
    </div>
  );
}

function AdminPanel({ title, action, children }) {
  return (
    <section className="admin-panel-block">
      <div className="admin-panel-heading">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ImageField({ label, value, onChange, onUpload }) {
  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await onUpload(file, onChange);
    event.target.value = '';
  };

  return (
    <label className="is-wide admin-image-field">
      <span>{label}</span>
      {value ? (
        <img className="admin-image-preview" src={value} alt={`${label} preview`} />
      ) : (
        <div className="admin-image-preview admin-image-preview-placeholder"><Icon name="image" /></div>
      )}
      <div>
        <input value={value} onChange={(event) => onChange(event.target.value)} />
        <label className="admin-upload-button">
          <Icon name="upload" />
          <input type="file" accept="image/*" onChange={handleFile} />
        </label>
      </div>
    </label>
  );
}

function AdminEditorInput({ label, value, onChange, type = 'text', wide = false }) {
  return (
    <label className={wide ? 'is-wide' : ''}>
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function AdminEditorTextarea({ label, value, onChange }) {
  return (
    <label className="is-wide">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ProductPhotoManager({ form, setForm, onUpload }) {
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateGalleryItem = (index, value) => {
    setField('gallery', form.gallery.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };
  const removeGalleryItem = (index) => {
    setField('gallery', form.gallery.filter((_, itemIndex) => itemIndex !== index));
  };
  const addGalleryItem = () => {
    setField('gallery', [...form.gallery, '']);
  };
  const uploadGalleryItem = async (file, index = null) => {
    await onUpload(file, (url) => {
      if (index === null) setField('gallery', [...form.gallery, url]);
      else updateGalleryItem(index, url);
    });
  };

  return (
    <div className="admin-photo-manager">
      <div className="admin-nested-heading">
        <span>Ապրանքի նկարներ</span>
        <button type="button" onClick={addGalleryItem}>
          <Icon name="add_photo_alternate" />
          <span>Ավելացնել նկար</span>
        </button>
      </div>
      <ImageField label="Գլխավոր նկար" value={form.primaryImage} onChange={(value) => setField('primaryImage', value)} onUpload={onUpload} />
      <ImageField label="Լրացուցիչ նկար" value={form.hoverImage} onChange={(value) => setField('hoverImage', value)} onUpload={onUpload} />
      <div className="admin-gallery-list">
        <div className="admin-gallery-heading">
          <span>Գալերեայի նկարներ</span>
          <label className="admin-upload-inline">
            <Icon name="upload" />
            <span>Վերբեռնել նկար</span>
            <input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) await uploadGalleryItem(file);
                event.target.value = '';
              }}
            />
          </label>
        </div>
        {form.gallery.map((photo, index) => (
          <div className="admin-gallery-item" key={`gallery-item-${index}`}>
            {photo ? <img src={photo} alt={`Gallery ${index + 1}`} /> : <div className="admin-gallery-placeholder"><Icon name="image" /></div>}
            <input value={photo} onChange={(event) => updateGalleryItem(index, event.target.value)} placeholder="Նկարի հղում" />
            <label className="admin-upload-icon">
              <Icon name="upload" />
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (file) await uploadGalleryItem(file, index);
                  event.target.value = '';
                }}
              />
            </label>
            <button type="button" onClick={() => removeGalleryItem(index)}>
              <Icon name="delete" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CollectionProductPicker({ products, selectedSlugs, onChange }) {
  const selectedSet = new Set(selectedSlugs);
  const groupedProducts = productGroups.map((group) => ({
    group,
    products: products.filter((product) => product.group === group),
  }));

  const toggleProduct = (slug) => {
    onChange(selectedSet.has(slug) ? selectedSlugs.filter((item) => item !== slug) : [...selectedSlugs, slug]);
  };

  return (
    <div className="admin-product-picker">
      <div className="admin-nested-heading">
        <span>Հավաքածուի ապրանքներ</span>
        <small>{selectedSlugs.length} ընտրված</small>
      </div>
      <div className="admin-selected-products">
        {selectedSlugs.map((slug) => {
          const product = products.find((item) => item.slug === slug);
          return (
            <button type="button" key={slug} onClick={() => toggleProduct(slug)}>
              <Icon name="close" />
              <span>{product?.name ?? slug}</span>
            </button>
          );
        })}
      </div>
      <div className="admin-picker-groups">
        {groupedProducts.map(({ group, products: groupProducts }) => (
          <section key={group}>
            <h3>{productGroupLabels[group] ?? group}</h3>
            <div className="admin-picker-grid">
              {groupProducts.map((product) => (
                <button className={selectedSet.has(product.slug) ? 'is-selected' : ''} type="button" key={product.slug} onClick={() => toggleProduct(product.slug)}>
                  <img src={product.image} alt={product.name} />
                  <span>{product.name}</span>
                  <small>{product.slug}</small>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ProductPlacementEditor({ rooms, form, setForm }) {
  const selectedRooms = new Set(form.roomSlugs);
  const selectedRoomItems = rooms.filter((room) => selectedRooms.size === 0 || selectedRooms.has(room.slug));
  const availableTypes = selectedRoomItems
    .flatMap((room) => room.furnitureTypes ?? [])
    .filter((type, index, types) => type.slug && types.findIndex((item) => item.slug === type.slug) === index);

  const toggleRoom = (roomSlug) => {
    setForm((current) => {
      const currentRooms = new Set(current.roomSlugs);
      if (currentRooms.has(roomSlug)) currentRooms.delete(roomSlug);
      else currentRooms.add(roomSlug);

      return { ...current, roomSlugs: Array.from(currentRooms) };
    });
  };

  const setType = (typeSlug) => {
    setForm((current) => ({
      ...current,
      categorySlug: typeSlug,
      type: typeSlug,
      group: getStorageGroupForType(typeSlug),
    }));
  };

  return (
    <div className="admin-placement-editor">
      <div className="admin-nested-heading">
        <span>Սենյակ և կահույքի տեսակ</span>
        <small>{form.roomSlugs.length} սենյակ ընտրված</small>
      </div>
      <div className="admin-room-checks">
        {rooms.map((room) => (
          <label key={room.slug}>
            <input type="checkbox" checked={selectedRooms.has(room.slug)} onChange={() => toggleRoom(room.slug)} />
            <span>{room.name}</span>
          </label>
        ))}
      </div>
      <label>
        <span>Կահույքի տեսակ</span>
        <select value={form.categorySlug} onChange={(event) => setType(event.target.value)}>
          <option value="">Առանց տեսակի (ALL)</option>
          {availableTypes.map((type) => (
            <option value={type.slug} key={type.slug}>{type.title || type.slug}</option>
          ))}
        </select>
        <small>Եթե տեսակը պարտադիր չէ, ընտրեք «Առանց տեսակի (ALL)»։</small>
      </label>
    </div>
  );
}

function FurnitureTypesEditor({ value, onChange, onUpload }) {
  const updateItem = (index, field, nextValue) => {
    onChange(value.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: nextValue } : item)));
  };

  const addItem = () => {
    onChange([...(value ?? []), createFurnitureType()]);
  };

  const removeItem = (index) => {
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="admin-nested-editor">
      <div className="admin-nested-heading">
        <span>Կահույքի տեսակներ</span>
        <button type="button" onClick={addItem}>
          <Icon name="add" />
          <span>Ավելացնել տեսակ</span>
        </button>
      </div>
      {(value ?? []).map((item, index) => (
        <section className="admin-nested-item" key={index}>
          <div className="admin-nested-title">
            <strong>{item.title || item.slug || `Տեսակ ${index + 1}`}</strong>
            <button type="button" onClick={() => removeItem(index)}>
              <Icon name="delete" />
            </button>
          </div>
          <div className="admin-nested-grid">
            <label>
              <span>Տեսակի slug</span>
              <input value={item.slug ?? ''} onChange={(event) => updateItem(index, 'slug', event.target.value)} />
            </label>
            <label>
              <span>Տեսակի անուն</span>
              <input value={item.title ?? ''} onChange={(event) => updateItem(index, 'title', event.target.value)} />
            </label>
            <label className="is-wide">
              <span>Նկարագրություն</span>
              <textarea value={item.description ?? ''} onChange={(event) => updateItem(index, 'description', event.target.value)} />
            </label>
            <ImageField label="Կատեգորիայի նկար" value={item.image ?? ''} onChange={(nextValue) => updateItem(index, 'image', nextValue)} onUpload={onUpload} />
          </div>
        </section>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [seenNotifications, setSeenNotifications] = useState(() => getStoredSeenNotifications());
  const [overview, setOverview] = useState(null);
  const [homePage, setHomePage] = useState(null);
  const [products, setProducts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [collections, setCollections] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [orders, setOrders] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [aiSettings, setAiSettings] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [homepageForm, setHomepageForm] = useState(homepageFormState());
  const [productForm, setProductForm] = useState(productFormState());
  const [roomForm, setRoomForm] = useState(roomFormState());
  const [collectionForm, setCollectionForm] = useState(collectionFormState());
  const [materialForm, setMaterialForm] = useState(materialFormState());
  const [query, setQuery] = useState('');
  const [expandedProductRooms, setExpandedProductRooms] = useState({});
  const [expandedProductTypes, setExpandedProductTypes] = useState({});
  const [expandedRooms, setExpandedRooms] = useState({});
  const [expandedCollections, setExpandedCollections] = useState({});
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const currentUser = getStoredAuthUser();

  const productsBySlug = useMemo(() => new Map(products.map((product) => [product.slug, product])), [products]);

  const productsByRoom = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filterProducts = (items = []) => items
      .map((embeddedProduct) => productsBySlug.get(embeddedProduct.slug ?? embeddedProduct.productSlug) ?? embeddedProduct)
      .filter((product) => !needle || [product.name, product.sku, product.categorySlug]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle));

    return rooms.map((room) => {
      const typeSections = (room.furnitureTypes ?? []).map((type) => {
        const typeProducts = filterProducts(type.products ?? []);

        return { type, products: typeProducts };
      });
      const roomLevelProducts = filterProducts(room.products ?? []);
      if (roomLevelProducts.length) {
        typeSections.push({ type: { slug: 'all-products', title: 'Բոլոր ապրանքները (առանց տեսակի)' }, products: roomLevelProducts });
      }
      const roomProducts = typeSections.flatMap((section) => section.products);

      return { room, products: roomProducts, typeSections };
    });
  }, [productsBySlug, query, rooms]);

  const filteredOrders = useMemo(() => (
    orderStatusFilter === 'all' ? orders : orders.filter((order) => order.status === orderStatusFilter)
  ), [orderStatusFilter, orders]);

  const latestNotificationTimes = useMemo(() => ({
    orders: Math.max(0, ...orders.map((order) => getTimestamp(order.createdAt))),
    contacts: Math.max(0, ...contacts.map((contact) => getTimestamp(contact.createdAt))),
    ai: getTimestamp(aiSettings?.lastError?.at),
  }), [aiSettings?.lastError?.at, contacts, orders]);

  const notificationCounts = useMemo(() => ({
    orders: orders.filter((order) => getTimestamp(order.createdAt) > Number(seenNotifications.orders ?? 0)).length,
    contacts: contacts.filter((contact) => getTimestamp(contact.createdAt) > Number(seenNotifications.contacts ?? 0)).length,
    ai: latestNotificationTimes.ai > Number(seenNotifications.ai ?? 0) ? 1 : 0,
  }), [contacts, latestNotificationTimes.ai, orders, seenNotifications]);

  const markTabNotificationsSeen = (tabId) => {
    if (!notificationTabIds.includes(tabId)) return;

    const latestTime = latestNotificationTimes[tabId] ?? 0;
    if (!latestTime || latestTime <= Number(seenNotifications[tabId] ?? 0)) return;

    setSeenNotifications((current) => {
      const next = { ...current, [tabId]: latestTime };
      setStoredSeenNotifications(next);
      return next;
    });
  };

  const notify = (message, tone = 'success') => {
    const icon = tone === 'error' ? 'error' : tone === 'info' ? 'info' : 'check_circle';
    showArtworkNotification(message, icon);
  };

  const notifyError = (error) => {
    notify(error?.message ?? 'Update failed.', 'error', false);
  };

  const loadAdminData = async () => {
    setIsLoading(true);

    try {
      const [overviewData, homepageData, productsData, roomsData, collectionsData, materialsData, ordersData, contactsData, usersData, aiSettingsData] = await Promise.all([
        api.adminOverview(),
        api.adminHomepage(),
        api.adminProducts(),
        api.adminRooms(),
        api.adminCollections(),
        api.adminMaterials(),
        api.adminOrders(),
        api.adminContacts(),
        api.adminUsers(),
        api.adminAiSettings(),
      ]);

      const nextProducts = productsData.products ?? [];
      const nextRooms = roomsData.rooms ?? [];
      const nextCollections = collectionsData.collections ?? [];
      const nextMaterials = materialsData.materials ?? [];
      setOverview(overviewData);
      setHomePage(homepageData.page);
      setHomepageForm(homepageFormState(homepageData.page));
      setProducts(nextProducts);
      setRooms(nextRooms);
      setCollections(nextCollections);
      setMaterials(nextMaterials);
      setOrders(ordersData.orders ?? []);
      setContacts(contactsData.contacts ?? []);
      setUsers(usersData.users ?? []);
      setAiSettings(aiSettingsData.settings);
      setSelectedProduct(nextProducts[0] ?? null);
      setSelectedRoom(nextRooms[0] ?? null);
      setSelectedCollection(nextCollections[0] ?? null);
      setSelectedMaterial(nextMaterials[0] ?? null);
      setProductForm(productFormState(nextProducts[0]));
      setRoomForm(roomFormState(nextRooms[0]));
      setCollectionForm(collectionFormState(nextCollections[0]));
      setMaterialForm(materialFormState(nextMaterials[0]));
      setExpandedRooms(Object.fromEntries(nextRooms.map((room, index) => [room.slug, index === 0])));
      setExpandedCollections(Object.fromEntries(nextCollections.map((collection, index) => [collection.slug, index === 0])));
      setExpandedProductRooms(Object.fromEntries(nextRooms.map((room, index) => [room.slug, index === 0])));
      setExpandedProductTypes(Object.fromEntries(nextRooms.flatMap((room, roomIndex) => (
        (room.furnitureTypes ?? []).map((type) => [`${room.slug}:${type.slug}`, roomIndex === 0])
      ))));
    } catch (error) {
      if (error.status === 401) {
        window.location.href = '/auth';
        return;
      }

      notify(error.status === 403 ? 'Այս վահանակի համար անհրաժեշտ է ադմինի հասանելիություն։' : error.message, 'error', false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();

    return undefined;
  }, []);

  useEffect(() => {
    markTabNotificationsSeen(activeTab);
  }, [activeTab, latestNotificationTimes.orders, latestNotificationTimes.contacts, latestNotificationTimes.ai]);

  const uploadImage = async (file, setValue) => {
    notify('Նկարը վերբեռնվում է...', 'info', false);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const { url } = await api.uploadAdminImage({ filename: file.name, dataUrl });
      setValue(url);
      notify('Նկարը վերբեռնվեց։', 'success');
    } catch (error) {
      notifyError(error);
    }
  };

  const updateHomepageSlide = (index, field, value) => {
    setHomepageForm((current) => ({
      ...current,
      heroSlides: current.heroSlides.map((slide, slideIndex) => (slideIndex === index ? { ...slide, [field]: value } : slide)),
    }));
  };

  const addHomepageSlide = () => {
    setHomepageForm((current) => ({
      ...current,
      heroSlides: [...current.heroSlides, { title: '', subtitle: '', image: '' }],
    }));
  };

  const removeHomepageSlide = (index) => {
    setHomepageForm((current) => ({
      ...current,
      heroSlides: current.heroSlides.filter((_, slideIndex) => slideIndex !== index),
    }));
  };

  const toggleProductRoom = (roomSlug) => {
    setExpandedProductRooms((current) => ({ ...current, [roomSlug]: !current[roomSlug] }));
  };

  const toggleProductType = (roomSlug, typeSlug) => {
    const key = `${roomSlug}:${typeSlug}`;
    setExpandedProductTypes((current) => ({ ...current, [key]: !current[key] }));
  };

  const toggleRoom = (roomSlug) => {
    setExpandedRooms((current) => ({ ...current, [roomSlug]: !current[roomSlug] }));
  };

  const toggleCollection = (collectionSlug) => {
    setExpandedCollections((current) => ({ ...current, [collectionSlug]: !current[collectionSlug] }));
  };

  const updateProductSalePercent = (value) => {
    const percent = Number(value);
    setProductForm((current) => ({
      ...current,
      salePercent: value,
      saleIsActive: Number.isFinite(percent) && percent > 0 ? true : current.saleIsActive,
    }));
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    notify('Ապրանքը պահպանվում է...', 'info', false);

    try {
      if (selectedProduct) {
        const { product } = await api.updateAdminProduct(selectedProduct.slug, productForm);
        setProducts((current) => current.map((item) => (item.slug === product.slug ? product : item)));
        setSelectedProduct(product);
        setProductForm(productFormState(product));
      } else {
        const { product } = await api.createAdminProduct(productForm);
        setProducts((current) => [product, ...current]);
        setSelectedProduct(product);
        setProductForm(productFormState(product));
      }
      notify('Ապրանքը պահպանվեց։', 'success');
    } catch (error) {
      notifyError(error);
    }
  };

  const deleteProduct = async () => {
    if (!selectedProduct || !window.confirm(`Ջնջե՞լ ${selectedProduct.name} ապրանքը։`)) return;
    notify('Ապրանքը ջնջվում է...', 'info', false);
    try {
      await api.deleteAdminProduct(selectedProduct.slug);
      setProducts((current) => current.filter((product) => product.slug !== selectedProduct.slug));
      setSelectedProduct(null);
      setProductForm(productFormState());
      notify('Ապրանքը ջնջվեց։', 'success');
    } catch (error) {
      notifyError(error);
    }
  };

  const deleteProductReview = async (review) => {
    const reviewId = review?._id ?? review?.id;
    if (!selectedProduct || !reviewId) return;
    if (!window.confirm('Ջնջե՞լ այս կարծիքը։')) return;

    notify('Կարծիքը ջնջվում է...', 'info', false);
    try {
      const { product } = await api.deleteAdminProductReview(selectedProduct.slug, reviewId);
      setProducts((current) => current.map((item) => (item.slug === product.slug ? product : item)));
      setSelectedProduct(product);
      setProductForm(productFormState(product));
      notify('Կարծիքը ջնջվեց։', 'success');
    } catch (error) {
      notifyError(error);
    }
  };

  const saveRoom = async (event) => {
    event.preventDefault();
    notify('Սենյակը պահպանվում է...', 'info', false);

    try {
      if (selectedRoom) {
        const { room } = await api.updateAdminRoom(selectedRoom.slug, roomForm);
        setRooms((current) => current.map((item) => (item.slug === room.slug ? room : item)));
        setSelectedRoom(room);
        setRoomForm(roomFormState(room));
      } else {
        const { room } = await api.createAdminRoom(roomForm);
        setRooms((current) => [room, ...current]);
        setSelectedRoom(room);
        setRoomForm(roomFormState(room));
      }
      notify('Սենյակը պահպանվեց։', 'success');
    } catch (error) {
      notifyError(error);
    }
  };

  const deleteRoom = async () => {
    if (!selectedRoom || !window.confirm(`Ջնջե՞լ ${selectedRoom.name} սենյակը։`)) return;
    notify('Սենյակը ջնջվում է...', 'info', false);
    try {
      await api.deleteAdminRoom(selectedRoom.slug);
      setRooms((current) => current.filter((room) => room.slug !== selectedRoom.slug));
      setSelectedRoom(null);
      setRoomForm(roomFormState());
      notify('Սենյակը ջնջվեց։', 'success');
    } catch (error) {
      notifyError(error);
    }
  };

  const saveCollection = async (event) => {
    event.preventDefault();
    notify('Հավաքածուն պահպանվում է...', 'info', false);

    try {
      if (selectedCollection) {
        const { collection } = await api.updateAdminCollection(selectedCollection.slug, collectionForm);
        setCollections((current) => current.map((item) => (item.slug === collection.slug ? collection : item)));
        setSelectedCollection(collection);
        setCollectionForm(collectionFormState(collection));
      } else {
        const { collection } = await api.createAdminCollection(collectionForm);
        setCollections((current) => [collection, ...current]);
        setSelectedCollection(collection);
        setCollectionForm(collectionFormState(collection));
      }
      notify('Հավաքածուն պահպանվեց։', 'success');
    } catch (error) {
      notifyError(error);
    }
  };

  const deleteCollection = async () => {
    if (!selectedCollection || !window.confirm(`Ջնջե՞լ ${selectedCollection.title} հավաքածուն։`)) return;
    notify('Հավաքածուն ջնջվում է...', 'info', false);
    try {
      await api.deleteAdminCollection(selectedCollection.slug);
      setCollections((current) => current.filter((collection) => collection.slug !== selectedCollection.slug));
      setSelectedCollection(null);
      setCollectionForm(collectionFormState());
      notify('Հավաքածուն ջնջվեց։', 'success');
    } catch (error) {
      notifyError(error);
    }
  };

  const saveMaterial = async (event) => {
    event.preventDefault();
    notify('Նյութը պահպանվում է...', 'info', false);

    try {
      if (selectedMaterial) {
        const { material } = await api.updateAdminMaterial(selectedMaterial.id, materialForm);
        setMaterials((current) => current.map((item) => (item.id === material.id ? material : item)));
        setSelectedMaterial(material);
        setMaterialForm(materialFormState(material));
      } else {
        const { material } = await api.createAdminMaterial(materialForm);
        setMaterials((current) => [material, ...current]);
        setSelectedMaterial(material);
        setMaterialForm(materialFormState(material));
      }
      notify('Նյութը պահպանվեց։', 'success');
    } catch (error) {
      notifyError(error);
    }
  };

  const deleteMaterial = async () => {
    if (!selectedMaterial || !window.confirm(`Ջնջե՞լ ${selectedMaterial.name} նյութը։`)) return;
    notify('Նյութը ջնջվում է...', 'info', false);
    try {
      await api.deleteAdminMaterial(selectedMaterial.id);
      setMaterials((current) => current.filter((material) => material.id !== selectedMaterial.id));
      setSelectedMaterial(null);
      setMaterialForm(materialFormState());
      notify('Նյութը ջնջվեց։', 'success');
    } catch (error) {
      notifyError(error);
    }
  };

  const saveHomepage = async (event) => {
    event.preventDefault();
    notify('Գլխավոր էջը պահպանվում է...', 'info', false);

    try {
      const { page } = await api.updateAdminHomepage(homepageForm);
      setHomePage(page);
      setHomepageForm(homepageFormState(page));
      notify('Գլխավոր էջը պահպանվեց։', 'success');
    } catch (error) {
      notifyError(error);
    }
  };

  const updateOrderStatus = async (order, status) => {
    notify('Պատվերը թարմացվում է...', 'info', false);
    try {
      const { order: nextOrder } = await api.updateAdminOrder(order.source === 'guest' ? order.id : order.orderNumber, { status });
      setOrders((current) => current.map((item) => (item.id === nextOrder.id || item.orderNumber === nextOrder.orderNumber ? nextOrder : item)));
      notify('Պատվերը թարմացվեց։', 'success');
    } catch (error) {
      notifyError(error);
    }
  };

  const deleteOrder = async (order) => {
    if (!window.confirm(`Ջնջե՞լ ${order.orderNumber} պատվերը տվյալների բազայից։`)) return;

    notify('Պատվերը ջնջվում է...', 'info', false);
    try {
      await api.deleteAdminOrder(order.source === 'guest' ? order.id : order.orderNumber);
      setOrders((current) => current.filter((item) => !(item.id === order.id || item.orderNumber === order.orderNumber)));
      notify('Պատվերը ջնջվեց։', 'success');
    } catch (error) {
      notifyError(error);
    }
  };

  const updateUser = async (user, patch) => {
    notify('Օգտատերը թարմացվում է...', 'info', false);
    try {
      const { user: nextUser } = await api.updateAdminUser(user.id, patch);
      setUsers((current) => current.map((item) => (item.id === nextUser.id ? nextUser : item)));
      notify('Օգտատերը թարմացվեց։', 'success');
    } catch (error) {
      notifyError(error);
    }
  };

  const updateAiSettings = async (patch) => {
    notify('AI settings are updating...', 'info', false);
    try {
      const { settings } = await api.updateAdminAiSettings({ ...aiSettings, ...patch });
      setAiSettings(settings);
      notify('AI settings updated.', 'success');
    } catch (error) {
      notifyError(error);
    }
  };

  const activeSaveAction = {
    homepage: { formId: 'admin-homepage-form', label: 'Պահպանել գլխավոր էջը' },
    products: { formId: 'admin-product-form', label: selectedProduct ? 'Պահպանել ապրանքը' : 'Ստեղծել ապրանքը' },
    materials: { formId: 'admin-material-form', label: selectedMaterial ? 'Պահպանել նյութը' : 'Ստեղծել նյութը' },
    rooms: { formId: 'admin-room-form', label: selectedRoom ? 'Պահպանել սենյակը' : 'Ստեղծել սենյակը' },
    collections: { formId: 'admin-collection-form', label: selectedCollection ? 'Պահպանել հավաքածուն' : 'Ստեղծել հավաքածուն' },
  }[activeTab];

  if (isLoading) {
    return (
      <main className="admin-page">
        <section className="admin-shell">
          <p className="label-caps">Ադմին վահանակը բեռնվում է</p>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <aside className="admin-sidebar">
          <a className="admin-brand" href="/">
            <span>ARTWORK</span>
            <small>Ադմին</small>
          </a>
          <nav className="admin-tabs" aria-label="Ադմին նավիգացիա">
            {tabs.map((tab) => (
              <button className={activeTab === tab.id ? 'is-active' : ''} type="button" key={tab.id} onClick={() => setActiveTab(tab.id)}>
                <Icon name={tab.icon} />
                <span>{tab.label}</span>
                {notificationCounts[tab.id] ? <em className="admin-tab-badge">{notificationCounts[tab.id] > 99 ? '99+' : notificationCounts[tab.id]}</em> : null}
              </button>
            ))}
          </nav>
          <div className="admin-user-card">
            <span className="label-caps">Մուտք գործած</span>
            <strong>{currentUser?.fullName ?? 'Ադմին'}</strong>
            <small>{currentUser?.email}</small>
          </div>
        </aside>

        <div className="admin-workspace">
          <header className="admin-topbar">
            <div>
              <p className="label-caps">Խանութի կառավարում</p>
              <h1>Ադմին վահանակ</h1>
            </div>
            <div className="admin-topbar-actions">
              {activeSaveAction ? (
                <button className="admin-save" type="submit" form={activeSaveAction.formId}>
                  <Icon name="save" />
                  <span>{activeSaveAction.label}</span>
                </button>
              ) : null}
              <button className="admin-refresh" type="button" onClick={loadAdminData}>
                <Icon name="refresh" />
                <span>Թարմացնել</span>
              </button>
            </div>
          </header>

          {activeTab === 'overview' ? (
            <div className="admin-view">
              <div className="admin-metrics">
                <AdminMetric label="Ապրանքներ" value={overview?.metrics?.products} />
                <AdminMetric label="Ակտիվ" value={overview?.metrics?.activeProducts} />
                <AdminMetric label="Սենյակներ" value={overview?.metrics?.rooms} />
                <AdminMetric label="Հավաքածուներ" value={overview?.metrics?.collections} />
                <AdminMetric label="Օգտատերեր" value={overview?.metrics?.users} />
                <AdminMetric label="Պատվերներ" value={overview?.metrics?.orders} />
                <AdminMetric label="Կոնտակտներ" value={overview?.metrics?.contacts} />
              </div>
            </div>
          ) : null}

          {activeTab === 'homepage' ? (
            <AdminPanel title="Գլխավոր էջի սլայդեր" action={<button className="admin-add-button" type="button" onClick={addHomepageSlide}><Icon name="add" /><span>Ավելացնել սլայդ</span></button>}>
              <form className="admin-editor" id="admin-homepage-form" onSubmit={saveHomepage}>
                {homepageForm.heroSlides.map((slide, index) => (
                  <section className="admin-nested-item is-wide" key={`homepage-slide-${index}`}>
                    <div className="admin-nested-title">
                      <strong>Սլայդ {index + 1}</strong>
                      {homepageForm.heroSlides.length > 1 ? (
                        <button type="button" onClick={() => removeHomepageSlide(index)}>
                          <Icon name="delete" />
                        </button>
                      ) : null}
                    </div>
                    <div className="admin-nested-grid">
                      <label>
                        <span>Վերնագիր</span>
                        <input value={slide.title} onChange={(event) => updateHomepageSlide(index, 'title', event.target.value)} />
                      </label>
                      <label>
                        <span>Ենթավերնագիր</span>
                        <input value={slide.subtitle} onChange={(event) => updateHomepageSlide(index, 'subtitle', event.target.value)} />
                      </label>
                      <ImageField
                        label="Սլայդի նկար"
                        value={slide.image}
                        onChange={(value) => updateHomepageSlide(index, 'image', value)}
                        onUpload={uploadImage}
                      />
                    </div>
                  </section>
                ))}
              </form>
            </AdminPanel>
          ) : null}

          {activeTab === 'products' ? (
            <div className="admin-products-layout">
              <AdminPanel
                title="Ապրանքներ ըստ սենյակների"
                action={(
                  <label className="admin-search">
                    <Icon name="search" />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Որոնել ապրանքներ" />
                  </label>
                )}
              >
                <button className="admin-add-button" type="button" onClick={() => { setSelectedProduct(null); setProductForm(productFormState()); }}>
                  <Icon name="add" />
                  <span>Ավելացնել ապրանք</span>
                </button>
                <div className="admin-group-list">
                  {productsByRoom.map(({ room, products: roomProducts, typeSections }) => (
                    <section className="admin-tree-section" key={room.slug}>
                      <button className="admin-tree-header" type="button" onClick={() => toggleProductRoom(room.slug)}>
                        <Icon name={expandedProductRooms[room.slug] ? 'expand_more' : 'chevron_right'} />
                        <strong>{room.name}</strong>
                        <span>{roomProducts.length}</span>
                      </button>
                      <div className={`admin-tree-children ${expandedProductRooms[room.slug] ? 'is-open' : ''}`}>
                        {typeSections.map(({ type, products: typeProducts }) => {
                          const typeKey = `${room.slug}:${type.slug}`;
                          return (
                            <section className="admin-tree-section admin-tree-section-child" key={typeKey}>
                              <button className="admin-tree-header admin-tree-header-child" type="button" onClick={() => toggleProductType(room.slug, type.slug)}>
                                <Icon name={expandedProductTypes[typeKey] ? 'expand_more' : 'chevron_right'} />
                                <strong>{type.title || type.slug}</strong>
                                <span>{typeProducts.length}</span>
                              </button>
                              <div className={`admin-tree-children ${expandedProductTypes[typeKey] ? 'is-open' : ''}`}>
                                <div className="admin-table admin-products-table">
                                  {typeProducts.map((product) => (
                                    <button className={selectedProduct?.slug === (product.slug ?? product.productSlug) ? 'is-selected' : ''} type="button" key={product.slug ?? product.productSlug} onClick={() => { const editableProduct = productsBySlug.get(product.slug ?? product.productSlug) ?? product; setSelectedProduct(editableProduct); setProductForm(productFormState(editableProduct)); }}>
                                      <img src={product.image} alt={product.name} />
                                      <span>{product.name}</span>
                                      <small>{product.sku ?? product.slug}</small>
                                      <small>{Number(product.views ?? 0).toLocaleString('hy-AM')} դիտում</small>
                                      <em>{product.isActive === false ? 'Թաքնված' : 'Ակտիվ'}</em>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </section>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </AdminPanel>

              <AdminPanel
                title={selectedProduct ? `Խմբագրել ${selectedProduct.name}` : 'Ավելացնել ապրանք'}
                action={selectedProduct ? <button className="admin-danger" type="button" onClick={deleteProduct}>Ջնջել</button> : null}
              >
                <form className="admin-editor" id="admin-product-form" onSubmit={saveProduct}>
                  <AdminEditorInput label="Slug" value={productForm.slug} onChange={(value) => setProductForm((current) => ({ ...current, slug: value }))} />
                  <AdminEditorInput label="Անուն" value={productForm.name} onChange={(value) => setProductForm((current) => ({ ...current, name: value }))} />
                  <AdminEditorInput label="SKU" value={productForm.sku} onChange={(value) => setProductForm((current) => ({ ...current, sku: value }))} />
                  <AdminEditorInput label="Նշում" value={productForm.badge} onChange={(value) => setProductForm((current) => ({ ...current, badge: value }))} />
                  <AdminEditorTextarea label="Նկարագրություն" value={productForm.description} onChange={(value) => setProductForm((current) => ({ ...current, description: value }))} />
                  <AdminEditorTextarea label="Չափեր" value={productForm.dimensionsText} onChange={(value) => setProductForm((current) => ({ ...current, dimensionsText: value }))} />
                  <AdminEditorInput label="Սկզբնական գին" type="number" value={productForm.priceAmount} onChange={(value) => setProductForm((current) => ({ ...current, priceAmount: value }))} />
                  <AdminEditorInput label="Զեղչի տոկոս" type="number" value={productForm.salePercent} onChange={updateProductSalePercent} />
                  <ProductPlacementEditor rooms={rooms} form={productForm} setForm={setProductForm} />
                  <ProductPhotoManager form={productForm} setForm={setProductForm} onUpload={uploadImage} />
                  <AdminEditorInput label="Հեշթեգներ" value={productForm.hashtags} onChange={(value) => setProductForm((current) => ({ ...current, hashtags: value }))} />
                  <div className="admin-checks">
                    <label><input type="checkbox" checked={productForm.saleIsActive} onChange={(event) => setProductForm((current) => ({ ...current, saleIsActive: event.target.checked }))} /> Զեղչը ակտիվ է</label>
                  </div>
                </form>
                {selectedProduct ? (
                  <section className="admin-product-reviews">
                    <div className="admin-product-reviews-heading">
                      <span className="label-caps">Կարծիքներ</span>
                      <strong>{selectedProduct.reviews?.length ?? 0}</strong>
                    </div>
                    {selectedProduct.reviews?.length ? selectedProduct.reviews.map((review, index) => (
                      <article className="admin-product-review" key={review._id ?? review.id ?? `${selectedProduct.slug}-review-${index}`}>
                        <div>
                          <strong>{review.username ?? review.name ?? 'Հաճախորդ'}</strong>
                          <span>{Number(review.rate ?? 0).toLocaleString('hy-AM')} / 5</span>
                        </div>
                        <p>{review.review ?? review.text}</p>
                        {review.images?.length ? (
                          <div className="admin-contact-images">
                            {review.images.map((image, imageIndex) => (
                              <a href={image} target="_blank" rel="noreferrer" aria-label={`Բացել կարծիքի նկար ${imageIndex + 1}`} key={`${review._id ?? index}-${imageIndex}`}>
                                <img src={image} alt={`Կարծիքի նկար ${imageIndex + 1}`} />
                              </a>
                            ))}
                          </div>
                        ) : null}
                        <button className="admin-danger" type="button" onClick={() => deleteProductReview(review)}>Ջնջել կարծիքը</button>
                      </article>
                    )) : <p className="admin-muted-text">Այս ապրանքի համար կարծիքներ դեռ չկան։</p>}
                  </section>
                ) : null}
              </AdminPanel>
            </div>
          ) : null}

          {activeTab === 'materials' ? (
            <div className="admin-products-layout">
              <AdminPanel title="Նյութեր" action={<button className="admin-add-button" type="button" onClick={() => { setSelectedMaterial(null); setMaterialForm(materialFormState()); }}><Icon name="add" /><span>Ավելացնել նյութ</span></button>}>
                <div className="admin-list-table">
                  {materials.map((material) => (
                    <button className={`admin-material-row ${selectedMaterial?.id === material.id ? 'is-selected' : ''}`} type="button" key={material.id} onClick={() => { setSelectedMaterial(material); setMaterialForm(materialFormState(material)); }}>
                      <span className="admin-material-swatch" style={{ background: material.image ? `url(${material.image}) center / cover` : material.color }} />
                      <strong>{material.name}</strong>
                      <small>{material.image ? 'Նկար' : 'Գույն'}</small>
                    </button>
                  ))}
                </div>
              </AdminPanel>

              <AdminPanel title={selectedMaterial ? `Խմբագրել ${selectedMaterial.name}` : 'Ավելացնել նյութ'} action={selectedMaterial ? <button className="admin-danger" type="button" onClick={deleteMaterial}>Ջնջել</button> : null}>
                <form className="admin-editor" id="admin-material-form" onSubmit={saveMaterial}>
                  <AdminEditorInput label="Նյութի անուն" value={materialForm.name} onChange={(value) => setMaterialForm((current) => ({ ...current, name: value }))} />
                  <label className="admin-image-field is-wide">
                    <span>Նյութի նկար</span>
                    {materialForm.image ? <img className="admin-image-preview" src={materialForm.image} alt="" /> : <span className="admin-image-preview admin-image-preview-placeholder">Նկար չկա</span>}
                    <div>
                      <input value={materialForm.image} onChange={(event) => setMaterialForm((current) => ({ ...current, image: event.target.value }))} placeholder="Նկարի URL" />
                      <label className="admin-upload-button">
                        <Icon name="upload" />
                        <input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadImage(file, (url) => setMaterialForm((current) => ({ ...current, image: url }))); }} />
                      </label>
                    </div>
                  </label>
                  <label>
                    <span>Նյութի գույն</span>
                    <input type="color" value={materialForm.color} onChange={(event) => setMaterialForm((current) => ({ ...current, color: event.target.value }))} />
                  </label>
                </form>
              </AdminPanel>
            </div>
          ) : null}

          {activeTab === 'rooms' ? (
            <div className="admin-products-layout">
              <AdminPanel title="Սենյակներ" action={<button className="admin-add-button" type="button" onClick={() => { setSelectedRoom(null); setRoomForm(roomFormState()); }}><Icon name="add" /><span>Ավելացնել սենյակ</span></button>}>
                <div className="admin-list-table">
                  {rooms.map((room) => (
                    <section className={`admin-tree-card ${selectedRoom?.slug === room.slug ? 'is-selected' : ''}`} key={room.slug}>
                      <div className="admin-resource-row">
                        <button className="admin-tree-toggle" type="button" onClick={() => toggleRoom(room.slug)}>
                          <Icon name={expandedRooms[room.slug] ? 'expand_more' : 'chevron_right'} />
                        </button>
                        <button className="admin-resource-main" type="button" onClick={() => { setSelectedRoom(room); setRoomForm(roomFormState(room)); }}>
                          <img src={room.image} alt={room.name} />
                          <strong>{room.name}</strong>
                          <span>{room.slug}</span>
                        </button>
                      </div>
                      <div className={`admin-tree-children ${expandedRooms[room.slug] ? 'is-open' : ''}`}>
                        {(room.furnitureTypes ?? []).map((type) => (
                          <button className="admin-child-row" type="button" key={`${room.slug}-${type.slug}`} onClick={() => { setSelectedRoom(room); setRoomForm(roomFormState(room)); }}>
                            <Icon name="subdirectory_arrow_right" />
                            <span>{type.title || type.slug}</span>
                            <small>{type.slug}</small>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </AdminPanel>
              <AdminPanel title={selectedRoom ? `Խմբագրել ${selectedRoom.name}` : 'Ավելացնել սենյակ'} action={selectedRoom ? <button className="admin-danger" type="button" onClick={deleteRoom}>Ջնջել</button> : null}>
                <form className="admin-editor" id="admin-room-form" onSubmit={saveRoom}>
                  <AdminEditorInput label="Սենյակի slug" value={roomForm.slug} onChange={(value) => setRoomForm((current) => ({ ...current, slug: value }))} />
                  <AdminEditorInput label="Սենյակի անուն" value={roomForm.name} onChange={(value) => setRoomForm((current) => ({ ...current, name: value }))} />
                  <AdminEditorInput label="Փոքր վերնագիր" value={roomForm.eyebrow} onChange={(value) => setRoomForm((current) => ({ ...current, eyebrow: value }))} />
                  <AdminEditorInput label="Էջի վերնագիր" value={roomForm.title} onChange={(value) => setRoomForm((current) => ({ ...current, title: value }))} />
                  <AdminEditorTextarea label="Նկարագրություն" value={roomForm.description} onChange={(value) => setRoomForm((current) => ({ ...current, description: value }))} />
                  <ImageField label="Սենյակի նկար" value={roomForm.image} onChange={(value) => setRoomForm((current) => ({ ...current, image: value }))} onUpload={uploadImage} />
                  <FurnitureTypesEditor value={roomForm.furnitureTypes} onChange={(value) => setRoomForm((current) => ({ ...current, furnitureTypes: value }))} onUpload={uploadImage} />
                </form>
              </AdminPanel>
            </div>
          ) : null}

          {activeTab === 'collections' ? (
            <div className="admin-products-layout">
              <AdminPanel title="Հավաքածուներ" action={<button className="admin-add-button" type="button" onClick={() => { setSelectedCollection(null); setCollectionForm(collectionFormState()); }}><Icon name="add" /><span>Ավելացնել հավաքածու</span></button>}>
                <div className="admin-list-table">
                  {collections.map((collection) => (
                    <section className={`admin-tree-card ${selectedCollection?.slug === collection.slug ? 'is-selected' : ''}`} key={collection.slug}>
                      <div className="admin-resource-row">
                        <button className="admin-tree-toggle" type="button" onClick={() => toggleCollection(collection.slug)}>
                          <Icon name={expandedCollections[collection.slug] ? 'expand_more' : 'chevron_right'} />
                        </button>
                        <button className="admin-resource-main" type="button" onClick={() => { setSelectedCollection(collection); setCollectionForm(collectionFormState(collection)); }}>
                          <img src={collection.heroImage ?? collection.image} alt={collection.title} />
                          <strong>{collection.title}</strong>
                          <span>{collection.slug}</span>
                        </button>
                      </div>
                      <div className={`admin-tree-children ${expandedCollections[collection.slug] ? 'is-open' : ''}`}>
                        {(collection.productSlugs ?? []).map((productSlug) => {
                          const product = productsBySlug.get(productSlug);
                          return (
                            <button
                              className="admin-child-row"
                              type="button"
                              key={`${collection.slug}-${productSlug}`}
                              onClick={() => {
                                if (product) {
                                  setActiveTab('products');
                                  setSelectedProduct(product);
                                  setProductForm(productFormState(product));
                                }
                              }}
                            >
                              <Icon name="inventory_2" />
                              <span>{product?.name ?? productSlug}</span>
                              <small>{productSlug}</small>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </AdminPanel>
              <AdminPanel title={selectedCollection ? `Խմբագրել ${selectedCollection.title}` : 'Ավելացնել հավաքածու'} action={selectedCollection ? <button className="admin-danger" type="button" onClick={deleteCollection}>Ջնջել</button> : null}>
                <form className="admin-editor" id="admin-collection-form" onSubmit={saveCollection}>
                  {['slug', 'title', 'subtitle'].map((field) => (
                    <AdminEditorInput key={field} label={collectionFieldLabels[field] ?? field} value={collectionForm[field]} onChange={(value) => setCollectionForm((current) => ({ ...current, [field]: value }))} />
                  ))}
                  <AdminEditorInput label="Հավաքածուի գին" type="number" value={collectionForm.priceAmount} onChange={(value) => setCollectionForm((current) => ({ ...current, priceAmount: value }))} />
                  <AdminEditorTextarea label="Նկարագրություն" value={collectionForm.description} onChange={(value) => setCollectionForm((current) => ({ ...current, description: value }))} />
                  <AdminEditorTextarea label="Մանրամասն նկարագրություն" value={collectionForm.detailDescription} onChange={(value) => setCollectionForm((current) => ({ ...current, detailDescription: value }))} />
                  <ImageField label="Գլխավոր նկար" value={collectionForm.heroImage} onChange={(value) => setCollectionForm((current) => ({ ...current, heroImage: value }))} onUpload={uploadImage} />
                  <CollectionProductPicker products={products} selectedSlugs={collectionForm.productSlugs} onChange={(value) => setCollectionForm((current) => ({ ...current, productSlugs: value }))} />
                </form>
              </AdminPanel>
            </div>
          ) : null}

          {activeTab === 'orders' ? (
            <AdminPanel
              title="Պատվերներ"
              action={(
                <select className="admin-status-filter" value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)}>
                  <option value="all">Բոլոր պատվերները</option>
                  {orderStatuses.map((status) => <option value={status} key={status}>{orderStatusLabels[status]}</option>)}
                </select>
              )}
            >
              <div className="admin-list-table admin-orders-list">
                {filteredOrders.map((order) => (
                  <article className={`admin-order-card order-status-${order.status}`} key={`${order.source}-${order.id ?? order.orderNumber}`}>
                    <div className="admin-order-main">
                      <div>
                        <p className="label-caps">{order.source === 'account' ? 'Հաշվով պատվեր' : 'Հյուրի պատվեր'} - {formatDate(order.createdAt)}</p>
                        <h3>{order.orderNumber}</h3>
                      </div>
                      <div className="admin-order-actions">
                        <select className={`order-status-select order-status-${order.status}`} value={order.status} onChange={(event) => updateOrderStatus(order, event.target.value)}>
                          {orderStatuses.map((status) => <option value={status} key={status}>{orderStatusLabels[status]}</option>)}
                        </select>
                        <button className="admin-danger" type="button" onClick={() => deleteOrder(order)}>
                          <Icon name="delete" />
                          <span>Ջնջել</span>
                        </button>
                      </div>
                    </div>

                    <div className="admin-order-details">
                      <div>
                        <span className="label-caps">Հաճախորդ</span>
                        <strong>{order.customer?.name ?? order.account?.fullName ?? 'Հաճախորդ'}</strong>
                        <small>{order.customer?.phone ?? 'Հեռախոս չկա'}</small>
                        <small>{order.customer?.email ?? order.account?.email ?? 'Էլ․ հասցե չկա'}</small>
                        {order.shippingAddress ? <small>{order.shippingAddress}</small> : null}
                        {order.notes ? <p>{order.notes}</p> : null}
                      </div>

                      <div className="admin-order-products">
                        <span className="label-caps">Ապրանքներ</span>
                        {(order.items ?? []).map((item) => (
                          <div className="admin-order-product" key={`${order.orderNumber}-${item.productSlug ?? item.collectionSlug ?? item.name}`}>
                            {item.image ? <img src={item.image} alt={item.name} /> : null}
                            <div>
                              <strong>{item.name}</strong>
                              <small>{item.itemType === 'collection' ? 'Հավաքածու' : item.productSku ?? item.productSlug}</small>
                            </div>
                            <span>x{item.quantity ?? 1}</span>
                            <em>{formatAmdPrice(getOrderItemPrice(item))}</em>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="admin-order-total">
                      <span className="label-caps">Ընդհանուր</span>
                      <strong>{formatAmdPrice(order.pricing?.subtotal ?? getOrderSubtotal(order))}</strong>
                    </div>
                  </article>
                ))}
                {!filteredOrders.length ? <p>Այս ֆիլտրով պատվերներ չկան։</p> : null}
              </div>
            </AdminPanel>
          ) : null}

          {activeTab === 'contacts' ? (
            <AdminPanel title="Հաճախորդների կոնտակտներ">
              <div className="admin-list-table admin-orders-list">
                {contacts.length ? contacts.map((contact) => (
                  <article className="admin-order-card" key={contact.id}>
                    <div className="admin-order-main">
                      <div>
                        <p className="label-caps">{contact.subject ?? 'Կոնտակտ'} - {formatDate(contact.createdAt)}</p>
                        <h3>{contact.fullName}</h3>
                      </div>
                      <span className="label-caps">{contactStatusLabels[contact.status] ?? contact.status ?? 'Նոր'}</span>
                    </div>

                    <div className="admin-order-details">
                      <div>
                        <span className="label-caps">Հաճախորդ</span>
                        <strong>{contact.fullName}</strong>
                        <small>{contact.phone}</small>
                        <small>{contact.email}</small>
                      </div>

                      <div>
                        <span className="label-caps">Հաղորդագրություն</span>
                        <p>{contact.message}</p>
                        {contact.images?.length ? (
                          <div className="admin-contact-images">
                            {contact.images.map((image, index) => (
                              <a href={image} target="_blank" rel="noreferrer" aria-label={`Բացել կցված նկար ${index + 1}`} key={`${contact.id}-image-${index}`}>
                                <img src={image} alt={`Կցված նկար ${index + 1}`} />
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                )) : <p>Կոնտակտային հաղորդագրություններ դեռ չկան։</p>}
              </div>
            </AdminPanel>
          ) : null}

          {activeTab === 'ai' ? (
            <div className="admin-view">
              <div className="admin-metrics">
                <AdminMetric label="AI գեներացում" value={aiSettings?.enabled ? 'Միաց.' : 'Անջ.'} />
                <AdminMetric label="OpenAI բանալի" value={aiSettings?.apiKeyConfigured ? 'Կա' : 'Չկա'} />
                <AdminMetric label="Մոդել" value={aiSettings?.model ?? 'gpt-image-1'} />
                <AdminMetric label="Ընդմիջում" value={`${aiSettings?.cooldownHours ?? 5} ժ`} />
              </div>

              <AdminPanel title="AI սենյակի նախադիտման կարգավորումներ">
                <div className="admin-list-table">
                  <div className="admin-list-row">
                    <strong>Կայքի նկարի գեներացում</strong>
                    <span>{aiSettings?.enabled ? 'Հաճախորդները կարող են օգտագործել «Տեսնել իմ սենյակում» գործիքը' : 'Կոճակը թաքցված է ապրանքի էջերում'}</span>
                    <select value={aiSettings?.enabled ? 'enabled' : 'disabled'} onChange={(event) => updateAiSettings({ enabled: event.target.value === 'enabled' })}>
                      <option value="enabled">Միացված</option>
                      <option value="disabled">Անջատված</option>
                    </select>
                  </div>
                  <div className="admin-list-row">
                    <strong>Գեներացման ընդմիջում</strong>
                    <span>Քանի ժամ պետք է սպասի յուրաքանչյուր օգտատեր կամ հյուր հաջող գեներացումից հետո</span>
                    <input
                      min="0"
                      max="168"
                      step="0.5"
                      type="number"
                      defaultValue={aiSettings?.cooldownHours ?? 5}
                      onBlur={(event) => updateAiSettings({ cooldownHours: Number(event.target.value) })}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.currentTarget.blur();
                        }
                      }}
                    />
                  </div>
                  <div className="admin-list-row">
                    <strong>Վճարումների ամփոփում</strong>
                    <span>OpenAI վահանակը կբացվի նոր ներդիրում</span>
                    <a className="admin-refresh" href={aiSettings?.billingLinks?.overview ?? 'https://platform.openai.com/settings/organization/billing/overview'} target="_blank" rel="noreferrer">Բացել վճարումները</a>
                  </div>
                  <div className="admin-list-row">
                    <strong>Օգտագործման սահմանաչափեր</strong>
                    <span>Դիտել հիմնական, արագության եւ նախագծի սահմանաչափերը</span>
                    <a className="admin-refresh" href={aiSettings?.billingLinks?.limits ?? 'https://platform.openai.com/settings/organization/limits'} target="_blank" rel="noreferrer">Բացել սահմանաչափերը</a>
                  </div>
                  <div className="admin-list-row">
                    <strong>Օգտագործում</strong>
                    <span>Հետեւել ծախսերին եւ հարցումների օգտագործմանը</span>
                    <a className="admin-refresh" href={aiSettings?.billingLinks?.usage ?? 'https://platform.openai.com/usage'} target="_blank" rel="noreferrer">Բացել օգտագործումը</a>
                  </div>
                </div>
              </AdminPanel>

              <AdminPanel title="OpenAI վերջին սխալը">
                {aiSettings?.lastError ? (
                  <article className="admin-status is-error">
                    <strong>{aiSettings.lastError.status}</strong>
                    <span>{aiSettings.lastError.message}</span>
                    <small>{aiSettings.lastError.at ? new Date(aiSettings.lastError.at).toLocaleString() : ''}</small>
                  </article>
                ) : (
                  <p>OpenAI սխալներ դեռ չեն գրանցվել։</p>
                )}
              </AdminPanel>
            </div>
          ) : null}

          {activeTab === 'users' ? (
            <AdminPanel title="Օգտատերեր">
              <div className="admin-list-table">
                {users.map((user) => (
                  <div className="admin-list-row" key={user.id}>
                    <strong>{user.fullName}</strong>
                    <span>{user.email}</span>
                    <select value={user.role} onChange={(event) => updateUser(user, { role: event.target.value })}>
                      {userRoles.map((role) => <option value={role} key={role}>{userRoleLabels[role] ?? role}</option>)}
                    </select>
                    <select value={user.status} onChange={(event) => updateUser(user, { status: event.target.value })}>
                      {userStatuses.map((status) => <option value={status} key={status}>{userStatusLabels[status] ?? status}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </AdminPanel>
          ) : null}
        </div>
      </section>
    </main>
  );
}

