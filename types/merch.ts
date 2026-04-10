// Types for merch items and orders

// Variant option images structure
export interface VariantImages {
  main?: string;
  front?: string;
  back?: string;
}

// Single variant option (design-based)
export interface VariantOption {
  type: 'design' | string;
  value: string;
  label: string;
  images: VariantImages;
}

// Single color option
export interface ColorOption {
  value: string;
  label: string;
  images: VariantImages;
}

// variant_options JSONB structure from database
export interface VariantOptionsData {
  variants?: VariantOption[];
  colors?: ColorOption[];
}

// Normalized variant option for UI state
export interface NormalizedVariantOption {
  type: 'design' | 'color' | string;
  value: string;
  label: string;
  imageMain: string | null;
}

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
  // Journey tier gating: min_journey_tier column (values: 'WANDERER', 'DREAMER', 'LOVER')
  // Falls back to min_tier if not present
  min_journey_tier?: string | null;
  category: 'physical' | 'digital';
  created_at: string;
  updated_at: string;
  // Additional optional fields from API
  price_usd?: number | null;
  secondary_image_url?: string | null;
  // Variant options from database (JSONB)
  variant_options?: VariantOptionsData | null;
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
  // Variant selection fields
  selected_variant?: { type: string; value: string; label: string } | Record<string, never> | null;
  selected_color?: string | null;
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
  shipping_full_name: string;
  shipping_address_line1: string;
  shipping_address_line2?: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
  // Optional fallbacks when orderId is unavailable
  client_request_id?: string;
  merch_item_id?: string;
}

export interface ShippingUpdateResponse {
  success: boolean;
  order_id: number;
  status: string;
  shipping_info_updated: boolean;
  message: string;
}
