import { PDFDocument, PDFName, PDFString, PDFHexString } from "pdf-lib";
import { TEXT_FIELDS, CHECKBOX_FIELDS, RADIO_FIELDS } from "./fieldMap";

const REV_TEXT = Object.fromEntries(Object.entries(TEXT_FIELDS).map(([k, v]) => [v, k]));
const REV_CHECK = Object.fromEntries(Object.entries(CHECKBOX_FIELDS).map(([k, v]) => [v, k]));
const REV_RADIO: Record<string, { key: string; choices: Record<string, string> }> = {};
for (const [semKey, [pdfField, choices]] of Object.entries(RADIO_FIELDS)) {
  const reversed: Record<string, string> = {};
  for (const [choiceKey, exportVal] of Object.entries(choices)) {
    reversed[(exportVal as string).replace(/^\//, "")] = choiceKey;
  }
  REV_RADIO[pdfField] = { key: semKey, choices: reversed };
}

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
 * Lit la valeur brute /V d'un champ directement dans son dictionnaire PDF,
 * en contournant PDFField.getText()/isChecked()/getSelected() de pdf-lib.
 *
 * Pourquoi : sur un même fichier, ces méthodes haut niveau renvoient parfois
 * "vide" en production (Vercel) alors que le dictionnaire contient bien la
 * valeur (vérifié en confrontant une lecture directe de /V à getText() dans
 * la même requête -> la lecture directe trouve la valeur, pas getText()).
 * La cause exacte est dans la résolution d'héritage /Parent de pdf-lib
 * (PDFAcroField.getInheritableAttribute/ascend), pas dans les données du
 * PDF. On relit donc /V nous-mêmes : plus robuste, quitte à ne pas gérer
 * l'héritage de valeur depuis un champ parent (cas rare, pas rencontré sur
 * les exports DroneKeeper).
 */
function rawFieldValue(field: any): string | undefined {
  try {
    const dict = field?.acroField?.dict;
    if (!dict) return undefined;
    const v = dict.get(PDFName.of("V"));
    if (v === undefined) return undefined;
    if (v instanceof PDFString || v instanceof PDFHexString) return v.decodeText();
    if (v instanceof PDFName) return v.value();
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Lit un Cerfa 15476*04 déjà rempli (ex: exporté par DroneKeeper) et en
 * extrait les données dans la même structure que buildMissionData(), pour
 * pré-remplir automatiquement le profil et une nouvelle mission plutôt que de
 * tout ressaisir à la main. Symétrique de fillCerfa().
 */
export async function parseCerfa(bytes: Uint8Array | ArrayBuffer) {
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const data: Record<string, any> = {};
  const warnings: string[] = [];

  const allFields = form.getFields();
  let matched = 0;
  let textFieldsWithValue = 0;
  let usedRawFallback = 0;

  for (const field of allFields) {
    const name = field.getName();
    const ctor = field.constructor.name;

    try {
      if (ctor === "PDFTextField" && REV_TEXT[name]) {
        // getText() d'abord (chemin normal), lecture brute de /V en secours
        // si ça revient vide (cf. rawFieldValue ci-dessus).
        let value: string | undefined;
        try {
          value = (field as any).getText();
        } catch {
          value = undefined;
        }
        if (!value) {
          const raw = rawFieldValue(field);
          if (raw) {
            value = raw;
            usedRawFallback++;
          }
        }
        if (value) {
          setNested(data, REV_TEXT[name], value);
          matched++;
        }
      } else if (ctor === "PDFCheckBox" && REV_CHECK[name]) {
        let checked = false;
        try {
          checked = (field as any).isChecked();
        } catch {
          checked = false;
        }
        if (!checked) {
          const raw = rawFieldValue(field);
          if (raw && raw !== "Off") {
            checked = true;
            usedRawFallback++;
          }
        }
        if (checked) {
          setNested(data, REV_CHECK[name], true);
          matched++;
        }
      } else if (ctor === "PDFRadioGroup" && REV_RADIO[name]) {
        let selected: string | undefined;
        try {
          selected = (field as any).getSelected();
        } catch {
          selected = undefined;
        }
        if (!selected) {
          const raw = rawFieldValue(field);
          if (raw && raw !== "Off") {
            selected = raw;
            usedRawFallback++;
          }
        }
        if (selected) {
          const { key, choices } = REV_RADIO[name];
          const answer = choices[selected];
          if (answer) {
            setNested(data, key, answer);
            matched++;
          }
        }
      }

      if (ctor === "PDFTextField") {
        let hasValue = false;
        try {
          hasValue = !!(field as any).getText();
        } catch {
          hasValue = false;
        }
        if (!hasValue) hasValue = !!rawFieldValue(field);
        if (hasValue) textFieldsWithValue++;
      }
    } catch (e: any) {
      warnings.push(`${name}: ${e.message}`);
    }
  }

  // Diagnostic : si le PDF a bien un formulaire mais qu'on ne récupère rien,
  // ça aide à distinguer "pas de champs du tout" (PDF aplati/scanné) de
  // "des champs remplis mais aucun ne correspond à notre cartographie"
  // (export d'un autre outil que DroneKeeper, avec des noms de champs
  // différents) plutôt que de laisser un "aucune zone trouvée" muet.
  const debug = { totalFields: allFields.length, textFieldsWithValue, matched, usedRawFallback };
  if (allFields.length === 0) {
    warnings.push(
      "Ce PDF n'a aucun champ de formulaire interactif (probablement aplati/exporté en image) : impossible d'en extraire les données automatiquement."
    );
  } else if (matched === 0 && textFieldsWithValue > 0) {
    warnings.push(
      `Ce PDF a ${allFields.length} champs dont ${textFieldsWithValue} remplis, mais aucun ne correspond à la structure attendue (export DroneKeeper). Peut-être un autre outil ou une autre version du Cerfa.`
    );
  }

  return { data, warnings, debug };
}
