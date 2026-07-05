import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export type WaiverPdfInput = {
  gymName: string;
  waiverTitle: string;
  waiverBody: string;
  signedName: string;
  signedAt: string;
  memberEmail?: string | null;
  witnessName?: string;
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

/** Build a simple signed-waiver PDF document. */
export async function buildWaiverPdf(input: WaiverPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([612, 792]);
  let y = 740;
  const margin = 50;
  const lineHeight = 14;

  const draw = (text: string, size = 11, useBold = false) => {
    for (const line of wrapText(text, 90)) {
      if (y < 60) {
        page = doc.addPage([612, 792]);
        y = 740;
      }
      page.drawText(line, {
        x: margin,
        y,
        size,
        font: useBold ? bold : font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= lineHeight;
    }
  };

  draw(input.gymName, 16, true);
  y -= 4;
  draw(input.waiverTitle, 14, true);
  y -= 8;
  draw(input.waiverBody);
  y -= 12;
  draw('—'.repeat(40));
  draw(`Signed by: ${input.signedName}`, 12, true);
  if (input.witnessName) draw(`Witness: ${input.witnessName}`, 11);
  if (input.memberEmail) draw(`Email: ${input.memberEmail}`);
  draw(`Date: ${new Date(input.signedAt).toLocaleString()}`);

  return doc.save();
}
