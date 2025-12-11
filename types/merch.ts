// Types for merch items and orders

export interface MerchItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  image_url_2: string | null;
  cost_usd: number | null;
  price_heartcoins: number;
  stripe_url: string | null;
  is_active: boolean;
  min_tier: string | null;
  category: 'physical' | 'digital';
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  user_id: string;
  merch_item_id?: string;
  item_id: string;
  item_name: string;
  quantity: number;
  total_heartcoins: number;
  status: string;
  shipping_full_name?: string;
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip?: string;
  shipping_country?: string;
  created_at: string;
  updated_at: string;
}

// Normalized API response for merch purchases via HeartCoins
export interface PurchaseWithHeartcoinsResult {
  success: boolean;
  message: string;
  order_id: string | null;
  user_id: string | null;
  heartcoins_before: number | null;
  heartcoins_after: number | null;
  amount_spent: number;
}

export interface ShippingInfo {
  orderId: string; // pass through order_id from purchase result
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface ShippingUpdateResponse {
  success: boolean;
  order_id: number;
  status: string;
  shipping_info_updated: boolean;
  message: string;
}
