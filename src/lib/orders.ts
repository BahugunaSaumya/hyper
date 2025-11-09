// src/lib/orders.ts
import { db, serverTimestamp } from "./firebase";
import { addDoc, collection } from "firebase/firestore";

export type OrderItem = {
  id: string;
  title: string;
  size?: string;
  qty: number;
  unitPrice: number;
  image?: string;
};

export type OrderAmounts = {
  subtotal: number;
  shipping: number;
  total: number;
  currency: "INR";
};

export type OrderCustomer = { name: string; email: string; phone?: string };
export type OrderShipping = {
  country: string;
  state: string;
  city: string;
  postal: string;
  addr1: string;
  addr2?: string;
};

export type OrderPayload = {
  userId?: string | null;
  customer: OrderCustomer;
  shipping: OrderShipping;
  items: OrderItem[];
  amounts: OrderAmounts;
  // 🔒 Only "paid" is allowed to be written client-side
  status: "paid";
  paymentInfo?: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  };
};

export async function createOrder(p: OrderPayload) {
  if (p.status !== "paid") {
    throw new Error("Refusing to write non-paid orders to Firestore");
  }
  const ref = await addDoc(collection(db, "orders"), {
    ...p,
    createdAt: serverTimestamp(),
    source: "client",
  });
  return ref.id;
}
