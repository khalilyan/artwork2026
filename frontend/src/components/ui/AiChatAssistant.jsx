import { useEffect, useMemo, useRef, useState } from 'react';
import { addGuestCartItem, api, isAuthorized } from '../../services/api.js';
import { formatAmdPrice, getPriceAmount } from '../../utils/currency.js';
import { collections as fallbackCollections } from '../../data/collections.js';
import { products as fallbackProducts } from '../../data/products.js';
import { rooms as fallbackRooms } from '../../data/shopByRooms.js';
import Icon from './Icon.jsx';
import { showArtworkNotification } from './ToastNotifications.jsx';

const maxRecommendationCount = 3;
const shopContact = {
  phone: '+374 98 871555',
  phoneHref: 'tel:+37498871555',
  email: 'artworkarmenia@gmail.com',
  emailHref: 'mailto:artworkarmenia@gmail.com',
  contactHref: '/contact',
};

const quickPrompts = [
  'Օգնիր ընտրել սենյակի համար',
  'Ցույց տուր ամենաէժան ապրանքը',
  'Ո՞րն է ամենավաճառվողը',
  'Կապի տվյալներ',
];

const categoryHints = [
  { keys: ['բազմոց', 'sofa', 'couch'], terms: ['sofa', 'sofas', 'couch', 'բազմոց'] },
  { keys: ['աթոռ', 'բազկաթոռ', 'chair', 'lounge'], terms: ['chair', 'chairs', 'seating', 'lounge', 'աթոռ', 'բազկաթոռ'] },
  { keys: ['սեղան', 'table'], terms: ['table', 'tables', 'սեղան'] },
  { keys: ['լամպ', 'լույս', 'լուսավորություն', 'lamp', 'light', 'lighting'], terms: ['lamp', 'light', 'lighting', 'լամպ', 'լուսավորություն'] },
  { keys: ['պահարան', 'դարակ', 'cabinet', 'storage'], terms: ['cabinet', 'storage', 'պահարան', 'դարակ'] },
  { keys: ['մահճակալ', 'մահճակալներ', 'bed', 'beds'], terms: ['bed', 'beds', 'մահճակալ'] },
];

const roomHints = [
  { keys: ['հյուրասենյակ', 'living'], value: 'living-room' },
  { keys: ['ննջասենյակ', 'bedroom'], value: 'bedroom' },
  { keys: ['ճաշասենյակ', 'dining'], value: 'dining-room' },
  { keys: ['խոհանոց', 'kitchen'], value: 'kitchen' },
  { keys: ['մուտք', 'նախասրահ', 'լոբբի', 'lobby'], value: 'lobby' },
  { keys: ['աշխատասենյակ', 'office'], value: 'office' },
];

const defaultAssistantMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Բարեւ, ես ARTWORK-ի AI օգնականն եմ։ Կարող եմ օգնել ընտրել կահույք, համեմատել գները եւ արագ ավելացնել ընտրված ապրանքը զամբյուղ։ Ի՞նչ տարածքի կամ ոճի համար եք փնտրում։',
};

function normalizeText(value) {
  return String(value ?? '').toLowerCase().trim();
}

function productSearchText(product) {
  return normalizeText([
    product.name,
    product.slug,
    product.id,
    product.sku,
    product.description,
    product.type,
    product.categorySlug,
    product.group,
    ...(product.roomSlugs ?? []),
    ...(product.hashtags ?? []),
  ].filter(Boolean).join(' '));
}

function productPrice(product) {
  return getPriceAmount(product.price?.amount, product.priceAmount, product.price, product.oldPrice?.amount);
}

function productImage(product) {
  return product.image ?? product.gallery?.[0] ?? product.images?.primary ?? product.images?.gallery?.[0] ?? '';
}

function productHref(product) {
  const roomSlug = product.roomSlugs?.[0] ?? product.roomSlug ?? 'living-room';
  const categorySlug = product.categorySlug ?? product.type ?? 'seating';
  return `/rooms/${roomSlug}/${categorySlug}/${product.id}`;
}

function normalizeRooms(rooms) {
  return (rooms ?? []).map((room, index) => ({
    ...room,
    slug: room.slug ?? `room-${index + 1}`,
    roomName: room.roomName ?? room.name ?? room.title ?? `Սենյակ ${index + 1}`,
    categories: room.categories ?? room.furnitureTypes ?? [],
  }));
}

function getRoomLabel(room) {
  return room?.roomName ?? room?.name ?? room?.title ?? room?.slug ?? 'սենյակ';
}

function getCategoryLabel(category) {
  return category?.title ?? category?.name ?? category?.label ?? category?.slug ?? 'կահույք';
}

function inferRoomFromMessage(message, rooms) {
  const text = normalizeText(message);
  const hintedSlug = roomHints.find((hint) => hint.keys.some((key) => text.includes(key)))?.value;
  const roomByHint = hintedSlug ? rooms.find((room) => room.slug === hintedSlug) : null;
  if (roomByHint) return roomByHint;

  return rooms.find((room) => [
    room.slug,
    room.name,
    room.roomName,
    room.title,
  ].filter(Boolean).some((value) => text.includes(normalizeText(value)))) ?? null;
}

function inferCategoryFromMessage(message, categories = []) {
  const text = normalizeText(message);
  const categoryByCatalog = categories.find((category) => [
    category.slug,
    category.title,
    category.name,
    category.label,
  ].filter(Boolean).some((value) => text.includes(normalizeText(value))));

  if (categoryByCatalog) return categoryByCatalog;

  const categoryHint = categoryHints.find((hint) => hint.keys.some((key) => text.includes(key)));
  if (!categoryHint) return null;

  return categories.find((category) => {
    const categoryText = normalizeText([category.slug, category.title, category.name, category.label].filter(Boolean).join(' '));
    return categoryHint.terms.some((term) => categoryText.includes(term));
  }) ?? null;
}

function shuffleProducts(products) {
  return [...products]
    .map((product) => ({ product, order: Math.random() }))
    .sort((first, second) => first.order - second.order)
    .map(({ product }) => product);
}

function getRoomCategoryProducts(products, roomSlug, categorySlug) {
  return products.filter((product) => {
    const productRooms = product.roomSlugs ?? [];
    const matchesRoom = roomSlug ? productRooms.includes(roomSlug) : true;
    const matchesCategory = categorySlug
      ? [product.categorySlug, product.type, product.group].filter(Boolean).includes(categorySlug)
      : true;

    return product?.id && product.name && matchesRoom && matchesCategory;
  });
}

function createFurnitureTypeOptions(room) {
  return (room?.categories ?? []).map((category) => ({
    label: getCategoryLabel(category),
    value: category.slug,
    roomSlug: room.slug,
    categorySlug: category.slug,
  })).filter((option) => option.categorySlug);
}

function createRoomOptions(rooms) {
  return rooms.map((room) => ({
    label: getRoomLabel(room),
    value: room.slug,
    roomSlug: room.slug,
  }));
}

function getSearchProfile(message) {
  const text = normalizeText(message);
  const categoryHint = categoryHints.find((hint) => hint.keys.some((key) => text.includes(key)));
  const room = roomHints.find((hint) => hint.keys.some((key) => text.includes(key)))?.value ?? '';
  const wantsContact = ['կապ հաստատ', 'կապի տվյալ', 'հեռախոս', 'էլ․ հասցե', 'էլ. հասցե', 'email', 'e-mail', 'contact', 'phone', 'call'].some((key) => text.includes(key));
  const wantsBudget = ['ամենաէժան', 'էժան', 'մատչելի', 'ցածր գին', 'budget', 'cheap', 'cheapest', 'low price'].some((key) => text.includes(key));
  const wantsPremium = ['ամենաթանկ', 'պրեմիում', 'լյուքս', 'թանկ', 'premium', 'luxury', 'expensive'].some((key) => text.includes(key));
  const wantsBestSeller = ['ամենավաճառվող', 'բեսթսելլեր', 'լավագույն վաճառք', 'հայտնի', 'պոպուլյար', 'best seller', 'bestseller', 'popular', 'most viewed'].some((key) => text.includes(key));
  const wantsNewest = ['նոր', 'նորույթ', 'վերջին', 'new', 'newest', 'latest'].some((key) => text.includes(key));
  const wantsSale = ['զեղչ', 'ակցիա', 'sale', 'discount', 'off'].some((key) => text.includes(key));
  const wantsCollection = ['հավաքածու', 'collection', 'set'].some((key) => text.includes(key));
  const wantsOrder = ['պատվիր', 'պատվեր', 'գնել', 'առնել', 'order', 'buy'].some((key) => text.includes(key));

  return {
    categoryTerms: categoryHint?.terms ?? [],
    room,
    text,
    wantsBestSeller,
    wantsBudget,
    wantsCollection,
    wantsContact,
    wantsNewest,
    wantsOrder,
    wantsPremium,
    wantsSale,
  };
}

function scoreProduct(product, profile) {
  const haystack = productSearchText(product);

  let score = 0;
  if (profile.categoryTerms.some((term) => haystack.includes(term))) score += 7;
  if (profile.room && (product.roomSlugs ?? []).includes(profile.room)) score += 5;
  if (profile.text && haystack.includes(profile.text)) score += 4;
  if (normalizeText(product.name).includes(profile.text)) score += 6;
  if (product.badge) score += 1;
  if (Number(product.views) > 0) score += Math.min(3, Number(product.views) / 1000);
  if (profile.wantsSale && (product.oldPrice || product.oldPriceAmount || product.sale?.isActive)) score += 8;

  return score;
}

function findDirectProductMatches(products, profile) {
  const text = profile.text;
  if (!text) return [];

  const meaningfulWords = text
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}-]/gu, ''))
    .filter((word) => word.length > 2 && !['ուզում', 'ցույց', 'տուր', 'կա', 'ունեք', 'համար', 'want', 'show', 'have'].includes(word));

  return products.filter((product) => {
    const name = normalizeText(product.name);
    const slug = normalizeText(product.slug ?? product.id).replaceAll('-', ' ');
    const haystack = productSearchText(product);

    return name.includes(text)
      || slug.includes(text)
      || profile.categoryTerms.some((term) => haystack.includes(term))
      || meaningfulWords.some((word) => name.includes(word) || slug.includes(word));
  });
}

function newestTime(product) {
  return new Date(product.createdAt ?? product.updatedAt ?? 0).getTime() || 0;
}

function bestSellerScore(product) {
  return Number(product.views ?? 0)
    + Number(product.reviewCount ?? product.reviews?.length ?? 0) * 40
    + Number(product.averageRating ?? 0) * 20
    + (product.badge ? 8 : 0);
}

function getRecommendations(products, profile) {
  const directMatches = findDirectProductMatches(products, profile);
  if (profile.categoryTerms.length && !directMatches.length) return [];

  const candidateProducts = directMatches.length ? directMatches : products;
  const saleProducts = candidateProducts.filter((product) => product.oldPrice || product.oldPriceAmount || product.sale?.isActive);
  const activeProducts = profile.wantsSale && saleProducts.length ? saleProducts : candidateProducts;

  const sortedProducts = [...activeProducts]
    .filter((product) => product?.id && product.name)
    .sort((first, second) => {
      if (profile.wantsBudget) return productPrice(first) - productPrice(second);
      if (profile.wantsPremium) return productPrice(second) - productPrice(first);
      if (profile.wantsBestSeller) return bestSellerScore(second) - bestSellerScore(first);
      if (profile.wantsNewest) return newestTime(second) - newestTime(first);
      return scoreProduct(second, profile) - scoreProduct(first, profile) || productPrice(first) - productPrice(second);
    });

  return sortedProducts.slice(0, maxRecommendationCount);
}

function contactReply() {
  return {
    text: `ARTWORK-ի հետ կարող եք կապ հաստատել այսպես՝ հեռախոս ${shopContact.phone}, էլ․ հասցե ${shopContact.email}։ Կարող եք նաեւ բացել «Կապ» էջը եւ ուղարկել հարցում՝ ${shopContact.contactHref}`,
    recommendations: [],
    contact: true,
  };
}

function buildAssistantReply(message, products, collections, rooms) {
  const profile = getSearchProfile(message);
  const recommendations = getRecommendations(products, profile);
  const collection = collections[0];
  const hasDirectMatches = findDirectProductMatches(products, profile).length > 0;
  const room = inferRoomFromMessage(message, rooms);
  const asksRoomHelp = room || ['սենյակ', 'տարածք', 'room'].some((key) => profile.text.includes(key));

  if (profile.wantsContact) {
    return contactReply();
  }

  if (asksRoomHelp && !profile.categoryTerms.length) {
    if (!room) {
      return {
        text: 'Ո՞ր սենյակի համար եք փնտրում կահույք։ Ընտրեք սենյակը, հետո կառաջարկեմ կահույքի տեսակները։',
        recommendations: [],
        roomOptions: createRoomOptions(rooms),
      };
    }

    const options = createFurnitureTypeOptions(room);
    return {
      text: `${getRoomLabel(room)}-ի համար ի՞նչ տեսակի կահույք եք ուզում։ Ընտրեք տարբերակներից մեկը, և ես կառաջարկեմ ապրանք կատալոգից։`,
      recommendations: [],
      options,
      pendingRoom: room.slug,
    };
  }

  if (profile.wantsCollection) {
    return {
      text: collection
        ? `${collection.title} հավաքածուն լավ ընտրություն է, եթե ուզում եք ամբողջական լուծում նույն ոճով։ Եթե ուզում եք, կարող եք բացել հավաքածուների էջը կամ ընտրել ներքեւի առանձին ապրանքներից։`
        : 'Հավաքածուները հարմար են, երբ ուզում եք ամբողջական լուծում մեկ ոճով։',
      recommendations,
    };
  }

  if (!recommendations.length && profile.categoryTerms.length) {
    return {
      text: 'Այդ կատեգորիայում այս պահին ակտիվ ապրանք չգտա։ Կարող եք զանգահարել մեզ՝ պատվերով պատրաստման կամ առկա այլ տարբերակների համար՝ +374 98 871555։',
      recommendations: [],
    };
  }

  if (profile.wantsOrder) {
    return {
      text: 'Կարող եմ արագ օգնել պատվերի ճանապարհով։ Ընտրեք ներքեւի ապրանքներից մեկը, սեղմեք «Ավելացնել», հետո «Պատվիրել»՝ զամբյուղում տվյալները լրացնելու համար։',
      recommendations,
    };
  }

  if (profile.wantsBudget) {
    return {
      text: recommendations.length
        ? `Ամենամատչելի տարբերակը հիմա «${recommendations[0].name}»-ն է՝ ${formatAmdPrice(productPrice(recommendations[0]))}։ Ստորեւ դրել եմ նաեւ մոտ գնի այլ տարբերակներ։`
        : 'Այս պահին գներով համեմատելու ակտիվ ապրանք չգտա։',
      recommendations,
    };
  }

  if (profile.wantsBestSeller) {
    return {
      text: recommendations.length
        ? `Ամենահավանական բեսթսելլերը հիմա «${recommendations[0].name}»-ն է՝ ըստ դիտումների, գնահատականների եւ ակտիվության։`
        : 'Այս պահին բեսթսելլեր առանձնացնելու համար բավարար տվյալ չգտա։',
      recommendations,
    };
  }

  if (profile.wantsNewest) {
    return {
      text: recommendations.length
        ? 'Ահա կատալոգի ամենանոր կամ վերջերս թարմացված տարբերակները։'
        : 'Այս պահին նոր ապրանք չգտա։',
      recommendations,
    };
  }

  if (profile.wantsSale) {
    return {
      text: recommendations.length
        ? 'Ահա զեղչով կամ հատուկ նշումով ապրանքները, որոնք հիմա արժե դիտել։'
        : 'Այս պահին ակտիվ զեղչով ապրանք չգտա։ Կապ հաստատեք մեզ հետ, եւ կասենք ընթացիկ առաջարկները։',
      recommendations,
    };
  }

  if (profile.wantsPremium) {
    return {
      text: recommendations.length
        ? `Ամենաբարձր դասի տարբերակներից առաջինը «${recommendations[0].name}»-ն է։ Այն լավ է աշխատում որպես ինտերիերի գլխավոր շեշտադրում։`
        : 'Այս պահին պրեմիում տարբերակ չգտա։',
      recommendations,
    };
  }

  if (hasDirectMatches || profile.categoryTerms.length || profile.room) {
    return {
      text: hasDirectMatches
        ? 'Գտա Ձեր նշած ապրանքին կամ կատեգորիային մոտ տարբերակները։ Եթե ուզում եք պատվիրել, կարող եք միանգամից ավելացնել զամբյուղ։'
        : 'Գտա Ձեր նկարագրությանը մոտ տարբերակներ։ Առաջինը ամենահավասարակշռված ընտրությունն է, մյուսները՝ լավ այլընտրանքներ ըստ ոճի եւ գնի։',
      recommendations,
    };
  }

  return {
    text: 'Ես կարող եմ որոնել ամբողջ կատալոգով։ Գրեք օրինակ՝ «Մահճակալ», «ամենաէժան սեղան», «բեսթսելլեր», «զեղչով ապրանքներ» կամ «կապի տվյալներ», եւ կօգնեմ արագ ընտրել։',
    recommendations,
  };
}

function ProductSuggestion({ product, onAddToCart }) {
  return (
    <article className="ai-chat-product">
      {productImage(product) ? <img src={productImage(product)} alt={product.name} /> : null}
      <div>
        <h4>{product.name}</h4>
        <p>{product.description ?? product.type ?? 'ARTWORK առարկա'}</p>
        <strong>{formatAmdPrice(productPrice(product))}</strong>
        <div className="ai-chat-product-actions">
          <a className="label-caps" href={productHref(product)} data-cursor-target>Դիտել</a>
          <button className="label-caps" type="button" onClick={() => onAddToCart(product)} data-cursor-target>
            Ավելացնել
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AiChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [showIntroNote, setShowIntroNote] = useState(false);
  const [messages, setMessages] = useState([defaultAssistantMessage]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [products, setProducts] = useState(fallbackProducts);
  const [collections, setCollections] = useState(fallbackCollections);
  const [rooms, setRooms] = useState(() => normalizeRooms(fallbackRooms));
  const [pendingRoomSlug, setPendingRoomSlug] = useState('');
  const messageListRef = useRef(null);

  useEffect(() => {
    const openTimer = window.setTimeout(() => {
      setShowIntroNote(true);
    }, 4000);
    const closeTimer = window.setTimeout(() => {
      setShowIntroNote(false);
    }, 9000);

    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(closeTimer);
    };
  }, []);

  useEffect(() => {
    if (isOpen) setShowIntroNote(false);
  }, [isOpen]);

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([api.products(), api.collections(), api.rooms()])
      .then(([productsResult, collectionsResult, roomsResult]) => {
        if (!isMounted) return;
        if (productsResult.status === 'fulfilled' && productsResult.value.products?.length) {
          setProducts(productsResult.value.products);
        }
        if (collectionsResult.status === 'fulfilled' && collectionsResult.value.collections?.length) {
          setCollections(collectionsResult.value.collections);
        }
        if (roomsResult.status === 'fulfilled' && roomsResult.value.rooms?.length) {
          setRooms(normalizeRooms(roomsResult.value.rooms));
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const catalogSummary = useMemo(() => {
    const productCount = products.length;
    const collectionCount = collections.length;
    return `${productCount} ապրանք · ${collectionCount} հավաքածու`;
  }, [collections.length, products.length]);

  const addAssistantMessage = (text, recommendations = [], options = {}) => {
    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text,
        recommendations,
        contact: Boolean(options.contact),
        options: options.options ?? [],
        roomOptions: options.roomOptions ?? [],
      },
    ]);
  };

  const showFurnitureTypeQuestion = (roomSlug) => {
    const room = rooms.find((item) => item.slug === roomSlug);
    if (!room) return;

    const options = createFurnitureTypeOptions(room);
    setPendingRoomSlug(room.slug);
    addAssistantMessage(
      `${getRoomLabel(room)}-ի համար ի՞նչ տեսակի կահույք եք ուզում։ Ընտրեք տարբերակներից մեկը, եւ ես պատահականորեն կառաջարկեմ 3 ապրանք կատալոգից։`,
      [],
      { options },
    );
  };

  const showRandomFurniture = ({ roomSlug, categorySlug, label }) => {
    const room = rooms.find((item) => item.slug === roomSlug);
    const matchedProducts = getRoomCategoryProducts(products, roomSlug, categorySlug);
    const recommendations = shuffleProducts(matchedProducts).slice(0, maxRecommendationCount);
    setPendingRoomSlug('');

    if (!recommendations.length) {
      addAssistantMessage(`${getRoomLabel(room)} սենյակի «${label}» տեսակի համար այս պահին ակտիվ ապրանք չգտա։ Կարող եք ընտրել այլ տեսակ կամ կապ հաստատել մեզ հետ պատվերով տարբերակի համար։`);
      return;
    }

    addAssistantMessage(
      `Ահա ${getRoomLabel(room)} սենյակի համար «${label}» տեսակից տարբերակներ։`,
      recommendations,
    );
  };

  const sendMessage = (text) => {
    const nextText = text.trim();
    if (!nextText || isTyping) return;

    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: nextText }]);
    setInput('');
    setIsTyping(true);

    window.setTimeout(() => {
      const pendingRoom = rooms.find((room) => room.slug === pendingRoomSlug);
      const pendingCategory = pendingRoom ? inferCategoryFromMessage(nextText, pendingRoom.categories) : null;

      if (pendingRoom && pendingCategory) {
        setIsTyping(false);
        showRandomFurniture({
          roomSlug: pendingRoom.slug,
          categorySlug: pendingCategory.slug,
          label: getCategoryLabel(pendingCategory),
        });
        return;
      }

      const reply = buildAssistantReply(nextText, products, collections, rooms);
      if (reply.pendingRoom) setPendingRoomSlug(reply.pendingRoom);
      setIsTyping(false);
      addAssistantMessage(reply.text, reply.recommendations, {
        contact: reply.contact,
        options: reply.options,
        roomOptions: reply.roomOptions,
      });
    }, 650);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(input);
  };

  const handleRoomChoice = (option) => {
    if (isTyping) return;

    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: option.label }]);
    window.setTimeout(() => showFurnitureTypeQuestion(option.roomSlug), 250);
  };

  const handleFurnitureTypeChoice = (option) => {
    if (isTyping) return;

    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: option.label }]);
    window.setTimeout(() => showRandomFurniture(option), 250);
  };

  const handleAddToCart = async (product) => {
    try {
      if (isAuthorized()) {
        await api.addCartItem({ productSlug: product.id, quantity: 1 });
      } else {
        addGuestCartItem(product, 1);
      }
      showArtworkNotification(`${product.name} ավելացվեց զամբյուղում`);
      addAssistantMessage(`Ավելացրի «${product.name}»-ը զամբյուղում։ Պատվերը ավարտելու համար անցեք զամբյուղ եւ լրացրեք կոնտակտային տվյալները։`);
    } catch (error) {
      showArtworkNotification(error.message, 'error');
      addAssistantMessage('Այս պահին չստացվեց ավելացնել զամբյուղում։ Կարող եք բացել ապրանքի էջը եւ փորձել այնտեղից։');
    }
  };

  const handleOrder = () => {
    window.location.href = '/cart';
  };

  return (
    <aside className={`ai-chat-assistant ${isOpen ? 'is-open' : ''}`} aria-label="ARTWORK AI օգնական">
      {isOpen ? (
        <section className="ai-chat-panel" role="dialog" aria-modal="false" aria-label="AI օգնականի զրույց">
          <header className="ai-chat-header">
            <div className="ai-chat-avatar" aria-hidden="true">
              <Icon name="auto_awesome" />
            </div>
            <div>
              <span className="label-caps">ARTWORK AI</span>
              <h3>Խորհրդատու</h3>
              <p>{catalogSummary}</p>
            </div>
            <button type="button" aria-label="Փակել զրույցը" onClick={() => setIsOpen(false)} data-cursor-target>
              <Icon name="close" />
            </button>
          </header>

          <div className="ai-chat-messages" ref={messageListRef}>
            {messages.map((message) => (
              <div className={`ai-chat-message is-${message.role}`} key={message.id}>
                <p>{message.text}</p>
                {message.contact ? (
                  <div className="ai-chat-contact-actions">
                    <a className="label-caps" href={shopContact.phoneHref} data-cursor-target>
                      <Icon name="call" />
                      Զանգահարել
                    </a>
                    <a className="label-caps" href={shopContact.emailHref} data-cursor-target>
                      <Icon name="mail" />
                      Էլ․ նամակ
                    </a>
                    <a className="label-caps" href={shopContact.contactHref} data-cursor-target>
                      <Icon name="contact_mail" />
                      Կապի էջ
                    </a>
                  </div>
                ) : null}
                {message.roomOptions?.length ? (
                  <div className="ai-chat-choice-actions">
                    {message.roomOptions.map((option) => (
                      <button className="label-caps" type="button" key={option.roomSlug} onClick={() => handleRoomChoice(option)} data-cursor-target>
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                {message.options?.length ? (
                  <div className="ai-chat-choice-actions">
                    {message.options.map((option) => (
                      <button className="label-caps" type="button" key={`${option.roomSlug}-${option.categorySlug}`} onClick={() => handleFurnitureTypeChoice(option)} data-cursor-target>
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                {message.recommendations?.length ? (
                  <div className="ai-chat-products">
                    {message.recommendations.map((product) => (
                      <ProductSuggestion product={product} key={product.id} onAddToCart={handleAddToCart} />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {isTyping ? (
              <div className="ai-chat-message is-assistant">
                <div className="ai-chat-typing" aria-label="AI օգնականը գրում է">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : null}
          </div>

          <div className="ai-chat-prompts" aria-label="Արագ հարցեր">
            {quickPrompts.map((prompt) => (
              <button type="button" key={prompt} onClick={() => sendMessage(prompt)} data-cursor-target>
                {prompt}
              </button>
            ))}
          </div>

          <form className="ai-chat-form" onSubmit={handleSubmit}>
            <input
              aria-label="Գրել հարց AI օգնականին"
              placeholder="Գրեք՝ ինչ եք փնտրում..."
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" aria-label="Ուղարկել" disabled={!input.trim() || isTyping} data-cursor-target>
              <Icon name="send" />
            </button>
          </form>

          <button className="ai-chat-order label-caps" type="button" onClick={handleOrder} data-cursor-target>
            <Icon name="shopping_bag" />
            Պատվիրել զամբյուղից
          </button>
        </section>
      ) : null}

      {showIntroNote && !isOpen ? (
        <button
          className="ai-chat-intro-note"
          type="button"
          onClick={() => {
            setShowIntroNote(false);
            setIsOpen(true);
          }}
          data-cursor-target
        >
          <span className="label-caps">AI օգնական</span>
          <strong>Գտեք ճիշտ կահույքը ավելի արագ</strong>
          <small>Գրեք՝ ինչ եք փնտրում, և ես կառաջարկեմ լավագույն տարբերակները։</small>
        </button>
      ) : null}

      <button
        className="ai-chat-launcher"
        type="button"
        aria-label="Բացել ARTWORK AI օգնականը"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        data-cursor-target
      >
        <span className="ai-chat-launcher-orbit" aria-hidden="true" />
        <Icon name={isOpen ? 'close' : 'smart_toy'} />
        <span>AI</span>
      </button>
    </aside>
  );
}
