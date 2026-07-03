'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Package } from 'lucide-react';
import { usePortalMember } from '@/lib/portal-member-context';
import { ListSkeleton } from '@/components/LoadingSkeleton';

type Order = {
  id: string;
  status: string;
  total_cents: number;
  created_at: string;
  order_items: { quantity: number; products: { name: string } | null }[];
};

export default function PortalOrdersPage() {
  const { activeMember, loading: memberLoading } = usePortalMember();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeMember) return;
    void (async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, status, total_cents, created_at, order_items(quantity, products(name))')
        .eq('member_id', activeMember.id)
        .order('created_at', { ascending: false });
      setOrders((data as unknown as Order[]) ?? []);
      setLoading(false);
    })();
  }, [activeMember]);

  if (memberLoading || loading || !activeMember) {
    return <ListSkeleton count={3} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portal" className="text-sm text-gray-400 hover:text-white">← Back</Link>
        <h1 className="text-2xl font-bold mt-2">My Orders</h1>
        <p className="text-white/40 text-sm mt-1">
          {activeMember.first_name} {activeMember.last_name}
        </p>
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-12 text-white/30">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          No orders yet.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-[#111] border border-white/10 rounded-2xl p-5">
              <div className="flex justify-between mb-2">
                <span className="text-white font-medium capitalize">{o.status}</span>
                <span className="text-white/40 text-sm">${(o.total_cents / 100).toFixed(2)}</span>
              </div>
              <ul className="text-white/50 text-xs space-y-0.5">
                {o.order_items?.map((item, i) => (
                  <li key={i}>
                    {item.products?.name ?? 'Item'} × {item.quantity}
                  </li>
                ))}
              </ul>
              <p className="text-white/20 text-xs mt-2">{new Date(o.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
