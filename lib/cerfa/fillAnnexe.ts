import { PDFDocument } from "pdf-lib";

/**
 * Remplit l'annexe officielle du Cerfa 15476*04 ("6. Description des vols
 * (suite)") pour les zones au-delà des 2 prévues sur le formulaire
 * principal. Chaque page d'annexe porte 2 emplacements de zone ; pour plus
 * de zones, on duplique la page autant de fois que nécessaire.
 *
 * Structure des champs découverte par inspection directe du PDF officiel
 * (public/cerfa_annexe.pdf) : mêmes noms de champs "AdresseRow1" /
 * "Code postalRow1" / "LocalitéRow1" que le formulaire principal pour le 1er
 * emplacement, suffixés "_2" pour le second. Deux cases à cocher "Site n" /
 * "En agglomération" reprennent le même défaut d'inversion interne que sur
 * la page 1 du Cerfa (nom du champ et libellé visuel ne correspondent pas),
 * déjà documenté dans fieldMap.ts pour le formulaire principal.
 *
 * Limitation constatée (tous les champs texte sont bien automatisés et
 * vérifiés visuellement - numéro de site, objet, commanditaire, adresse,
 * éloignement, hauteur, description du rassemblement, autres infos) : LES
 * CASES À COCHER de cette annexe précise ne sont PAS automatisées, quelle
 * que soit la case ("En agglomération", "À proximité d'un rassemblement",
 * "hors espace public", "descriptif joint", "vol en vue", "dates selon §4",
 * sélecteur d'aéronef). Cause identifiée : le PDF officiel encode l'état
 * "coché" via un glyphe d'une police symbolique (ZapfDingbatsITC) intégrée
 * en sous-ensemble ; après un passage complet par pdf-lib (chargement +
 * modification + sauvegarde), ce glyphe ne se réaffiche plus (testé et
 * confirmé avec 3 moteurs de rendu différents : poppler/pdftoppm,
 * poppler/pdftocairo, Ghostscript - les 3 rendent la case vide alors que
 * /AS et /V valent bien /On). Un test de contrôle avec pikepdf (Python, qui
 * ne réécrit pas tout le document) confirme que la case se coche
 * correctement quand la structure du PDF n'est pas entièrement réécrite :
 * le défaut vient donc bien de la sérialisation complète de pdf-lib sur ce
 * fichier précis, pas d'une erreur de nom de champ ou de valeur. Le
 * formulaire principal (cerfa_template.pdf) n'a pas ce problème (vérifié :
 * ses cases à cocher survivent très bien au même traitement pdf-lib), donc
 * seule l'annexe est concernée. Faute d'environnement Python disponible en
 * production (Vercel/Node), reste à cocher à la main sur les pages
 * d'annexe générées.
 */

type AnnexeZone = {
  numero?: string | number;
  code_postal?: string | null;
  localite?: string | null;
  adresse?: string | null;
  en_agglomeration?: boolean | null;
  rassemblement?: boolean | null;
  rassemblement_description?: string | null;
  objet_mission?: string | null;
  commanditaire?: string | null;
  hors_espace_public?: boolean | null;
  descriptif_joint?: boolean | null;
  dates_sauf?: string | null;
  eloignement_max_m?: number | string | null;
  hauteur_max_m?: number | string | null;
  autres_infos?: string | null;
};

// Reprend la même translittération que fillCerfa.ts (même police/limites) :
// dupliquée ici plutôt qu'importée pour garder fillAnnexe.ts autonome et
// évitable/supprimable sans toucher au remplissage du formulaire principal.
const WINANSI_REPLACEMENTS: Record<string, string> = {
  "≤": "<=",
  "≥": ">=",
  "→": "->",
  "←": "<-",
  "…": "...",
  "−": "-",
  "×": "x",
  " ": " ",
};
const WINANSI_HIGH_RANGE = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ".split(""));
function sanitizeForWinAnsi(text: string): string {
  let out = text;
  for (const [bad, good] of Object.entries(WINANSI_REPLACEMENTS)) out = out.split(bad).join(good);
  return Array.from(out)
    .map((ch) => {
      const code = ch.codePointAt(0) || 0;
      if (code <= 0x7f || (code >= 0xa0 && code <= 0xff)) return ch;
      if (WINANSI_HIGH_RANGE.has(ch)) return ch;
      return "?";
    })
    .join("");
}

const TEXT_FIELDS_BY_SLOT: [keyof AnnexeZone, string, string][] = [
  ["numero", "Texte15", "Texte18"],
  ["rassemblement_description", "Texte35", "Texte19"],
  ["objet_mission", "Texte16", "Texte33"],
  ["commanditaire", "Texte32", "Texte34"],
  ["code_postal", "Code postalRow1", "Code postalRow1_2"],
  ["localite", "LocalitéRow1", "LocalitéRow1_2"],
  ["adresse", "AdresseRow1", "AdresseRow1_2"],
  ["dates_sauf", "Texte17", "Texte31"],
  ["eloignement_max_m", "Texte14", "Texte20"],
  ["hauteur_max_m", "Texte13", "Texte21"],
  ["autres_infos", "proximité des opérations", "proximité des opérations_2"],
];

// Défaut confirmé du PDF officiel (comme sur la page 1) : les cases "Site n"
// / "En agglomération" sont inversées en interne par rapport à leur
// libellé visuel. Table conservée pour référence/future correction, mais
// NON utilisée actuellement (cf. limitation documentée en tête de fichier :
// ces cases ne survivent pas à une sauvegarde pdf-lib sur ce PDF précis).
const CHECKBOX_FIELDS_BY_SLOT: [keyof AnnexeZone, string, string][] = [
  ["en_agglomeration", "Site n", "Site n_2"],
  ["rassemblement", "En agglomération", "En agglomération_2"],
  [
    "hors_espace_public",
    "Cocher la case si les vols auront lieu exclusivement en dehors de lespace public voir notice",
    "Cocher la case si les vols auront lieu exclusivement en dehors de lespace public voir notice_2",
  ],
  [
    "descriptif_joint",
    "Description du site  cocher la case si un descriptif détaillé est joint séparément",
    "Description du site  cocher la case si un descriptif détaillé est joint séparément_2",
  ],
];
void CHECKBOX_FIELDS_BY_SLOT; // évite le warning "défini mais jamais utilisé"

function setText(form: ReturnType<PDFDocument["getForm"]>, name: string, value: any) {
  if (value === null || value === undefined || value === "") return;
  try {
    const field = form.getTextField(name);
    try {
      field.acroField.setDefaultAppearance("/Helvetica 9 Tf 0 g");
    } catch {}
    field.setText(sanitizeForWinAnsi(String(value)));
  } catch {}
}

function setCheck(form: ReturnType<PDFDocument["getForm"]>, name: string, value: boolean | null | undefined) {
  try {
    const cb = form.getCheckBox(name);
    if (value) cb.check();
    else cb.uncheck();
  } catch {}
}

/**
 * zones : toutes les zones au-delà des 2 premières (déjà placées sur la page
 * 1 du Cerfa). Renvoie les octets d'un PDF contenant autant de pages
 * d'annexe que nécessaire (2 zones par page), prêt à être fusionné à la
 * suite du dossier.
 */
export async function fillAnnexe(templateBytes: Uint8Array | ArrayBuffer, zones: AnnexeZone[]): Promise<Uint8Array> {
  const host = await PDFDocument.create();
  const totalPages = Math.ceil(zones.length / 2);

  for (let p = 0; p < totalPages; p++) {
    const pair = zones.slice(p * 2, p * 2 + 2);
    const pageDoc = await PDFDocument.load(templateBytes);
    const form = pageDoc.getForm();

    setText(form, "Texte22", String(p + 1));
    setText(form, "Texte23", String(totalPages));

    pair.forEach((zone, slotIdx) => {
      for (const [key, f1, f2] of TEXT_FIELDS_BY_SLOT) {
        setText(form, slotIdx === 0 ? f1 : f2, (zone as any)[key]);
      }
      // Cases à cocher volontairement non remplies ici, cf. limitation
      // documentée en tête de fichier (le "checked" ne survit pas au
      // ré-enregistrement pdf-lib sur ce PDF précis) : à cocher à la main.
    });

    try {
      form.updateFieldAppearances();
    } catch {}

    const [copiedPage] = await host.copyPages(pageDoc, [0]);
    host.addPage(copiedPage);
  }

  return host.save();
}
