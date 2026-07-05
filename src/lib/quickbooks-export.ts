type QuickBooksOrderRow = {
  id: string;
  created_at: string;
  customer_email: string | null;
  status: string;
  total_cents: number;
  order_items?: {
    quantity: number;
    unit_price_cents: number;
    products: { name: string } | { name: string }[] | null;
  }[];
};

function productName(
  products: { name: string } | { name: string }[] | null | undefined
): string {
  if (!products) return 'Product';
  return Array.isArray(products) ? (products[0]?.name ?? 'Product') : products.name;
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** CSV suitable for QuickBooks Online sales receipt import. */
export function formatShopOrdersForQuickBooks(orders: QuickBooksOrderRow[]): string {
  const headers = [
    'Date',
    'Customer',
    'Order ID',
    'Status',
    'Item',
    'Quantity',
    'Rate',
    'Amount',
  ];

  const rows: string[][] = [headers];

  for (const order of orders) {
    const items = order.order_items ?? [];
    if (items.length === 0) {
      rows.push([
        formatDate(order.created_at),
        order.customer_email ?? 'Guest',
        order.id?.slice(0, 8) ?? '',
        order.status,
        'Shop order',
        '1',
        (order.total_cents / 100).toFixed(2),
        (order.total_cents / 100).toFixed(2),
      ]);
      continue;
    }

    for (const item of items) {
      const lineTotal = (item.quantity * item.unit_price_cents) / 100;
      rows.push([
        formatDate(order.created_at),
        order.customer_email ?? 'Guest',
        order.id?.slice(0, 8) ?? '',
        order.status,
        productName(item.products),
        String(item.quantity),
        (item.unit_price_cents / 100).toFixed(2),
        lineTotal.toFixed(2),
      ]);
    }
  }

  return rows.map((row) => row.map((cell) => escapeCsv(cell)).join(',')).join('\n');
}
