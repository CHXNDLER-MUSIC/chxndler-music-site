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

export interface PurchaseResponse {
  success: boolean;
  order_id: number;
  previous_balance: number;
  new_balance: number;
  amount_spent: number;
  merch_item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  transaction_id: string;
  item_category: 'physical' | 'digital';
  requires_shipping: boolean;
}

export interface ShippingInfo {
  orderId: number;
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