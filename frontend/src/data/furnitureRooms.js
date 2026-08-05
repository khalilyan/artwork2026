import logo from '../assets/images/logo.png';
import { rooms } from './shopByRooms.js';

export const furnitureCategoryImages = {
  beds: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA36m97bZbs2IzC5-uYuHu_bMOzdA8WY28taGWmm3xsToXAxoSCiIJDCSqG1Ter-KmEIw8-AiA1uZnZr-Vmf2nyb5ZexI7tm9KM4OCqdY7Wjkmfa4nMJq0oBBmne4yQon5XGpVROtnbxeckw_LXDF09XNWwipXobQTSu9d2pRqt0yV-SAy9pS4YNzGXQyiY_QtAaC_pANjccwzJNT-O1Lxm0he_0d-LBSkTB6236MHzwBMqTTE-Mz_NsoVaokA0W3cWIp9GPSoFSw',
  closets: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCI9-jcDBqYRF5GbTY3cOKrn8UnMpEb8dv7oaobOUMlMbvM1TfzXs2Yly36cXApH9hLu-DfU6yQzWTUkBjKpHV-jqSjfp4xo9zkK0yOX3Dxc9XwCBiatkZaRK15MrkbJByXvITEJtK-E2CQS_uthAJMuGlHdaFtIvMTi8rxZCuZRmJF-Ue72c8qwygmVy0S81_V2DEBANkFHzxv_xS_FxMWnpDRcXjYonp42VV4YB2ZlLAGfSn-sOZffVx8s4fsBxHhKAWquxo_xg',
  nightstands: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCycWigSoLHGWqgZCHQx4Ip6bCF2cPy-AokcAgGj5aA9Wyh_oNWVXuk5UWNlwhJFOBtBB2YFp_Yjek7Xa1lgApsoWT2mfhaM3hw7ItsTG3DdzzGGgHfJ3TxSRoCkZjesE4C4GMSZaN3b3ZrIDdCFeg36VIhoPzgL6dVsyjCxAWNxTockYHLm76OEV3BSCUpAjyTN2_rRUZC5a4bOZc0lJbi30jomeoWirPPBIafpykJNCLM5RVC2mcdF4nRswd1uvpzReHxesCkpg',
};

export const defaultFurnitureCategories = [
  {
    slug: 'beds',
    title: 'Beds',
    description: 'Sculptural silhouettes engineered for restoration. Explore our collection of hand-finished frames.',
    image: furnitureCategoryImages.beds,
    layout: 'wide-center',
    panel: 'bottom-right',
  },
  {
    slug: 'closets',
    title: 'Closets',
    description: 'Modular systems designed for invisibility. Intelligent storage meeting architectural precision.',
    image: furnitureCategoryImages.closets,
    layout: 'portrait-left',
    panel: 'center-right',
  },
  {
    slug: 'nightstands',
    title: 'Nightstands',
    description: 'Functional monoliths that ground the space. Materiality in its purest, most essential form.',
    image: furnitureCategoryImages.nightstands,
    layout: 'wide-right',
    panel: 'bottom-left',
  },
];

export function getFurnitureRoom(slug) {
  const room = rooms.find((item) => item.slug === slug) ?? rooms.find((item) => item.slug === 'bedroom');

  return {
    ...room,
    brandLogo: logo,
    categories: defaultFurnitureCategories.map((category) => ({
      ...category,
      roomSlug: room.slug,
    })),
  };
}

export function getFurnitureCategory(slug) {
  return defaultFurnitureCategories.find((category) => category.slug === slug) ?? defaultFurnitureCategories[0];
}
