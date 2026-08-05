import { notifyAdminAboutOrder } from '../src/controllers/commerceController.js';

await notifyAdminAboutOrder({
  orderNumber: 'ART-TEST-001',
  customer: {
    name: 'Armen Khalilyan',
    phone: '093088238',
    email: 'artwork@email.com',
  },
  shippingAddress: 'Երևան, փորձնական հասցե',
  notes: 'Փորձնական պատվերի նամակ',
  pricing: {
    total: null,
    currency: 'AMD',
  },
  items: [
    {
      productSlug: 'linear-lounge-chair',
      productSku: 'LLC-001',
      name: 'Linear Lounge Chair',
      image: '/artwork-logo.png',
      price: { amount: 125000, currency: 'AMD', display: '125 000 ֏' },
      unitPrice: { amount: 125000, currency: 'AMD', display: '125 000 ֏' },
      quantity: 2,
      roomSlugs: ['living-room'],
      categorySlug: 'chairs',
    },
  ],
});

console.log('Sample Armenian order email queued.');
