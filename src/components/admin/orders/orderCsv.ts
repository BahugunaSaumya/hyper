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
    const addr = o.shippingAddress || {};
    const totals = o.totals || {};

    return [
      o.id,
      formatIST(o.createdAt),
      o.status,

      o.customer?.name || "",
      o.customer?.email || "",
      o.customer?.phone || "",

      addr.line1 || "",
      addr.line2 || "",
      addr.city || "",
      addr.state || "",
      addr.postalCode || "",
      addr.country || "",

      parseNumber(totals.subtotal),
      parseNumber(totals.discount),
      parseNumber(totals.tax),
      parseNumber(totals.shipping),
      parseNumber(totals.total),

      o.payment?.method || "",
      o.payment?.status || "",
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
    "item_qty",
    "item_unit_price",
    "item_base",
    "item_discount",
    "item_tax",
    "item_total",
  ];

  const rows: any[] = [];

  orders.forEach(order => {
    const totals = order.totals || {};
    (order.items || []).forEach((item: any) => {
      const qty = parseNumber(item.qty);
      const price = parseNumber(item.unitPrice);
      const tax = parseNumber(item.taxAmount);
      const discount = parseNumber(item.discount);

      rows.push([
        order.id,
        formatIST(order.createdAt),
        order.status,
        order.customer?.name || "",
        order.customer?.email || "",
        order.customer?.phone || "",
        totals.subtotal,
        totals.tax,
        totals.discount || "",
        totals.shipping || "",
        totals.total,
        item.id || "",
        item.title || "",
        item.size || "",
        qty,
        price,
        item.baseAmount || "",
        discount,
        tax,
        item.totalAmount,
      ]);
    });
  });

  const csv = toCsv([headers, ...rows]);
  download(`order_items_${Date.now()}.csv`, csv);
}
