export const USER_ROLES = {
  BUYER: 'buyer',
  SELLER: 'seller',
} as const;

export type UserRoleType = (typeof USER_ROLES)[keyof typeof USER_ROLES];
