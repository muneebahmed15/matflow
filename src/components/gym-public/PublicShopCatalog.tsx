'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useClientMount } from '@/hooks/use-async-mount';
import { ShoppingCart, X } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  price_cents: number;
  inventory_count: number;
  image_url: string | null;
  category: string;
};

type CartItem = { product: Product; quantity: number };

type Props = {
  gymId: string;
  gymSlug: string;
  accent: string;
  products: Product[];
};

const CART_KEY = (slug: string) => `matflow-cart-${slug}`;

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  apparel: 'Apparel',
  gis: 'Gis',
  gear: 'Gear',
};

export default function PublicShopCatalog({ gymId, gymSlug, accent, products }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [email, setEmail] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [message, setMessage] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return ['all', ...Array.from(cats).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (categoryFilter === 'all') return products;
    return products.filter((p) => p.category === categoryFilter);
  }, [products, categoryFilter]);

  useClientMount(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setMessage('Order placed! Check your email for confirmation.');
      localStorage.removeItem(CART_KEY(gymSlug));
      setCart([]);
    } else if (params.get('cancelled') === 'true') {
      setMessage('Checkout cancelled.');
    }
  }, [gymSlug]);

  useClientMount(() => {
    try {
      const raw = localStorage.getItem(CART_KEY(gymSlug));
      if (!raw) return;
      const ids: { id: string; quantity: number }[] = JSON.parse(raw);
      const items: CartItem[] = [];
      for (const row of ids) {
        const product = products.find((p) => p.id === row.id);
        if (product) items.push({ product, quantity: row.quantity });
      }
      setCart(items);
    } catch {
      // ignore corrupt cart
    }
  }, [gymSlug, products]);

  const persist = (items: CartItem[]) => {
    localStorage.setItem(
      CART_KEY(gymSlug),
      JSON.stringify(items.map((i) => ({ id: i.product.id, quantity: i.quantity })))
    );
    setCart(items);
  };

  const addToCart = (product: Product) => {
    const existing = cart.find((c) => c.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.inventory_count) return;
      persist(
        cart.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      persist([...cart, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    persist(cart.filter((c) => c.product.id !== productId));
  };

  const totalCents = cart.reduce((sum, i) => sum + i.product.price_cents * i.quantity, 0);

  const checkout = async () => {
    if (!email.trim() || cart.length === 0) return;
    setCheckingOut(true);
    const res = await fetch('/api/public/shop/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gym_id: gymId,
        gym_slug: gymSlug,
        customer_email: email.trim(),
        items: cart.map((c) => ({ product_id: c.product.id, quantity: c.quantity })),
      }),
    });
    const data = await res.json();
    setCheckingOut(false);
    if (data.url) window.location.href = data.url;
    else setMessage(data.error ?? 'Checkout failed');
  };

  return (
    <div>
      {message && (
        <p className="mb-6 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
          {message}
        </p>
      )}

      {cart.length > 0 && (
        <div className="mb-8 bg-[#111] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart size={18} className="text-white/60" />
            <h2 className="font-semibold text-white">Cart ({cart.length})</h2>
          </div>
          <div className="space-y-2 mb-4">
            {cart.map((item) => (
              <div key={item.product.id} className="flex justify-between items-center text-sm">
                <span className="text-white/70">
                  {item.product.name} × {item.quantity}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-white/40">
                    ${((item.product.price_cents * item.quantity) / 100).toFixed(2)}
                  </span>
                  <button onClick={() => removeFromCart(item.product.id)} className="text-white/30 hover:text-white">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-white font-semibold mb-3">Total: ${(totalCents / 100).toFixed(2)}</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email for receipt"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => void checkout()}
            disabled={checkingOut || !email.trim()}
            className="w-full text-sm font-semibold py-2.5 rounded-xl text-white disabled:opacity-50"
            style={{ backgroundColor: accent }}
          >
            {checkingOut ? 'Redirecting...' : 'Checkout with Stripe'}
          </button>
        </div>
      )}

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                categoryFilter === cat
                  ? 'text-white'
                  : 'bg-white/5 text-white/50 hover:text-white'
              }`}
              style={categoryFilter === cat ? { backgroundColor: accent } : undefined}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      )}

      {filteredProducts.length === 0 ? (
        <p className="text-white/30">No products available yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredProducts.map((p) => (
            <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <Link href={`/g/${gymSlug}/shop/${p.id}`}>
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" className="w-full aspect-square object-cover hover:opacity-90 transition" />
                ) : (
                  <div className="w-full aspect-square bg-white/5 flex items-center justify-center text-white/20 text-4xl font-bold hover:bg-white/10 transition">
                    {p.name[0]}
                  </div>
                )}
              </Link>
              <div className="p-4">
                <Link href={`/g/${gymSlug}/shop/${p.id}`} className="hover:underline">
                  <h2 className="font-semibold text-white">{p.name}</h2>
                </Link>
                <p className="text-white/50 text-sm mt-1">${(p.price_cents / 100).toFixed(2)}</p>
                {p.inventory_count > 0 ? (
                  <button
                    onClick={() => addToCart(p)}
                    className="mt-3 w-full text-center text-sm font-semibold py-2 rounded-xl text-white hover:opacity-90"
                    style={{ backgroundColor: accent }}
                  >
                    Add to Cart
                  </button>
                ) : (
                  <p className="mt-3 text-center text-xs text-white/30">Out of stock</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
