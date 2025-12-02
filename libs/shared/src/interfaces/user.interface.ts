export interface IAddress {
  street: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface IUserProfile {
  name: string;
  phone: string;
  address: IAddress;
  avatar?: string;
}

export interface ISellerInfo {
  companyName: string;
  description: string;
  rating: number;
  totalSales: number;
}

export interface IBuyerInfo {
  totalBids: number;
  totalWins: number;
}

export interface IUser {
  _id: string;
  email: string;
  password: string;
  role: 'buyer' | 'seller';
  profile: IUserProfile;
  seller?: ISellerInfo;
  buyer?: IBuyerInfo;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export type UserRole = 'buyer' | 'seller';
