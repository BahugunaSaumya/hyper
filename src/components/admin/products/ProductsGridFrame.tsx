export default function ProductsGridFrame({
  products,
}: {
  products: any[];
}) {
  return (
      <div className="rounded-2xl border overflow-hidden">
        <iframe
            src="/admin/products/grid"
            title="Products Grid"
            className="w-full"
            style={{ minHeight: "80vh", border: "0" }}
        />
    </div>
);
}
