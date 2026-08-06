import { inflateSync } from "zlib";
import { TEXT_FIELDS, CHECKBOX_FIELDS, RADIO_FIELDS } from "./fieldMap";

function setNested(obj: any, dottedKey: string, value: any) {
  const parts = dottedKey.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] || {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

/**
 * --- Pourquoi ce fichier ne dépend plus DU TOUT de pdf-lib ---
 *
 * Round 1 (constat) : sur un vrai Cerfa pré-rempli, pdf-lib détecte bien les
 * 195 champs (le comptage est juste), mais toute lecture de valeur par son
 * API haut niveau (getText/isChecked/getSelected) revient vide en
 * production (Vercel), alors qu'elle marche en local sur le même fichier.
 *
 * Round 2 (premier correctif, insuffisant) : remplacé la lecture de valeur
 * par un scan des octets bruts du PDF (regex sur chaque objet `N G obj ...
 * endobj`, cf. buildFieldValueMap ci-dessous) pour extraire (/T, /V) sans
 * passer par `PDFDict.get()`. Vérifié sur un nouveau fichier de test que ce
 * scan fonctionne bien en prod : il retrouve les 186 valeurs attendues,
 * avec les bons noms de champs ("Texte39" = "0782741584", etc.). Mais le
 * code faisait encore `for (const field of form.getFields())` puis
 * `valueMap[field.getName()]` pour associer chaque valeur brute à son
 * champ -- et EN PRODUCTION cette association ne matchait plus jamais,
 * y compris pour des noms 100% ASCII sans accent ("Texte39"), alors que
 * `valueMap` contenait bien cette clé. Donc `field.getName()` de pdf-lib
 * ne renvoie pas la même chaîne qu'en local, spécifiquement en prod --
 * cause exacte non identifiée, mais le symptôme est net et reproductible.
 *
 * Solution round 3 (celle-ci) : ne plus utiliser pdf-lib du tout, y compris
 * pour l'énumération des champs. On connaît déjà, dans fieldMap.ts, le nom
 * PDF exact de chaque champ qu'on veut lire (ex. "Texte39" pour
 * mandataire.telephone_portable) : on va directement chercher ce nom dans
 * `valueMap` (issu du scan regex), sans intermédiaire. Zéro dépendance à un
 * comportement de bibliothèque qui s'est avéré peu fiable en prod à deux
 * reprises pour deux raisons différentes.
 */

type RawValue = { type: "string" | "name"; value: string };

function decodeLiteralPdfString(s: string): string {
  return s.replace(/\\(\d{1,3}|\r\n|[\s\S])/g, (_m, g: string) => {
    if (/^[0-7]{1,3}$/.test(g)) return String.fromCharCode(parseInt(g, 8));
    if (g === "\r\n" || g === "\n" || g === "\r") return "";
    if (g === "n") return "\n";
    if (g === "r") return "\r";
    if (g === "t") return "\t";
    if (g === "b") return "\b";
    if (g === "f") return "\f";
    return g;
  });
}

function decodeHexPdfString(hex: string): string {
  const clean = hex.replace(/\s+/g, "");
  const padded = clean.length % 2 === 1 ? clean + "0" : clean;
  const bytes = Buffer.from(padded, "hex");
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    // UTF-16BE avec BOM : cas standard pour les valeurs texte accentuées
    const body = bytes.subarray(2);
    const evenLen = body.length - (body.length % 2);
    return body.subarray(0, evenLen).swap16().toString("utf16le");
  }
  return bytes.toString("latin1");
}

function decodePdfNameEscapes(name: string): string {
  // Dans un nom PDF, #XX code un octet en hexadécimal (ex: espace = #20)
  return name.replace(/#([0-9A-Fa-f]{2})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractKeyValue(objBody: string, key: string): RawValue | null {
  // Chaîne littérale : /Cle (valeur avec \) échappements possibles)
  const litRe = new RegExp("/" + key + "\\s*\\(((?:\\\\.|[^()\\\\])*)\\)");
  const lit = objBody.match(litRe);
  if (lit) return { type: "string", value: decodeLiteralPdfString(lit[1]) };

  // Chaîne hexadécimale : /Cle <48 45 58>
  const hexRe = new RegExp("/" + key + "\\s*<([0-9A-Fa-f\\s]*)>");
  const hex = objBody.match(hexRe);
  if (hex) return { type: "string", value: decodeHexPdfString(hex[1]) };

  // Nom : /Cle /MonNom (cases à cocher, boutons radio)
  const nameRe = new RegExp("/" + key + "\\s*/([^\\s/()<>\\[\\]]+)");
  const nm = objBody.match(nameRe);
  if (nm) return { type: "name", value: decodePdfNameEscapes(nm[1]) };

  return null;
}

function mergeFieldFromBody(body: string, map: Record<string, RawValue>) {
  const t = extractKeyValue(body, "T");
  if (!t || t.type !== "string" || !t.value) return;
  const v = extractKeyValue(body, "V");
  if (!v) return;
  // Si le même nom de champ apparaît plusieurs fois (widgets multiples), on
  // garde la première valeur non vide plutôt que d'écraser une bonne valeur
  // par une entrée vide rencontrée plus loin dans le fichier.
  if (!map[t.value] || !map[t.value].value) {
    map[t.value] = v;
  }
}

/**
 * Décompresse les flux d'objets (`/ObjStm`, PDF 1.5+) et fusionne les champs
 * qu'ils contiennent dans la table. Indispensable pour ré-importer un
 * dossier généré par l'application elle-même : pdf-lib compresse par défaut
 * les objets du formulaire dans des `/ObjStm` FlateDecode lors de save(), si
 * bien qu'ils n'apparaissent plus comme des blocs texte "N G obj ... endobj"
 * classiques et échappent au scan ci-dessus (repéré en comparant un Cerfa
 * source, sans ObjStm, à un dossier généré par l'app, qui en contient ~46).
 */
function mergeObjectStreams(bytesBuf: Buffer, text: string, map: Record<string, RawValue>) {
  const objStmRe = /\d+\s+\d+\s+obj([\s\S]*?)stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = objStmRe.exec(text))) {
    const dictPart = m[1];
    if (!/\/Type\s*\/ObjStm/.test(dictPart)) continue;

    const nMatch = dictPart.match(/\/N\s+(\d+)/);
    const firstMatch = dictPart.match(/\/First\s+(\d+)/);
    if (!nMatch || !firstMatch) continue;
    const n = parseInt(nMatch[1], 10);
    const first = parseInt(firstMatch[1], 10);

    const streamStart = m.index + m[0].length;
    const endIdx = text.indexOf("endstream", streamStart);
    if (endIdx === -1) continue;
    // On retire un éventuel EOL juste avant "endstream"
    let rawEnd = endIdx;
    if (text[rawEnd - 1] === "\n") rawEnd--;
    if (text[rawEnd - 1] === "\r") rawEnd--;

    const compressed = bytesBuf.subarray(streamStart, rawEnd);
    let decompressed: Buffer;
    try {
      decompressed = inflateSync(compressed);
    } catch {
      continue; // flux corrompu ou pas du FlateDecode standard : on l'ignore
    }
    const decText = decompressed.toString("latin1");

    // En-tête : N paires "numéroObjet décalage" séparées par des espaces
    const header = decText.slice(0, first);
    const nums = header.trim().split(/\s+/).map((x) => parseInt(x, 10));
    const offsets: number[] = [];
    for (let i = 0; i < n; i++) offsets.push(nums[i * 2 + 1]);

    for (let i = 0; i < offsets.length; i++) {
      const start = first + offsets[i];
      const end = i + 1 < offsets.length ? first + offsets[i + 1] : decText.length;
      const body = decText.slice(start, end);
      mergeFieldFromBody(body, map);
    }
  }
}

/**
 * Construit une table nomDeChamp -> valeur brute en scannant tous les objets
 * `N G obj ... endobj` du PDF (cas standard pour un champ de formulaire
 * "aplati" avec son widget : un seul objet porte à la fois /T, /V et /Rect),
 * puis en décompressant les éventuels flux d'objets `/ObjStm` (cas des PDF
 * enregistrés par pdf-lib, voir mergeObjectStreams ci-dessus).
 */
function buildFieldValueMap(bytes: Uint8Array): Record<string, RawValue> {
  // latin1 préserve un mapping 1 octet <-> 1 caractère, indispensable pour
  // que les regex retombent sur les bons offsets d'octets (les chaînes hex
  // et les échappements \ooo sont ensuite redécodés correctement à la main).
  const bytesBuf = Buffer.from(bytes);
  const text = bytesBuf.toString("latin1");
  const map: Record<string, RawValue> = {};

  const objRe = /\d+\s+\d+\s+obj([\s\S]*?)endobj/g;
  let m: RegExpExecArray | null;
  while ((m = objRe.exec(text))) {
    mergeFieldFromBody(m[1], map);
  }

  mergeObjectStreams(bytesBuf, text, map);

  return map;
}

/**
 * Lit un Cerfa 15476*04 déjà rempli (ex: exporté par DroneKeeper) et en
 * extrait les données dans la même structure que buildMissionData(), pour
 * pré-remplir automatiquement le profil et une nouvelle mission plutôt que de
 * tout ressaisir à la main. Symétrique de fillCerfa().
 */
export async function parseCerfa(bytes: Uint8Array | ArrayBuffer) {
  const byteArray = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const data: Record<string, any> = {};
  const warnings: string[] = [];

  const valueMap = buildFieldValueMap(byteArray);
  const totalFieldsInFile = Object.keys(valueMap).length;

  let matched = 0;
  let textFieldsWithValue = 0;

  for (const [semKey, pdfName] of Object.entries(TEXT_FIELDS)) {
    const raw = valueMap[pdfName];
    if (raw && raw.type === "string" && raw.value) {
      textFieldsWithValue++;
      setNested(data, semKey, raw.value);
      matched++;
    }
  }

  for (const [semKey, pdfName] of Object.entries(CHECKBOX_FIELDS)) {
    const raw = valueMap[pdfName];
    if (raw && raw.type === "name" && raw.value !== "Off") {
      setNested(data, semKey, true);
      matched++;
    }
  }

  for (const [semKey, [pdfName, choices]] of Object.entries(RADIO_FIELDS)) {
    const raw = valueMap[pdfName];
    if (!raw || raw.type !== "name" || raw.value === "Off") continue;
    const answer = Object.entries(choices).find(
      ([, exportVal]) => (exportVal as string).replace(/^\//, "") === raw.value
    )?.[0];
    if (answer) {
      setNested(data, semKey, answer);
      matched++;
    }
  }

  // Diagnostic : si le PDF a des valeurs brutes mais qu'on n'en reconnaît
  // aucune, ça aide à distinguer "export d'un autre outil, autre structure
  // de champs" de "fichier vide/corrompu" plutôt que de laisser un "aucune
  // zone trouvée" muet.
  const debug = { totalFields: totalFieldsInFile, textFieldsWithValue, matched, usedRawFallback: matched };
  if (totalFieldsInFile === 0) {
    warnings.push(
      "Ce PDF n'a aucune valeur de champ de formulaire interactif (probablement aplati/exporté en image) : impossible d'en extraire les données automatiquement."
    );
  } else if (matched === 0) {
    warnings.push(
      `Ce PDF contient ${totalFieldsInFile} valeur(s) de champ, mais aucune ne correspond à la structure attendue (export DroneKeeper). Peut-être un autre outil ou une autre version du Cerfa.`
    );
  }

  return { data, warnings, debug };
}
