export const PRODUCT_CATEGORIES = {
  ELECTRONICS: 'electronics',
  FASHION: 'fashion',
  COLLECTIBLES: 'collectibles',
  HOME_GARDEN: 'home-garden',
  SPORTS: 'sports',
  TOYS: 'toys',
  VEHICLES: 'vehicles',
  JEWELRY: 'jewelry',
  ART: 'art',
  BOOKS: 'books',
  MUSIC: 'music',
  WATCHES: 'watches',
  ANTIQUES: 'antiques',
  OTHER: 'other',
} as const;

export type ProductCategoryType =
  (typeof PRODUCT_CATEGORIES)[keyof typeof PRODUCT_CATEGORIES];

export const PRODUCT_CATEGORY_VALUES = Object.values(PRODUCT_CATEGORIES);
