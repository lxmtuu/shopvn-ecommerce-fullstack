export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  emailVerified: boolean;
  dateOfBirth?: string | null;
  gender?: string | null;
  createdAt?: string;
  _count?: { orders: number; wishlist: number };
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  count?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  iconName?: string | null;
  productCount?: number;
  children?: Category[];
}

export interface ProductCard {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  thumbUrl: string | null;
  blurData: string | null;
  price: string;
  salePrice: string | null;
  effectivePrice: string;
  discountPercent: number;
  isOnSale: boolean;
  stock: number;
  inStock: boolean;
  sold: number;
  isFeatured: boolean;
  tags: string[];
  warrantyMonths: number | null;
  brand: { id: string; name: string; slug: string } | null;
  category: { id: string; name: string; slug: string };
  avgRating: number;
  reviewCount: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: string;
  salePrice: string | null;
  effectivePrice: string;
  stock: number;
  imageUrl: string | null;
  attributes?: Record<string, string>;
  isActive: boolean;
}

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  images: string[];
  isVerified: boolean;
  helpfulCount: number;
  adminReply: string | null;
  createdAt: string;
  user: { fullName: string; avatarUrl: string | null };
}

export interface ProductDetail extends Omit<ProductCard, 'thumbnail' | 'thumbUrl' | 'blurData'> {
  sku: string;
  shortDesc: string | null;
  description: string | null;
  specs: Record<string, string> | null;
  viewCount: number;
  lowStockAlert: number;
  weightGram: number | null;
  images: { id: string; url: string; cardUrl: string | null; thumbUrl: string | null; blurData: string | null; alt: string | null }[];
  variants: ProductVariant[];
  category: { id: string; name: string; slug: string; parentId: string | null };
  coupons: { code: string; type: string; value: string; minOrderValue: string; expiresAt: string | null }[];
  rating: { average: number; count: number; distribution: { star: number; count: number }[] };
  latestReviews: Review[];
  isWishlisted: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  variantName: string | null;
  image: string | null;
  blurData: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  stock: number;
  inStock: boolean;
  available: boolean;
  exceedsStock: boolean;
  maxQuantity: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  totalQuantity: number;
  distinctCount: number;
  subtotal: string;
  shippingFeeEstimate: string;
  freeShippingThreshold: number;
  amountToFreeShipping: string;
  totalEstimate: string;
  hasIssues: boolean;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  provinceName: string;
  districtName: string | null;
  wardName: string | null;
  detail: string;
  note: string | null;
  isDefault: boolean;
}

export interface OrderSummary {
  id: string;
  orderCode: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: string;
  itemCount: number;
  previewItems: { name: string; image: string | null; quantity: number }[];
  createdAt: string;
  paymentDueAt: string | null;
  canCancel: boolean;
}

export interface OrderDetail {
  id: string;
  orderCode: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: string;
  shippingFee: string;
  discountAmount: string;
  totalAmount: string;
  couponCode: string | null;
  shippingMethod: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: Record<string, string | null>;
  note: string | null;
  trackingCode: string | null;
  createdAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  paymentDueAt: string | null;
  items: {
    id: string;
    productName: string;
    variantName: string | null;
    productSlug: string;
    sku: string;
    imageUrl: string | null;
    unitPrice: string;
    quantity: number;
    totalPrice: string;
  }[];
  history: { id: string; status: string; note: string | null; createdAt: string }[];
  payment: { id: string; status: string; amount: string; paidAmount: string; paidAt: string | null } | null;
  canCancel: boolean;
  bankInfo: {
    bankBin: string;
    bankName: string;
    accountNo: string;
    accountName: string;
    amount: string;
    content: string;
  } | null;
}

export interface Paginated<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}

export interface ProductListResponse extends Paginated<ProductCard> {
  facets: { brands: Brand[]; priceRange: { min: number; max: number } };
}

export interface BankInfo {
  bankBin: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  hotline: string;
  email: string;
  social: Record<string, string>;
  siteName: string;
  shippingFees: Record<string, number>;
  freeShipThreshold: number;
}

export interface PaymentInfo {
  orderCode: string;
  status: string;
  orderStatus: string;
  amount: string;
  bank: { bin: string; name: string; accountNo: string; accountName: string; branch: string };
  transferContent: string;
  qrPayload: string;
  qrDataUrl: string;
  paidAmount: string;
  expiresAt: string | null;
  expired: boolean;
  secondsLeft: number | null;
}
