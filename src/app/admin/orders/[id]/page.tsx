import OrderDetailsView from "@/components/orders/OrderDetailsView";
import db from "@/lib/mysql";
import { notFound } from "next/navigation";
import { RowDataPacket } from "mysql2";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderPage({ params }: PageProps) {
  const { id } = await params;
  const orderId = decodeURIComponent(id);

  // 1. Fetch Order + Address + Coupon Info
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT o.*, 
            c.email as customer_email,
            oa.first_name, oa.last_name, oa.mobile, oa.address1, oa.address2, oa.city, oa.state, oa.pincode,
            cp.code as coupon_code, cp.amount as coupon_discount
     FROM orders o
     LEFT JOIN customers c ON o.customer_id = c.id
     LEFT JOIN order_addresses oa ON o.shipping_address_id = oa.id
     LEFT JOIN coupons cp ON o.coupon_id = cp.id
     WHERE o.id = ? OR o.order_number = ?`, 
    [orderId, orderId]
  );

  const orderData = rows[0];
  if (!orderData) notFound();

  // 2. Fetch Order Items + Product Title + Size Label
  // We join order_items -> product_variants -> products -> sizes
  const [items] = await db.query<RowDataPacket[]>(
    `SELECT oi.*, 
            p.title as product_name, 
            p.slug as product_slug,
            p.image as product_image,
            s.label as size_label
     FROM order_items oi
     LEFT JOIN products p ON oi.product_id = p.id
     LEFT JOIN product_variants pv ON oi.variant_id = pv.id
     LEFT JOIN sizes s ON pv.size_id = s.id
     WHERE oi.order_id = ?`,
    [orderData.id]
  );

  // 3. Construct the clean object
  const order = {
    ...orderData,
    id: orderData.id.toString(),
    // Mapping address for the component expectations
    shipping_address: {
      name: `${orderData.first_name} ${orderData.last_name || ""}`.trim(),
      mobile: orderData.mobile,
      address1: orderData.address1,
      address2: orderData.address2,
      city: orderData.city,
      state: orderData.state,
      pincode: orderData.pincode,
    },
    coupon: orderData.coupon_code ? {
      code: orderData.coupon_code,
      discount: orderData.coupon_discount
    } : null,
    items: items.map(item => ({
      ...item,
      price: Number(item.price),
      total: Number(item.total),
      slug: item.product_slug,
      name: item.product_name, 
      size: item.size_label
    })),
    created_at: orderData.created_at.toISOString(),
    updated_at: orderData.updated_at.toISOString(),
    subtotal: Number(orderData.subtotal),
    discount: Number(orderData.discount),
    shipping_charges: Number(orderData.shipping_charges),
    total: Number(orderData.total),
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <OrderDetailsView 
        order={order} 
        back={{ href: "/admin", label: "Back to Dashboard" }}
      />
    </div>
  );
}