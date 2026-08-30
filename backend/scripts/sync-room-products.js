import { closeDatabase, connectDatabase } from '../src/db/mongo.js';

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function createPrice(price) {
  const amount = toNumberOrNull(price?.amount);

  return {
    amount,
    currency: 'AMD',
    display: amount === null ? 'Գինը անհատական' : new Intl.NumberFormat('hy-AM', {
      style: 'currency',
      currency: 'AMD',
      maximumFractionDigits: 0,
    }).format(amount),
  };
}

function createEmbeddedRoomProduct(product) {
  const {
    adminEditable,
    craftsmanshipText,
    details,
    material,
    technicalDescription,
    technicalImage,
    technicalNoteOne,
    technicalNoteTwo,
    technicalTitle,
    productSlug,
    productSku,
    ...cleanProduct
  } = product;

  const images = cleanProduct.images && typeof cleanProduct.images === 'object'
    ? (({ technical, ...safeImages }) => safeImages)(cleanProduct.images)
    : cleanProduct.images;

  return {
    ...cleanProduct,
    images,
    dimensionsText: cleanProduct.dimensionsText ?? details?.dimensions ?? '',
    price: createPrice(cleanProduct.price),
    oldPrice: cleanProduct.oldPrice?.amount !== null && cleanProduct.oldPrice?.amount !== undefined
      ? createPrice(cleanProduct.oldPrice)
      : null,
  };
}

try {
  const db = await connectDatabase();
  const roomsCollection = db.collection('rooms');
  const [rooms, productGroups] = await Promise.all([
    roomsCollection.find({}).toArray(),
    db.collection('products').find({}).toArray(),
  ]);
  const products = productGroups.flatMap((groupDocument) => {
    const groupProducts = groupDocument[groupDocument.group] ?? [];
    return groupProducts.map((product) => ({ ...product, group: groupDocument.group }));
  });

  let updatedRooms = 0;

  for (const room of rooms) {
    const furnitureTypes = (room.furnitureTypes ?? []).map((type) => ({
      ...type,
      products: products
        .filter((product) => product.roomSlugs?.includes(room.slug))
        .filter((product) => (product.categorySlug ?? product.type) === type.slug)
        .map(createEmbeddedRoomProduct),
    }));

    await roomsCollection.updateOne(
      { _id: room._id },
      { $set: { furnitureTypes, updatedAt: new Date().toISOString() } },
    );
    updatedRooms += 1;
  }

  console.log(`Synced ${updatedRooms} rooms with nested furniture type products.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
