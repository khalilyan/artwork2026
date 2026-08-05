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
    display: amount === null ? 'Price on request' : new Intl.NumberFormat('hy-AM', {
      style: 'currency',
      currency: 'AMD',
      maximumFractionDigits: 0,
    }).format(amount),
  };
}

function createEmbeddedRoomProduct(product) {
  const {
    adminEditable,
    details,
    inventory,
    material,
    productSlug,
    productSku,
    ...cleanProduct
  } = product;

  return {
    ...cleanProduct,
    limitedEdition: Boolean(cleanProduct.limitedEdition ?? inventory?.limitedEdition),
    dimensionsText: cleanProduct.dimensionsText ?? details?.dimensions ?? '',
    craftsmanshipText: cleanProduct.craftsmanshipText ?? details?.craftsmanship ?? '',
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
