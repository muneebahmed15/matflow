'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useClientMount } from '@/hooks/use-async-mount';
import GiSizingChart from '@/components/gym-public/GiSizingChart';
import { sanitizeBasicHtml } from '@/lib/html-sanitize';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  inventory_count: number;
  image_url: string | null;
  gallery_urls: string[];
  category: string;
};

type Props = {
  gymSlug: string;
  accent: string;
  product: Product;
};

const CART_KEY = (slug: string) => `matflow-cart-${slug}`;

export default function ProductDetailClient({ gymSlug, accent, product }: Props) {
  const [added, setAdded] = useState(false);

  useClientMount(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('added') === '1') setAdded(true);
  }, []);

  const addToCart = () => {
    try {
      const raw = localStorage.getItem(CART_KEY(gymSlug));
      const items: { id: string; quantity: number }[] = raw ? JSON.parse(raw) : [];
      const existing = items.find((i) => i.id === product.id);
      if (existing) {
        if (existing.quantity < product.inventory_count) existing.quantity += 1;
      } else {
        items.push({ id: product.id, quantity: 1 });
      }
      localStorage.setItem(CART_KEY(gymSlug), JSON.stringify(items));
      setAdded(true);
    } catch {
      // ignore
    }
  };

  const images = [
    ...(product.image_url ? [product.image_url] : []),
    ...product.gallery_urls,
  ];

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-3">
        {images.length > 0 ? (
          images.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="w-full rounded-2xl border border-white/10 object-cover" />
          ))
        ) : (
          <div className="w-full aspect-square bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/20 text-6xl font-bold">
            {product.name[0]}
          </div>
        )}
      </div>
      <div>
        <h1 className="text-3xl font-extrabold text-white mb-2">{product.name}</h1>
        <p className="text-2xl font-semibold text-white/70 mb-4">
          ${(product.price_cents / 100).toFixed(2)}
        </p>
        {product.description && (
          <div
            className="text-white/50 text-sm mb-6 prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeBasicHtml(product.description) }}
          />
        )}
        {product.category === 'gis' && <GiSizingChart accent={accent} />}
        {product.inventory_count > 0 ? (
          <div className="space-y-3">
            <button
              onClick={addToCart}
              className="w-full text-sm font-semibold py-3 rounded-xl text-white hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              Add to Cart
            </button>
            {added && (
              <Link
                href={`/g/${gymSlug}/shop`}
                className="block text-center text-sm text-white/60 hover:text-white"
              >
                View cart in shop →
              </Link>
            )}
          </div>
        ) : (
          <p className="text-white/30 text-sm">Out of stock</p>
        )}
      </div>
    </div>
  );
}
