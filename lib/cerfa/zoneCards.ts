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

function hexToRgbTuple(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return [0.255, 0.98, 0.733];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
}

function lightenTuple([r, g, b]: [number, number, number], amount: number): [number, number, number] {
  return [r + (1 - r) * amount, g + (1 - g) * amount, b + (1 - b) * amount];
}

// Dégradé "monochrome clair" (proposition retenue) : dérivé d'une seule
// couleur choisie par l'utilisateur (celle du sélecteur existant), qui
// s'éclaircit en 2 étapes -- pas besoin de stocker plusieurs couleurs en
// base, tout se calcule à partir du brand_color existant.
function gradientStopsFromHex(hex: string): [number, number, number][] {
  const base = hexToRgbTuple(hex);
  return [base, lightenTuple(base, 0.45), lightenTuple(base, 0.85)];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Dessine un rectangle en dégradé horizontal en le découpant en fines
// bandes verticales de couleur interpolée (pdf-lib n'a pas de remplissage
// en dégradé natif) -- approche robuste plutôt que les patterns de
// shading bas niveau du PDF, pour un document qui part en préfecture.
function drawGradientRect(
  page: any,
  x: number,
  y: number,
  width: number,
  height: number,
  stops: [number, number, number][]
) {
  const segments: number = 48;
  const segW = width / segments;
  const segCount = stops.length - 1;
  for (let i = 0; i < segments; i++) {
    const t = segments === 1 ? 0 : i / (segments - 1);
    const scaled = t * segCount;
    const idx = Math.min(Math.floor(scaled), segCount - 1);
    const localT = scaled - idx;
    const [r1, g1, b1] = stops[idx];
    const [r2, g2, b2] = stops[idx + 1];
    page.drawRectangle({
      x: x + i * segW,
      y,
      width: segW + 0.5,
      height,
      color: rgb(lerp(r1, r2, localT), lerp(g1, g2, localT), lerp(b1, b2, localT)),
    });
  }
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

// Style "bandeau" : petit logo en coin, filet en dégradé sous le titre de
// chaque page (repris à l'identique sur la page de garde et les fiches).
function drawHeaderBandeau(page: any, logoImg: PDFImage | null, colorHex: string) {
  const lineY = PAGE_H - MARGIN - 44;
  drawGradientRect(page, MARGIN, lineY, PAGE_W - 2 * MARGIN, 1.4, gradientStopsFromHex(colorHex));
  if (logoImg) {
    const maxDim = 20;
    const scale = Math.min(maxDim / logoImg.width, maxDim / logoImg.height, 1);
    const w = logoImg.width * scale;
    const h = logoImg.height * scale;
    page.drawImage(logoImg, { x: MARGIN, y: PAGE_H - 30 - h, width: w, height: h, opacity: 0.9 });
  }
}

// Style "garde" (et variante "combine") : bandeau en dégradé en haut de la
// page de garde, avec le logo centré dedans (en blanc si pas de logo, le
// bandeau seul reste marquant).
function drawCoverBand(page: any, logoImg: PDFImage | null, colorHex: string, slim: boolean) {
  const bandH = slim ? 70 : PAGE_H * 0.24;
  drawGradientRect(page, 0, PAGE_H - bandH, PAGE_W, bandH, gradientStopsFromHex(colorHex));
  if (logoImg) {
    const maxDim = slim ? 34 : 64;
    const scale = Math.min(maxDim / logoImg.width, maxDim / logoImg.height, 1);
    const w = logoImg.width * scale;
    const h = logoImg.height * scale;
    page.drawImage(logoImg, { x: PAGE_W / 2 - w / 2, y: PAGE_H - bandH / 2 - h / 2, width: w, height: h });
  }
}

function drawBranding(page: any, style: DossierStyle, isCover: boolean, logoImg: PDFImage | null, colorHex: string) {
  const color = hexToRgbColor(colorHex);
  if (style === "garde") {
    if (isCover) drawCoverBand(page, logoImg, colorHex, false);
    else drawCornerTick(page, null, color); // fiches de zone : couleur seule, sobre
    return;
  }
  if (style === "combine") {
    if (isCover) drawCoverBand(page, logoImg, colorHex, true);
    else drawHeaderBandeau(page, logoImg, colorHex);
    return;
  }
  if (style === "bandeau") {
    drawHeaderBandeau(page, logoImg, colorHex);
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
  branding?: { logoBytes?: Uint8Array | null; color?: string | null; style?: DossierStyle | null } | null,
  // Objet précis de la mission (ex : "Inspection de toiture") : affiché en
  // sous-titre sous le titre sur la page de garde, quand il est renseigné et
  // distinct du titre lui-même (sinon la page de garde répétait juste deux
  // fois la même chose) -- retour bêta-testeur : la page de garde n'affichait
  // aucune description du contenu du dossier.
  missionDescription?: string | null
) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // "branding" n'est passé (non-null) que si la personnalisation est
  // explicitement activée côté profil (cf. generate-dossier/route.ts) : la
  // couleur d'accent s'applique donc même sans logo importé (bandeau /
  // page de garde colorés), le logo venant simplement s'ajouter par-dessus
  // quand il est présent.
  let logoImg: PDFImage | null = null;
  if (branding?.logoBytes) {
    try {
      logoImg = await embedAny(pdfDoc, branding.logoBytes);
    } catch {
      logoImg = null;
    }
  }
  const brandColorHex = branding ? branding.color || "#41fabb" : null;
  const dossierStyle: DossierStyle = branding?.style || "filigrane";

  if (missionTitle) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    page.drawText(missionTitle, {
      x: PAGE_W / 2 - font.widthOfTextAtSize(missionTitle, 26) / 2,
      y: PAGE_H / 2,
      size: 26,
      font,
    });
    // Même filet fin que sur les fiches de zone (style "épuré") : sépare
    // visuellement le titre du sous-titre sans ajouter de bloc/encadré.
    const ruleW = 160;
    page.drawRectangle({
      x: PAGE_W / 2 - ruleW / 2,
      y: PAGE_H / 2 - 16,
      width: ruleW,
      height: 0.75,
      color: rgb(0.75, 0.75, 0.75),
    });
    const showSubtitle =
      missionDescription && missionDescription.trim() && missionDescription.trim() !== missionTitle.trim();
    if (showSubtitle) {
      const subtitleLines = wrapText(missionDescription!.trim(), font, 13, PAGE_W - 2 * MARGIN - 40);
      let subY = PAGE_H / 2 - 42;
      for (const line of subtitleLines.slice(0, 4)) {
        const w = font.widthOfTextAtSize(line, 13);
        page.drawText(line, { x: PAGE_W / 2 - w / 2, y: subY, size: 13, font, color: GRAY });
        subY -= 18;
      }
    }
    if (brandColorHex) drawBranding(page, dossierStyle, true, logoImg, brandColorHex);
  }

  for (const zone of zones) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    if (brandColorHex) drawBranding(page, dossierStyle, false, logoImg, brandColorHex);
    let y = PAGE_H - MARGIN;

    // Style "épuré" (option retenue parmi 4 propositions) : typographie
    // centrée, beaucoup de blanc, la carte respire au centre de la page et
    // les infos numériques (distance/hauteur) passent en-dessous d'elle
    // plutôt qu'en tête -- moins "formulaire", plus lisible d'un coup d'œil.
    if (missionTitle) {
      const w = font.widthOfTextAtSize(missionTitle, 10);
      page.drawText(missionTitle, { x: PAGE_W / 2 - w / 2, y: PAGE_H - 34, size: 10, font, color: GRAY });
    }

    const titleSize = 22;
    const titleW = font.widthOfTextAtSize(zone.title, titleSize);
    page.drawText(zone.title, { x: PAGE_W / 2 - titleW / 2, y: y - 30, size: titleSize, font });
    y -= 52;

    if (zone.address) {
      const w = font.widthOfTextAtSize(zone.address, 11);
      page.drawText(zone.address, { x: PAGE_W / 2 - w / 2, y, size: 11, font, color: GRAY });
      y -= 22;
    } else {
      y -= 6;
    }

    // Filet fin, centré, sous le titre -- respire l'espace plutôt que de
    // cloisonner la page avec un bloc d'infos dense.
    const ruleW = 160;
    page.drawRectangle({ x: PAGE_W / 2 - ruleW / 2, y, width: ruleW, height: 0.75, color: rgb(0.75, 0.75, 0.75) });
    y -= 26;

    const hasStats = !!(zone.distanceMaxM || zone.heightMaxM);
    const descLines = zone.descriptionSite ? wrapText(zone.descriptionSite, font, 10, PAGE_W - 2 * MARGIN) : [];
    const descBlockH = descLines.length > 0 ? 20 + descLines.length * 13 + 10 : 0;
    const statsBlockH = hasStats ? 26 : 0;
    const reserveBottom = MARGIN + 70 + descBlockH + statsBlockH; // stats + description + notes + légende
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

    // Distance/hauteur max sous la carte plutôt qu'au-dessus (retenu parmi 4
    // propositions de mise en page, style "épuré") : une seule ligne
    // compacte, l'œil va du titre à la carte sans bloc de chiffres entre les
    // deux.
    if (hasStats) {
      const parts = [
        zone.distanceMaxM ? `Distance max ${zone.distanceMaxM} m` : null,
        zone.heightMaxM ? `Hauteur max ${zone.heightMaxM} m` : null,
      ].filter(Boolean) as string[];
      const t = parts.join("   ·   ");
      const w = fontBold.widthOfTextAtSize(t, 11);
      page.drawText(t, { x: PAGE_W / 2 - w / 2, y, size: 11, font: fontBold, color: DARK });
      y -= 24;
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
