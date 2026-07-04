import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export type BeltCertificateInput = {
  gymName: string;
  memberName: string;
  fromBelt: string;
  toBelt: string;
  promotedAt: string;
  ceremonyDate?: string | null;
  notes?: string | null;
};

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildBeltCertificatePdf(input: BeltCertificateInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([792, 612]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const centerX = 396;

  const drawCentered = (text: string, y: number, size: number, useBold = false) => {
    const f = useBold ? bold : font;
    const width = f.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: centerX - width / 2,
      y,
      size,
      font: f,
      color: rgb(0.1, 0.1, 0.1),
    });
  };

  drawCentered('Certificate of Promotion', 500, 28, true);
  drawCentered(input.gymName, 470, 14);
  drawCentered('This certifies that', 420, 12);
  drawCentered(input.memberName, 390, 22, true);
  drawCentered(
    `has been promoted from ${input.fromBelt} to ${input.toBelt} belt`,
    355,
    14
  );
  drawCentered(`Date: ${new Date(input.promotedAt).toLocaleDateString()}`, 320, 11);
  if (input.ceremonyDate) {
    drawCentered(`Ceremony: ${new Date(input.ceremonyDate).toLocaleDateString()}`, 300, 11);
  }
  if (input.notes?.trim()) {
    let y = 260;
    for (const line of wrapText(input.notes.trim(), 70)) {
      drawCentered(line, y, 10);
      y -= 14;
    }
  }

  return doc.save();
}
