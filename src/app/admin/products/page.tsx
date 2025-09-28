




// src/app/admin/products/page.tsx
import { redirect } from "next/navigation";

export default function AdminProductsRedirect() {
  redirect("/admin/products/grid");
}
