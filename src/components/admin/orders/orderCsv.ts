import { toCsv } from "@/lib/admin/csv";
import { formatIST } from "@/lib/time";

/**
 * Helpers
 */
const parseNumber = (v: any) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const download = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * ===========================
 * ORDERS CSV (Order-level)
 * ===========================
 */
export function downloadOrdersCsv(orders: any[]) {
  const headers = [
    "order_id",
    "order_number",
    "order_date",
    "status",

    "customer_name",
    "customer_email",
    "customer_phone",

    "address_line1",
    "address_line2",
    "city",
    "state",
    "postal_code",
    "country",

    "subtotal",
    "discount",
    "tax",
    "shipping",
    "total",

    "payment_method",
    "payment_status",
  ];
  const rows = orders.map(o => {
    const fullName = (o.first_name + " " + o.last_name) || '';
    return [
      o.order_id,
      o.order_number,
      new Date(o.created_at).toLocaleDateString(),
      o.order_status,

      fullName,
      o.order_email || "",
      o.shipping_phone || "",

      o.address1 || "",
      o.address2 || "",
      o.city || "",
      o.state || "",
      o.pincode || "",
      o.country || "India",

      o.subtotal || "",
      o.discount || "",
      o.tax || "",
      o.shipping_charges || "",
      o.total || "",

      "razorpay",
      o.payment_status || "",
    ];
  });

  const csv = toCsv([headers, ...rows]);
  download(`orders_${Date.now()}.csv`, csv);
}

/**
 * ===========================
 * ORDER ITEMS CSV (Item-level – CA friendly)
 * ===========================
 */
export function downloadOrderItemsCsv(orders: any[]) {
  const headers = [
    "order_id",
    "order_number",
    "order_date",
    "status",

    "customer_name",
    "customer_email",
    "customer_phone",

    "order_subtotal",
    "order_tax",
    "order_discount",
    "order_shipping",
    "order_total",

    "item_id",
    "item_name",
    "item_size",
    "item_mrp",
    "item_qty",
    "item_unit_price",
    "item_subtotal",
    "item_tax",
    "item_discount",
    "item_shipping_total",
    "item_total",
  ];

  const rows: any[] = [];

  orders.forEach(order => {
    (order.items || []).forEach((item: any) => {
      const fullName = (order.first_name + " " + order.last_name) || '';
      rows.push([
        order.order_id,
        order.order_number,
        new Date(order.created_at).toLocaleDateString(),
        order.order_status,
        fullName,
        order.order_email || "",
        order.shipping_phone || "",
        order.subtotal || "",
        order.tax || "",
        order.discount || "",
        order.shipping_charges || "",
        order.total || "",
        item.id || "",
        item.title || "",
        item.size || "",
        item.mrp || "",
        item.quantity || "",
        item.price || "",
        item.subtotal || "",
        item.tax || "",
        item.discount || "",
        item.shipping_total || "",
        item.item_total || "",
      ]);
    });
  });

  const csv = toCsv([headers, ...rows]);
  download(`order_items_${Date.now()}.csv`, csv);
}
