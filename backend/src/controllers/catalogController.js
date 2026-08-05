import { getDatabase } from '../db/mongo.js';
import { findProductBySlug, incrementProductViews, listProducts } from '../models/productModel.js';
import { HttpError } from '../utils/httpError.js';
import { toCleanString } from '../utils/validators.js';

const furnitureLayouts = ['wide-center', 'portrait-left', 'wide-right'];
const furniturePanels = ['bottom-right', 'center-right', 'bottom-left'];

function withFurnitureLayout(type, index, roomSlug) {
  return {
    ...type,
    roomSlug,
    layout: type.layout ?? furnitureLayouts[index % furnitureLayouts.length],
    panel: type.panel ?? furniturePanels[index % furniturePanels.length],
  };
}

function formatRoom(room) {
  return {
    ...room,
    roomName: room.name ?? room.title,
    categories: (room.furnitureTypes ?? []).map((type, index) => withFurnitureLayout(type, index, room.slug)),
  };
}

function formatCollection(collection, products = []) {
  return {
    ...collection,
    image: collection.image ?? collection.heroImage,
    priceAmount: collection.price?.amount ?? null,
    products,
  };
}

export async function getRooms(_request, response, next) {
  try {
    const rooms = await getDatabase().collection('rooms').find({ isActive: { $ne: false } }).sort({ sortOrder: 1 }).toArray();
    response.json({ rooms: rooms.map(formatRoom) });
  } catch (error) {
    next(error);
  }
}

export async function getRoom(request, response, next) {
  try {
    const room = await getDatabase().collection('rooms').findOne({ slug: request.params.roomSlug });
    if (!room) throw new HttpError(404, 'Room was not found.');

    response.json({ room: formatRoom(room) });
  } catch (error) {
    next(error);
  }
}

export async function getCategories(_request, response, next) {
  try {
    const rooms = await getDatabase().collection('rooms').find({ isActive: { $ne: false } }).sort({ sortOrder: 1 }).toArray();
    const categoriesBySlug = new Map();

    for (const room of rooms) {
      for (const type of room.furnitureTypes ?? []) {
        if (!categoriesBySlug.has(type.slug)) {
          categoriesBySlug.set(type.slug, { ...type, roomSlugs: [room.slug] });
        } else {
          categoriesBySlug.get(type.slug).roomSlugs.push(room.slug);
        }
      }
    }

    response.json({ categories: Array.from(categoriesBySlug.values()) });
  } catch (error) {
    next(error);
  }
}

export async function getProducts(request, response, next) {
  try {
    const products = await listProducts({
      roomSlug: toCleanString(request.query.roomSlug),
      categorySlug: toCleanString(request.query.categorySlug),
      q: toCleanString(request.query.q),
      sort: toCleanString(request.query.sort),
    });

    response.json({ products });
  } catch (error) {
    next(error);
  }
}

export async function getProduct(request, response, next) {
  try {
    const match = await findProductBySlug(request.params.productSlug);
    if (!match) throw new HttpError(404, 'Product was not found.');

    const product = await incrementProductViews(request.params.productSlug);
    response.json({ product: product ?? match.product });
  } catch (error) {
    next(error);
  }
}

export async function getMaterials(_request, response, next) {
  try {
    const collection = getDatabase().collection('materials');
    const materials = await collection.find({}).sort({ name: 1 }).toArray();

    response.json({
      materials: materials.map((material) => ({
        id: String(material._id),
        name: material.name,
        color: material.color,
        image: material.image ?? '',
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function getCollections(request, response, next) {
  try {
    const limit = Number(request.query.limit);
    const shouldRandomize = toCleanString(request.query.random).toLowerCase() === 'true';
    const collection = getDatabase().collection('collections');
    const filter = { isActive: { $ne: false } };
    const collections = shouldRandomize
      ? await collection.aggregate([{ $match: filter }, { $sample: { size: Number.isInteger(limit) && limit > 0 ? limit : 3 } }]).toArray()
      : await collection.find(filter).sort({ sortOrder: 1 }).limit(Number.isInteger(limit) && limit > 0 ? limit : 0).toArray();

    response.json({ collections: collections.map((collection) => formatCollection(collection)) });
  } catch (error) {
    next(error);
  }
}

export async function getCollection(request, response, next) {
  try {
    const collection = await getDatabase().collection('collections').findOne({ slug: request.params.collectionSlug });
    if (!collection) throw new HttpError(404, 'Collection was not found.');

    const allProducts = await listProducts();
    const orderedProducts = (collection.productSlugs ?? [])
      .map((slug) => allProducts.find((product) => product.slug === slug))
      .filter(Boolean);

    response.json({ collection: formatCollection(collection, orderedProducts) });
  } catch (error) {
    next(error);
  }
}

export async function getPageAssets(request, response, next) {
  try {
    const pageKey = toCleanString(request.params.pageKey);
    const pageAssets = await getDatabase().collection('pageAssets').findOne({ pageKey, isActive: { $ne: false } });

    response.json({ pageAssets: pageAssets?.images ?? {} });
  } catch (error) {
    next(error);
  }
}

export async function getPage(request, response, next) {
  try {
    const slug = toCleanString(request.params.pageSlug);
    const page = await getDatabase().collection('pages').findOne({ slug });
    if (!page) throw new HttpError(404, 'Page was not found.');

    response.json({ page });
  } catch (error) {
    next(error);
  }
}
