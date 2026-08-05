import { Router } from 'express';
import { getAccount, updateAccountDetails, updatePassword } from '../controllers/accountController.js';
import {
  addCartItem,
  addSavedItem,
  createAccountOrder,
  getCart,
  getOrders,
  getSavedItems,
  removeCartItem,
  removeSavedItem,
  updateCartItem,
} from '../controllers/commerceController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getAccount);
router.patch('/details', updateAccountDetails);
router.patch('/password', updatePassword);

router.get('/cart', getCart);
router.post('/cart', addCartItem);
router.patch('/cart/:productSlug', updateCartItem);
router.delete('/cart/:productSlug', removeCartItem);

router.get('/saved-items', getSavedItems);
router.post('/saved-items', addSavedItem);
router.delete('/saved-items/:productSlug', removeSavedItem);

router.get('/orders', getOrders);
router.post('/orders', createAccountOrder);

export default router;
