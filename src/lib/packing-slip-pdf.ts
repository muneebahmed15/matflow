import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export type PackingSlipLine = {
  name: string;
  quantity: number;
  unitPriceCents: number;
};

export type ShippingAddress = {
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
};

export type PackingSlipInput = {
  gymName: string;
  orderId: string;
  customerEmail: string | null;
  fulfillmentType: 'pickup' | 'ship';
  shippingAddress?: ShippingAddress | null;
  items: PackingSlipLine[];
  totalCents: number;
  createdAt: string;
};

export async function buildPackingSlipPdf(input: PackingSlipInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 740;

  const draw = (text: string, size = 11, useBold = false) => {
    page.drawText(text, {
      x: 50,
      y,
      size,
      font: useBold ? bold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= size + 6;
  };

  draw('Packing Slip', 20, true);
  draw(input.gymName, 12);
  draw(`Order #${input.orderId.slice(0, 8)} · ${new Date(input.createdAt).toLocaleDateString()}`, 10);
  draw(`Fulfillment: ${input.fulfillmentType === 'ship' ? 'Ship' : 'Pick up at gym'}`, 10);
  if (input.customerEmail) draw(`Customer: ${input.customerEmail}`, 10);

  if (input.fulfillmentType === 'ship' && input.shippingAddress) {
    y -= 6;
    draw('Ship to:', 11, true);
    const addr = input.shippingAddress;
    if (addr.name) draw(addr.name, 10);
    draw(addr.line1, 10);
    if (addr.line2) draw(addr.line2, 10);
    draw(`${addr.city}, ${addr.state} ${addr.postal_code}`, 10);
    if (addr.country) draw(addr.country, 10);
  }

  y -= 10;
  draw('Items', 12, true);
  for (const item of input.items) {
    draw(
      `${item.quantity}× ${item.name} — $${((item.unitPriceCents * item.quantity) / 100).toFixed(2)}`,
      10
    );
  }

  y -= 6;
  draw(`Total: $${(input.totalCents / 100).toFixed(2)}`, 12, true);

  return doc.save();
}
