import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { BusinessMetrics, BusinessRecommendation } from '@/services/business-assistant';

export type DigestPdfInput = {
  gymName: string;
  snapshotDate: string;
  metrics: BusinessMetrics;
  recommendations: BusinessRecommendation[];
};

export async function buildDigestPdf(input: DigestPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 740;

  const draw = (text: string, size = 11, useBold = false) => {
    page.drawText(text.slice(0, 90), {
      x: 50,
      y,
      size,
      font: useBold ? bold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= size + 6;
  };

  draw('Daily Business Digest', 20, true);
  draw(input.gymName, 12);
  draw(`Snapshot: ${input.snapshotDate}`, 10);
  y -= 8;
  draw('Metrics', 12, true);

  for (const [key, value] of Object.entries(input.metrics)) {
    draw(`${key}: ${value}`, 10);
  }

  y -= 8;
  draw('Recommended actions', 12, true);

  if (input.recommendations.length === 0) {
    draw('No urgent actions.', 10);
  } else {
    for (const rec of input.recommendations) {
      draw(`[${rec.priority}] ${rec.title}`, 10, true);
      draw(rec.description, 10);
      y -= 4;
    }
  }

  return doc.save();
}
