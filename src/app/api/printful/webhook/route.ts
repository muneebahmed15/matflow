import { NextRequest, NextResponse } from 'next/server';
import { syncPrintfulTracking } from '@/lib/printful';
import { getAdminClient } from '@/lib/supabase/admin';
import { fulfillOrder } from '@/services/merchandise';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { type?: string; data?: { order?: { id?: number } } };
  if (body.type !== 'package_shipped' || !body.data?.order?.id) {
    return NextResponse.json({ ok: true });
  }

  const printfulOrderId = body.data.order.id;
  const admin = getAdminClient();

  const { data: order } = await admin
    .from('orders')
    .select('id, gym_id')
    .eq('printful_order_id', printfulOrderId)
    .maybeSingle();

  if (!order) return NextResponse.json({ ok: true });

  const { data: gym } = await admin
    .from('gyms')
    .select('printful_api_key')
    .eq('id', order.gym_id)
    .maybeSingle();

  if (!gym?.printful_api_key) return NextResponse.json({ ok: true });

  try {
    const tracking = await syncPrintfulTracking({
      apiKey: gym.printful_api_key,
      printfulOrderId,
    });
    if (tracking.trackingNumber) {
      await fulfillOrder(order.gym_id, order.id, {
        trackingNumber: tracking.trackingNumber,
        carrier: tracking.carrier ?? undefined,
      });
    }
  } catch (err) {
    logger.warn({ err, orderId: order.id }, 'Printful webhook failed');
  }

  return NextResponse.json({ ok: true });
}
