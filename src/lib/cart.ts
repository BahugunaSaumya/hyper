/** For adding new items via the AddToCart button */
export type AddToCartInput = {
  id: number;        // product_id
  size: number;      // variant_id
  sizeLabel: string;
  name: string;      // product_name
  slug: string;      // product_slug
  mrp: number;       // product_mrp
  price: number; 
  quantity: number;
  newLaunch: boolean;
};

/** For items already in the DB (Used in Cart View/Update/Delete) */
export type CartItem = {
  id: number;                // cart_item_id (DB Primary Key)
  productId: number;         // product_id
  size: string;              // variant_size
  name: string;              // product_name
  slug: string;              // product_slug
  mrp: number;               // product_mrp
  price: number; 
  quantity: number;
  discount_coupon_id?: number;
  express_shipping?: boolean;
  newLaunch?: boolean;       // Kept for UI badges
};

export const CART_KEY = "cart";

export function readCart(): Record<string, CartItem> {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "{}"); }
  catch { return {}; }
}

export function writeCart(cart: Record<string, CartItem>) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function parseINR(v: string) {
  const n = parseFloat(v || "");
  return isNaN(n) ? 0 : n;
}

export function formatINR(n: number) {
  return "₹ " + Number(n || 0).toLocaleString("en-IN");
}

export function shippingAmount(express: boolean) {
  return express ? 250 : 0; // same as legacy
}

export function subtotalOf(cart: Record<string, CartItem>) {
  return Object.values(cart).reduce(
    (s, it) => s + it.price * (it.quantity || 0),
    0
  );
}
