'use client';

import { useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import { ShoppingBag } from 'lucide-react';
import {
  createProductAction,
  listProductsAction,
  listOrdersAction,
  fulfillOrderAction,
  getShopRevenueAction,
  listProductVariantsAction,
  createProductVariantAction,
  adjustStockAction,
} from '@/app/(dashboard)/actions';

const CATEGORIES = [
  { value: 'apparel', label: 'Apparel' },
  { value: 'gis', label: 'Gis' },
  { value: 'gear', label: 'Gear' },
];

type Product = {
  id: string;
  name: string;
  price_cents: number;
  inventory_count: number;
  is_active: boolean;
  category: string;
  members_only: boolean;
};

type Variant = {
  id: string;
  label: string;
  sku: string | null;
  price_cents: number | null;
  inventory_count: number;
};

type RevenueRow = {
  productId: string;
  name: string;
  unitsSold: number;
  revenueCents: number;
};

export default function ShopAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<
    { id: string; status: string; total_cents: number; customer_email: string | null; created_at: string }[]
  >([]);
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [variantsByProduct, setVariantsByProduct] = useState<Record<string, Variant[]>>({});
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [inventory, setInventory] = useState('10');
  const [category, setCategory] = useState('apparel');
  const [membersOnly, setMembersOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [variantForms, setVariantForms] = useState<Record<string, { label: string; sku: string; stock: string }>>({});

  const load = async () => {
    const [prodRes, ordRes, revRes] = await Promise.all([
      listProductsAction(),
      listOrdersAction(),
      getShopRevenueAction(),
    ]);
    if (prodRes.ok && prodRes.data) {
      const prods = prodRes.data as Product[];
      setProducts(prods);
      const variantMap: Record<string, Variant[]> = {};
      await Promise.all(
        prods.map(async (p) => {
          const vRes = await listProductVariantsAction(p.id);
          if (vRes.ok && vRes.data) variantMap[p.id] = vRes.data as Variant[];
        })
      );
      setVariantsByProduct(variantMap);
    }
    if (ordRes.ok && ordRes.data) setOrders(ordRes.data as typeof orders);
    if (revRes.ok && revRes.data) setRevenue(revRes.data);
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
      category,
      membersOnly,
    });
    setName('');
    setPrice('');
    void load();
  };

  const addVariant = async (productId: string) => {
    const form = variantForms[productId] ?? { label: '', sku: '', stock: '0' };
    if (!form.label.trim()) return;
    await createProductVariantAction({
      productId,
      label: form.label,
      sku: form.sku || undefined,
      inventoryCount: parseInt(form.stock, 10) || 0,
    });
    setVariantForms((prev) => ({ ...prev, [productId]: { label: '', sku: '', stock: '0' } }));
    void load();
  };

  const adjustStock = async (productId: string, delta: number) => {
    const reason = window.prompt(`Reason for ${delta > 0 ? 'adding' : 'removing'} stock:`) ?? undefined;
    await adjustStockAction({ productId, delta, reason });
    void load();
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2">Shop</h1>
      <p className="text-white/40 text-sm mb-8">Manage merchandise. Enable the store in Settings.</p>

      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-8 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" className={inputClass} />
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price ($)" className={inputClass} />
          <input value={inventory} onChange={(e) => setInventory(e.target.value)} placeholder="Stock" className={inputClass} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} className="bg-gray-900">
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={membersOnly}
            onChange={(e) => setMembersOnly(e.target.checked)}
            className="rounded"
          />
          Members only (hidden from public shop)
        </label>
        <button onClick={() => void add()} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm">
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
        <div className="space-y-4">
          {products.map((p) => (
            <div key={p.id} className={`bg-white/5 border rounded-xl p-4 ${p.inventory_count < 3 ? 'border-yellow-500/30' : 'border-white/10'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-white text-sm font-medium">{p.name}</span>
                  {p.members_only && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded-full">
                      Members only
                    </span>
                  )}
                  {p.inventory_count < 3 && p.inventory_count > 0 && (
                    <span className="text-yellow-400 text-xs ml-2">Low stock</span>
                  )}
                  <p className="text-white/30 text-xs mt-0.5 capitalize">{p.category}</p>
                </div>
                <span className="text-white/40 text-sm">
                  ${(p.price_cents / 100).toFixed(2)} · {p.inventory_count} in stock
                </span>
              </div>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => void adjustStock(p.id, 1)}
                  className="text-xs text-green-400 hover:underline"
                >
                  +1 stock
                </button>
                <button
                  onClick={() => void adjustStock(p.id, -1)}
                  className="text-xs text-red-400 hover:underline"
                >
                  −1 stock
                </button>
              </div>
              {(variantsByProduct[p.id] ?? []).length > 0 && (
                <div className="mb-3 space-y-1">
                  <p className="text-white/40 text-xs uppercase tracking-wide">Variants</p>
                  {(variantsByProduct[p.id] ?? []).map((v) => (
                    <p key={v.id} className="text-white/60 text-xs">
                      {v.label}
                      {v.sku ? ` (${v.sku})` : ''} · {v.inventory_count} in stock
                      {v.price_cents != null ? ` · $${(v.price_cents / 100).toFixed(2)}` : ''}
                    </p>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={variantForms[p.id]?.label ?? ''}
                  onChange={(e) =>
                    setVariantForms((prev) => ({
                      ...prev,
                      [p.id]: { ...(prev[p.id] ?? { label: '', sku: '', stock: '0' }), label: e.target.value },
                    }))
                  }
                  placeholder="Variant label (e.g. Size M)"
                  className={`${inputClass} flex-1`}
                />
                <input
                  value={variantForms[p.id]?.stock ?? '0'}
                  onChange={(e) =>
                    setVariantForms((prev) => ({
                      ...prev,
                      [p.id]: { ...(prev[p.id] ?? { label: '', sku: '', stock: '0' }), stock: e.target.value },
                    }))
                  }
                  placeholder="Stock"
                  className={`${inputClass} w-20`}
                />
                <button
                  onClick={() => void addVariant(p.id)}
                  className="text-blue-400 text-sm hover:underline whitespace-nowrap px-2"
                >
                  Add variant
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-semibold text-white mb-3 mt-10">Revenue by Product</h2>
      {revenue.length === 0 ? (
        <p className="text-white/30 text-sm">No paid orders yet.</p>
      ) : (
        <div className="space-y-2 mb-10">
          {revenue.map((row) => (
            <div key={row.productId} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex justify-between text-sm">
              <span className="text-white">{row.name}</span>
              <span className="text-white/40">
                {row.unitsSold} sold · ${(row.revenueCents / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-semibold text-white mb-3">Recent Orders</h2>
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
