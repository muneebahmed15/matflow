'use client';

import { useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import { ShoppingBag } from 'lucide-react';
import { createProductAction, listProductsAction, listOrdersAction, fulfillOrderAction } from '@/app/(dashboard)/actions';

export default function ShopAdminPage() {
  const [products, setProducts] = useState<
    { id: string; name: string; price_cents: number; inventory_count: number; is_active: boolean }[]
  >([]);
  const [orders, setOrders] = useState<
    { id: string; status: string; total_cents: number; customer_email: string | null; created_at: string }[]
  >([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [inventory, setInventory] = useState('10');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [prodRes, ordRes] = await Promise.all([listProductsAction(), listOrdersAction()]);
    if (prodRes.ok && prodRes.data) setProducts(prodRes.data);
    if (ordRes.ok && ordRes.data) setOrders(ordRes.data as typeof orders);
    setLoading(false);
  };

  useAsyncMount(load, []);

  const add = async () => {
    const cents = Math.round(parseFloat(price) * 100);
    if (!name || isNaN(cents)) return;
    await createProductAction({
      name,
      priceCents: cents,
      inventoryCount: parseInt(inventory, 10) || 0,
    });
    setName('');
    setPrice('');
    void load();
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2">Shop</h1>
      <p className="text-white/40 text-sm mb-8">Manage merchandise. Enable the store in Settings.</p>

      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-8 grid grid-cols-3 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" className={inputClass} />
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price ($)" className={inputClass} />
        <input value={inventory} onChange={(e) => setInventory(e.target.value)} placeholder="Stock" className={inputClass} />
        <button onClick={() => void add()} className="col-span-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm">
          Add Product
        </button>
      </div>

      {loading ? (
        <p className="text-white/30">Loading...</p>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-white/30">
          <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
          No products yet.
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className={`bg-white/5 border rounded-xl px-4 py-3 flex justify-between ${p.inventory_count < 3 ? 'border-yellow-500/30' : 'border-white/10'}`}>
              <span className="text-white text-sm">
                {p.name}
                {p.inventory_count < 3 && p.inventory_count > 0 && (
                  <span className="text-yellow-400 text-xs ml-2">Low stock</span>
                )}
              </span>
              <span className="text-white/40 text-sm">
                ${(p.price_cents / 100).toFixed(2)} · {p.inventory_count} in stock
              </span>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-semibold text-white mb-3 mt-10">Recent Orders</h2>
      {orders.length === 0 ? (
        <p className="text-white/30 text-sm">No orders yet.</p>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex justify-between items-center text-sm">
              <div>
                <span className="text-white/60">{o.customer_email ?? 'Guest'}</span>
                <span className="text-white/40 block text-xs">
                  ${(o.total_cents / 100).toFixed(2)} · {o.status}
                </span>
              </div>
              {o.status === 'paid' && (
                <button
                  onClick={async () => {
                    const tracking = window.prompt('Tracking number (optional):') ?? undefined;
                    await fulfillOrderAction(o.id, tracking || undefined);
                    void load();
                  }}
                  className="text-xs text-green-400 hover:underline"
                >
                  Mark fulfilled
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
