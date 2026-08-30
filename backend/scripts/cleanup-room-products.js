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

function cleanupProduct(product) {
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
  const rooms = await roomsCollection.find({}).toArray();
  let updatedRooms = 0;
  let updatedProducts = 0;

  for (const room of rooms) {
    const furnitureTypes = (room.furnitureTypes ?? []).map((type) => {
      const products = (type.products ?? []).map((product) => {
        updatedProducts += 1;
        return cleanupProduct(product);
      });

      return { ...type, products };
    });

    await roomsCollection.updateOne(
      { _id: room._id },
      { $set: { furnitureTypes, updatedAt: new Date().toISOString() } },
    );
    updatedRooms += 1;
  }

  console.log(`Cleaned ${updatedProducts} room products across ${updatedRooms} rooms.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
