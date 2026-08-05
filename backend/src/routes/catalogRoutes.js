import { Router } from 'express';
import { getCategories, getCollection, getCollections, getMaterials, getPage, getPageAssets, getProduct, getProducts, getRoom, getRooms } from '../controllers/catalogController.js';

const router = Router();

router.get('/rooms', getRooms);
router.get('/rooms/:roomSlug', getRoom);
router.get('/categories', getCategories);
router.get('/materials', getMaterials);
router.get('/page-assets/:pageKey', getPageAssets);
router.get('/pages/:pageSlug', getPage);
router.get('/products', getProducts);
router.get('/products/:productSlug', getProduct);
router.get('/collections', getCollections);
router.get('/collections/:collectionSlug', getCollection);

export default router;
