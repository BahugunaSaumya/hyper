import { db, serverTimestamp } from "@/lib/firebase/";
import { addDoc, collection } from "firebase/firestore";

export type OrderItem = {
  id: string;
  title: string;
  size?: string;
  qty: number;
  unitPrice: number;
  image?: string;
};

export type OrderPayload = {
  userId?: string | null;
  customer: { name: string; email: string; phone?: string };
  shipping: {
    country: string; state: string; city: string; postal: string; addr1: string; addr2?: string;
  };
  items: OrderItem[];
  amounts: { subtotal: number; shipping: number; total: number; currency: "INR" };
  status: "created" | "paid" | "cancelled";
};

export async function createOrder(p: OrderPayload) {
  const ref = await addDoc(collection(db, "orders"), {
    ...p,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
