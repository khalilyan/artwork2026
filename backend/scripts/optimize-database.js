import { closeDatabase, connectDatabase } from '../src/db/mongo.js';

const shouldDropLegacyProducts = process.argv.includes('--drop-legacy-products');

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

function compactRoomProduct(product) {
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

async function optimizeRooms(db) {
  const roomsCollection = db.collection('rooms');
  const rooms = await roomsCollection.find({}).toArray();
  let updatedRooms = 0;
  let compactedProducts = 0;

  for (const room of rooms) {
    const furnitureTypes = (room.furnitureTypes ?? []).map((type) => {
      const products = (type.products ?? []).map((product) => {
        compactedProducts += 1;
        return compactRoomProduct(product);
      });

      return { ...type, products };
    });

    await roomsCollection.updateOne(
      { _id: room._id },
      { $set: { furnitureTypes, updatedAt: new Date().toISOString() } },
    );
    updatedRooms += 1;
  }

  return { updatedRooms, compactedProducts };
}

async function optimizeMaterials(db) {
  const result = await db.collection('materials').updateMany(
    {},
    { $unset: { slug: '', type: '', sortOrder: '', isActive: '' } },
  );

  return result.modifiedCount;
}

async function optimizeEditableMetadata(db) {
  const [collectionsResult, pagesResult] = await Promise.all([
    db.collection('collections').updateMany({}, { $unset: { adminEditable: '' } }),
    db.collection('pages').updateMany({}, { $unset: { adminEditable: '' } }),
  ]);

  return {
    collections: collectionsResult.modifiedCount,
    pages: pagesResult.modifiedCount,
  };
}

async function dropLegacyProductsCollection(db) {
  const collections = await db.listCollections({ name: 'products' }).toArray();
  if (!collections.length) return false;

  await db.collection('products').drop();
  return true;
}

try {
  const db = await connectDatabase();
  const rooms = await optimizeRooms(db);
  const materials = await optimizeMaterials(db);
  const editableMetadata = await optimizeEditableMetadata(db);
  const droppedProducts = shouldDropLegacyProducts ? await dropLegacyProductsCollection(db) : false;

  console.log(`Optimized ${rooms.compactedProducts} room products across ${rooms.updatedRooms} rooms.`);
  console.log(`Cleaned ${materials} material documents.`);
  console.log(`Removed adminEditable from ${editableMetadata.collections} collections and ${editableMetadata.pages} pages.`);
  if (shouldDropLegacyProducts) {
    console.log(droppedProducts ? 'Dropped legacy products collection.' : 'Legacy products collection was not present.');
  } else {
    console.log('Legacy products collection kept. Pass --drop-legacy-products after syncing products into rooms.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
