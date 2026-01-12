"use client";

import { useState } from "react";
import ProductsGridFrame from "./ProductsGridFrame";
import ProductsCsvTable from "./ProductsCsvTable";
import { Product } from "@/types/product";

type Props = {
  products: Product[];
  headers: string[];
  rows: string[][];
  loading: boolean;
  error?: string | null;
};

export default function ProductsSection({
  products,
  headers,
  loading,
}: Props) {
  const [productsView, setProductsView] = useState<"grid" | "table">("grid");

  if (loading) {
    return (
      <div className="py-10 text-sm text-gray-500">
        Loading products…
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* View switcher */}
      <div className="mb-4 flex items-center gap-2">
        <button
          className={`px-3 py-1.5 rounded-full border text-xs sm:text-sm ${
            productsView === "grid"
              ? "bg-black text-white"
              : "hover:bg-gray-100"
          }`}
          onClick={() => setProductsView("grid")}
        >
          Grid
        </button>

        <button
          className={`px-3 py-1.5 rounded-full border text-xs sm:text-sm ${
            productsView === "table"
              ? "bg-black text-white"
              : "hover:bg-gray-100"
          }`}
          onClick={() => setProductsView("table")}
        >
          Table (CSV)
        </button>
      </div>

      {/* Views */}
      {productsView === "grid" && (
        <ProductsGridFrame products={products} />
      )}

      {productsView === "table" && (
        <ProductsCsvTable
          products={products}
          headers={headers}
        />
      )}
    </section>
  );
}
