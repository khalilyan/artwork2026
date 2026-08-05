import { Router } from 'express';
import {
  createAdminCollection,
  createAdminMaterial,
  createAdminProduct,
  createAdminRoom,
  deleteAdminCollection,
  deleteAdminMaterial,
  deleteAdminOrder,
  deleteAdminProduct,
  deleteAdminProductReview,
  deleteAdminRoom,
  getAdminAiSettings,
  getAdminCollections,
  getAdminContacts,
  getAdminHomepage,
  getAdminMaterials,
  getAdminOrders,
  getAdminOverview,
  getAdminProducts,
  getAdminRooms,
  getAdminUsers,
  updateAdminCollection,
  updateAdminHomepage,
  updateAdminAiSettings,
  updateAdminMaterial,
  updateAdminOrder,
  updateAdminProduct,
  updateAdminRoom,
  updateAdminUser,
  uploadAdminImage,
} from '../controllers/adminController.js';
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/overview', getAdminOverview);
router.get('/ai-settings', getAdminAiSettings);
router.patch('/ai-settings', updateAdminAiSettings);
router.get('/products', getAdminProducts);
router.post('/products', createAdminProduct);
router.patch('/products/:productSlug', updateAdminProduct);
router.delete('/products/:productSlug', deleteAdminProduct);
router.delete('/products/:productSlug/reviews/:reviewId', deleteAdminProductReview);
router.get('/materials', getAdminMaterials);
router.post('/materials', createAdminMaterial);
router.patch('/materials/:materialId', updateAdminMaterial);
router.delete('/materials/:materialId', deleteAdminMaterial);
router.get('/rooms', getAdminRooms);
router.post('/rooms', createAdminRoom);
router.patch('/rooms/:roomSlug', updateAdminRoom);
router.delete('/rooms/:roomSlug', deleteAdminRoom);
router.get('/collections', getAdminCollections);
router.post('/collections', createAdminCollection);
router.patch('/collections/:collectionSlug', updateAdminCollection);
router.delete('/collections/:collectionSlug', deleteAdminCollection);
router.get('/homepage', getAdminHomepage);
router.patch('/homepage', updateAdminHomepage);
router.get('/orders', getAdminOrders);
router.get('/contacts', getAdminContacts);
router.patch('/orders/:orderId', updateAdminOrder);
router.delete('/orders/:orderId', deleteAdminOrder);
router.get('/users', getAdminUsers);
router.patch('/users/:userId', updateAdminUser);
router.post('/uploads/images', uploadAdminImage);

export default router;
