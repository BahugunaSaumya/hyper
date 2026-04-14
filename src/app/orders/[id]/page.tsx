import db from "@/lib/mysql";
import { RowDataPacket } from "mysql2";
import OrderDetailsView from "@/components/orders/OrderDetailsView";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>; // Next.js 15+ convention
};

export default async function OrderPage({ params }: PageProps) {
  const { id } = await params;

  const connection = await db.getConnection();

  try {
    // 1. Fetch Order and Address Details
    // We check BOTH 'id' and 'order_number' to make the URL flexible
    const [orderRows] = await connection.query<RowDataPacket[]>(
      `SELECT o.*, 
              a.first_name, a.last_name, a.mobile, a.address1, a.address2, a.city, a.state, a.pincode
       FROM orders o
       LEFT JOIN order_addresses a ON o.shipping_address_id = a.id
       WHERE o.id = ? OR o.order_number = ? 
       LIMIT 1`,
      [id, id]
    );

    if (orderRows.length === 0) {
      return notFound(); // Triggers your 404 page
    }

    const o = orderRows[0];

    // 2. Fetch Order Items linked to this order
    const [itemRows] = await connection.query<RowDataPacket[]>(
      `SELECT oi.*, p.title as product_name, p.slug as product_slug, s.label as size 
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       LEFT JOIN product_variants pv ON oi.variant_id = pv.id
       LEFT JOIN sizes s ON pv.size_id = s.id
       WHERE oi.order_id = ?`,
      [o.id]
    );

    // 3. Map MySQL data to the format your OrderDetailsView expects
    const order = {
      id: o.id,
      order_number: o.order_number,
      created_at: o.created_at, // No need for serializeTimeStamp with MySQL strings/dates
      order_status: o.order_status,
      paymentStatus: o.payment_status,
      email: o.email,
      first_name: o.first_name,
      last_name: o.last_name,
      mobile: o.mobile,
      address1: o.address1,
      address2: o.address2,
      city: o.city,
      state: o.state,
      pincode: o.pincode,
      items: itemRows.map(item => ({
        id: item.id,
        productId: item.product_id,
        name: item.product_name || "Product",
        price: Number(item.price),
        quantity: item.quantity,
        total: Number(item.total),
        slug: item.product_slug,
        size: item.size
      })),
      amounts: {
        subtotal: Number(o.subtotal),
        shipping: Number(o.shipping_charges),
        tax: Number(o.tax),
        discount: Number(o.discount),
        total: Number(o.total),
      }
    };

    return (
      <OrderDetailsView 
        order={order} 
        back={{ href: "/dashboard", label: "Back to Dashboard" }} 
      />
    );

  } catch (error) {
    console.error("Order Page Error:", error);
    throw error; // Or return a custom error UI
  } finally {
    connection.release();
  }
}