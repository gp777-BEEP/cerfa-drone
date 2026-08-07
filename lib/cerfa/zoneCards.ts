import { PDFDocument, StandardFonts, rgb, PDFImage } from "pdf-lib";

export interface ZoneCardInput {
  title: string;
  address?: string | null;
  images: Uint8Array[]; // JPEG ou PNG déjà décodées
  notes?: string | null;
  // "Description du site" du Cerfa : pas de champ texte remplissable dans le
  // PDF officiel (seule la case "descriptif joint séparément" existe), donc
  // ce texte est imprimé ici, sur la fiche de zone jointe au dossier.
  descriptionSite?: string | null;
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

function hexToRgbColor(hex: string) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return rgb(0.255, 0.98, 0.733); // vert par défaut (#41fabb)
  return rgb(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255);
}

// Personnalisation du dossier : logo + couleur d'accent affichés sur la page
// de garde et les fiches de zone générées, jamais sur le Cerfa officiel
// lui-même (ce fichier ne touche que les fiches de zone / page de garde).
// Quatre styles au choix (présentés à l'utilisateur sous forme de 4
// propositions visuelles), du plus discret au plus marqué.
export type DossierStyle = "bandeau" | "garde" | "filigrane" | "combine";

// Style "filigrane" : petit repère en bas à droite, présence minimale.
function drawCornerTick(page: any, logoImg: PDFImage | null, color: ReturnType<typeof rgb>) {
  const tickSize = 8;
  const tickX = PAGE_W - MARGIN - tickSize;
  const tickY = MARGIN - 6;
  page.drawRectangle({ x: tickX, y: tickY, width: tickSize, height: tickSize, color, opacity: 0.55 });
  if (logoImg) {
    const maxDim = 26;
    const scale = Math.min(maxDim / logoImg.width, maxDim / logoImg.height, 1);
    const w = logoImg.width * scale;
    const h = logoImg.height * scale;
    page.drawImage(logoImg, {
      x: tickX - w - 8,
      y: tickY + tickSize / 2 - h / 2,
      width: w,
      height: h,
      opacity: 0.45,
    });
  }
}

// Style "bandeau" : petit logo en coin, filet de couleur sous le titre de
// chaque page (repris à l'identique sur la page de garde et les fiches).
function drawHeaderBandeau(page: any, logoImg: PDFImage | null, color: ReturnType<typeof rgb>) {
  const lineY = PAGE_H - MARGIN - 44;
  page.drawRectangle({ x: MARGIN, y: lineY, width: PAGE_W - 2 * MARGIN, height: 1.4, color });
  if (logoImg) {
    const maxDim = 20;
    const scale = Math.min(maxDim / logoImg.width, maxDim / logoImg.height, 1);
    const w = logoImg.width * scale;
    const h = logoImg.height * scale;
    page.drawImage(logoImg, { x: MARGIN, y: PAGE_H - 30 - h, width: w, height: h, opacity: 0.9 });
  }
}

// Style "garde" (et variante "combine") : bandeau coloré en haut de la page
// de garde, avec le logo centré dedans (en blanc si pas de logo, un simple
// bandeau de couleur reste marquant).
function drawCoverBand(page: any, logoImg: PDFImage | null, color: ReturnType<typeof rgb>, slim: boolean) {
  const bandH = slim ? 70 : PAGE_H * 0.24;
  page.drawRectangle({ x: 0, y: PAGE_H - bandH, width: PAGE_W, height: bandH, color });
  if (logoImg) {
    const maxDim = slim ? 34 : 64;
    const scale = Math.min(maxDim / logoImg.width, maxDim / logoImg.height, 1);
    const w = logoImg.width * scale;
    const h = logoImg.height * scale;
    page.drawImage(logoImg, { x: PAGE_W / 2 - w / 2, y: PAGE_H - bandH / 2 - h / 2, width: w, height: h });
  }
}

function drawBranding(page: any, style: DossierStyle, isCover: boolean, logoImg: PDFImage | null, color: ReturnType<typeof rgb>) {
  if (style === "garde") {
    if (isCover) drawCoverBand(page, logoImg, color, false);
    else drawCornerTick(page, null, color); // fiches de zone : couleur seule, sobre
    return;
  }
  if (style === "combine") {
    if (isCover) drawCoverBand(page, logoImg, color, true);
    else drawHeaderBandeau(page, logoImg, color);
    return;
  }
  if (style === "bandeau") {
    drawHeaderBandeau(page, logoImg, color);
    return;
  }
  drawCornerTick(page, logoImg, color); // "filigrane", par défaut
}

// Découpe un texte libre en lignes qui tiennent dans maxWidth, pour un rendu
// PDF manuel (pas de wrapping natif avec drawText/pdf-lib).
function wrapText(text: string, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (current && font.widthOfTextAtSize(test, size) > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    lines.push(current);
  }
  return lines;
}

/**
 * Génère un PDF "Zones de vol" (une page par zone), même mise en page que le
 * prototype Python (generate_zone_cards.py) et que les fiches DroneKeeper
 * existantes de l'utilisateur : titre, adresse, distance/hauteur max, carte(s),
 * consignes, légende "Zone de vol".
 */
export async function generateZoneCards(
  missionTitle: string | undefined,
  zones: ZoneCardInput[],
  branding?: { logoBytes?: Uint8Array | null; color?: string | null; style?: DossierStyle | null } | null
) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Filigrane discret : uniquement si un logo a été fourni (le profil a
  // toujours une couleur en base dès qu'il est enregistré une fois, donc on
  // se cale sur la présence du logo pour ne rien afficher tant que
  // l'utilisateur n'a pas explicitement personnalisé son dossier).
  let logoImg: PDFImage | null = null;
  if (branding?.logoBytes) {
    try {
      logoImg = await embedAny(pdfDoc, branding.logoBytes);
    } catch {
      logoImg = null;
    }
  }
  const brandColor = branding?.logoBytes ? hexToRgbColor(branding.color || "#41fabb") : null;
  const dossierStyle: DossierStyle = branding?.style || "filigrane";

  if (missionTitle) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    page.drawText(missionTitle, {
      x: PAGE_W / 2 - font.widthOfTextAtSize(missionTitle, 26) / 2,
      y: PAGE_H / 2,
      size: 26,
      font,
    });
    if (brandColor) drawBranding(page, dossierStyle, true, logoImg, brandColor);
  }

  for (const zone of zones) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    if (brandColor) drawBranding(page, dossierStyle, false, logoImg, brandColor);
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

    const descLines = zone.descriptionSite ? wrapText(zone.descriptionSite, font, 10, PAGE_W - 2 * MARGIN) : [];
    const descBlockH = descLines.length > 0 ? 20 + descLines.length * 13 + 10 : 0;
    const reserveBottom = MARGIN + 70 + descBlockH; // description + notes + légende
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

    if (descLines.length > 0) {
      page.drawText("Description du site", { x: MARGIN, y, size: 11, font: fontBold, color: DARK });
      y -= 16;
      for (const line of descLines) {
        page.drawText(line, { x: MARGIN, y, size: 10, font, color: DARK });
        y -= 13;
      }
      y -= 10;
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
