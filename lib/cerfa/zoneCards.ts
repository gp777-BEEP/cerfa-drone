import { PDFDocument, StandardFonts, rgb, PDFImage } from "pdf-lib";

export interface ZoneCardInput {
  title: string;
  address?: string | null;
  images: Uint8Array[]; // JPEG ou PNG déjà décodées
  notes?: string | null;
  distanceMaxM?: number | null;
  heightMaxM?: number | null;
}

const PAGE_W = 595.28; // A4 en points
const PAGE_H = 841.89;
const MARGIN = 56; // ~20mm
const RED = rgb(0.878, 0.353, 0.306);

async function embedAny(pdfDoc: PDFDocument, bytes: Uint8Array): Promise<PDFImage> {
  try {
    return await pdfDoc.embedJpg(bytes);
  } catch {
    return await pdfDoc.embedPng(bytes);
  }
}

/**
 * Génère un PDF "Zones de vol" (une page par zone), même mise en page que le
 * prototype Python (generate_zone_cards.py) et que les fiches DroneKeeper
 * existantes de l'utilisateur : titre, adresse, distance/hauteur max, carte(s),
 * consignes, légende "Zone de vol".
 */
export async function generateZoneCards(missionTitle: string | undefined, zones: ZoneCardInput[]) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  if (missionTitle) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    page.drawText(missionTitle, {
      x: PAGE_W / 2 - font.widthOfTextAtSize(missionTitle, 26) / 2,
      y: PAGE_H / 2,
      size: 26,
      font,
    });
  }

  for (const zone of zones) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    if (missionTitle) {
      page.drawText(missionTitle, { x: MARGIN, y: PAGE_H - 34, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
    }

    page.drawText(zone.title, { x: MARGIN, y: y - 34, size: 30, font });
    y -= 56;

    if (zone.address) {
      const w = font.widthOfTextAtSize(zone.address, 11);
      page.drawText(zone.address, { x: PAGE_W / 2 - w / 2, y, size: 11, font });
      y -= 22;
    }

    if (zone.distanceMaxM || zone.heightMaxM) {
      if (zone.distanceMaxM) {
        const t = `Distance max ${zone.distanceMaxM} m`;
        const w = fontBold.widthOfTextAtSize(t, 12);
        page.drawText(t, { x: PAGE_W / 2 - w / 2, y, size: 12, font: fontBold });
        y -= 17;
      }
      if (zone.heightMaxM) {
        const t = `Hauteur max ${zone.heightMaxM} m`;
        const w = fontBold.widthOfTextAtSize(t, 12);
        page.drawText(t, { x: PAGE_W / 2 - w / 2, y, size: 12, font: fontBold });
        y -= 17;
      }
      y -= 6;
    }

    const reserveBottom = MARGIN + 70; // notes + légende
    const availableH = y - reserveBottom;
    const perImageH = availableH / Math.max(zone.images.length, 1);

    for (const imgBytes of zone.images) {
      try {
        const img = await embedAny(pdfDoc, imgBytes);
        const maxW = PAGE_W - 2 * MARGIN;
        const maxH = perImageH - 10;
        const scale = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawImage(img, { x: PAGE_W / 2 - w / 2, y: y - h, width: w, height: h });
        y -= h + 14;
      } catch {
        // image illisible : on l'ignore plutôt que de faire échouer tout le dossier
        y -= 10;
      }
    }

    if (zone.notes) {
      const w = font.widthOfTextAtSize(zone.notes, 11);
      page.drawText(zone.notes, { x: Math.max(MARGIN, PAGE_W / 2 - w / 2), y, size: 11, font });
      y -= 20;
    }

    // légende
    page.drawRectangle({ x: PAGE_W / 2 - 60, y: MARGIN, width: 14, height: 14, color: RED });
    page.drawText("Zone de vol", { x: PAGE_W / 2 - 40, y: MARGIN + 3, size: 11, font });
  }

  return pdfDoc.save();
}
