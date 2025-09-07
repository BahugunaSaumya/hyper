// src/lib/cart.ts
export type CartItem = {
  id: string;           // product key (e.g., "<name>__<size>")
  name: string;
  size: string;
  price: string;        // keep as "₹ 1,599.00" like legacy
  image: string;
  quantity: number;
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
  const n = parseFloat(String(v || "").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

export function formatINR(n: number) {
  return "₹ " + Number(n || 0).toLocaleString("en-IN");
}

export function shippingAmount(express: boolean) {
  return express ? 80 : 0; // same as legacy
}

export function subtotalOf(cart: Record<string, CartItem>) {
  return Object.values(cart).reduce(
    (s, it) => s + parseINR(it.price) * (it.quantity || 0),
    0
  );
}
