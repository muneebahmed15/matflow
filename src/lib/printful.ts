import { ServiceError } from '@/services/errors';

const PRINTFUL_API = 'https://api.printful.com';

export async function submitPrintfulOrder(input: {
  apiKey: string;
  storeId: string;
  recipient: {
    name: string;
    address1: string;
    city: string;
    state_code: string;
    country_code: string;
    zip: string;
  };
  items: Array<{ variant_id: string; quantity: number }>;
}): Promise<{ printfulOrderId: number }> {
  const response = await fetch(`${PRINTFUL_API}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
      'X-PF-Store-Id': input.storeId,
    },
    body: JSON.stringify({ recipient: input.recipient, items: input.items }),
  });

  const data = (await response.json()) as {
    result?: { id?: number };
    error?: { message?: string };
  };

  if (!response.ok || !data.result?.id) {
    throw new ServiceError(502, data.error?.message ?? 'Printful order failed');
  }

  return { printfulOrderId: data.result.id };
}

export async function syncPrintfulTracking(input: {
  apiKey: string;
  printfulOrderId: number;
}): Promise<{ trackingNumber: string | null; carrier: string | null }> {
  const response = await fetch(`${PRINTFUL_API}/orders/${input.printfulOrderId}`, {
    headers: { Authorization: `Bearer ${input.apiKey}` },
  });

  const data = (await response.json()) as {
    result?: { shipments?: Array<{ tracking_number?: string; carrier?: string }> };
  };

  const shipment = data.result?.shipments?.[0];
  return {
    trackingNumber: shipment?.tracking_number ?? null,
    carrier: shipment?.carrier ?? null,
  };
}
