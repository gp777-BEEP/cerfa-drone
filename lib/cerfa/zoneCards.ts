import { PDFDocument, StandardFonts, rgb, PDFImage } from "pdf-lib";

export interface ZoneCardInput {
  title: string;
  address?: string | null;
  images: Uint8Array[]; // JPEG ou PNG déjà décodées
  notes?: string | null;
  distanceMaxM?: number | null;
  heightMaxM?: number | null;
  // Métadonnées de la carte générée (1ère image) : échelle + attribution à
  // dessiner par-dessus au moment du placement sur la page (le PNG lui-même
  // ne contient aucun texte, cf. staticMap.ts).
  mapMeta?: {
    width: number;
    height: number;
    hasPilot?: boolean;
    scaleBar?: { xPx: number; yPx: number; widthPx: number; label: string };
    attribution?: { xPx: number; yPx: number; text: string };
  } | null;
}

const PAGE_W = 595.28; // A4 en points
const PAGE_H = 841.89;
const MARGIN = 56; // ~20mm
const RED = rgb(0.878, 0.353, 0.306);
const BLUE = rgb(0.114, 0.306, 0.847);
const DARK = rgb(0.102, 0.114, 0.129);
const GRAY = rgb(0.392, 0.451, 0.545);

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
    let hasPilotOnMap = false;

    for (let idx = 0; idx < zone.images.length; idx++) {
      const imgBytes = zone.images[idx];
      try {
        const img = await embedAny(pdfDoc, imgBytes);
        const maxW = PAGE_W - 2 * MARGIN;
        const maxH = perImageH - 10;
        const scale = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const imgX = PAGE_W / 2 - w / 2;
        const imgYBottom = y - h;
        page.drawImage(img, { x: imgX, y: imgYBottom, width: w, height: h });

        // Texte de la carte (échelle, attribution) : dessiné ici plutôt que
        // dans le PNG lui-même (police non fiable en prod dans sharp/librsvg,
        // cf. conversation -> tofu boxes). On reconvertit les coordonnées
        // pixel de l'image d'origine vers l'espace PDF avec le même facteur
        // d'échelle que l'image affichée.
        const meta = idx === 0 ? zone.mapMeta : null;
        if (meta?.scaleBar) {
          const s = w / meta.width;
          const label = meta.scaleBar.label;
          const size = 10 * s;
          const tw = fontBold.widthOfTextAtSize(label, size);
          const px = imgX + meta.scaleBar.xPx * s - tw / 2;
          const py = imgYBottom + (meta.height - meta.scaleBar.yPx) * s;
          page.drawText(label, { x: px, y: py, size, font: fontBold, color: DARK });
        }
        if (meta?.attribution) {
          const s = w / meta.width;
          const size = 9 * s;
          const text = meta.attribution.text;
          const tw = font.widthOfTextAtSize(text, size);
          const px = imgX + meta.attribution.xPx * s - tw;
          const py = imgYBottom + (meta.height - meta.attribution.yPx) * s;
          page.drawText(text, { x: px, y: py, size, font, color: GRAY });
        }
        if (meta?.hasPilot) hasPilotOnMap = true;

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
    if (hasPilotOnMap) {
      // deux éléments de légende : zone (carré rouge) + télépilote (point
      // bleu), centrés ensemble plutôt que le seul carré rouge.
      page.drawRectangle({ x: PAGE_W / 2 - 130, y: MARGIN, width: 14, height: 14, color: RED });
      page.drawText("Zone de vol", { x: PAGE_W / 2 - 110, y: MARGIN + 3, size: 11, font });
      page.drawCircle({ x: PAGE_W / 2 + 40, y: MARGIN + 7, size: 7, color: BLUE });
      page.drawText("Position du télépilote", { x: PAGE_W / 2 + 55, y: MARGIN + 3, size: 11, font });
    } else {
      page.drawRectangle({ x: PAGE_W / 2 - 60, y: MARGIN, width: 14, height: 14, color: RED });
      page.drawText("Zone de vol", { x: PAGE_W / 2 - 40, y: MARGIN + 3, size: 11, font });
    }
  }

  return pdfDoc.save();
}
