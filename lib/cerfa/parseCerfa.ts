import { PDFDocument } from "pdf-lib";
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

  for (const field of allFields) {
    const name = field.getName();
    const ctor = field.constructor.name;

    try {
      if (ctor === "PDFTextField" && REV_TEXT[name]) {
        const value = (field as any).getText();
        if (value) {
          setNested(data, REV_TEXT[name], value);
          matched++;
        }
      } else if (ctor === "PDFCheckBox" && REV_CHECK[name]) {
        const checked = (field as any).isChecked();
        if (checked) {
          setNested(data, REV_CHECK[name], true);
          matched++;
        }
      } else if (ctor === "PDFRadioGroup" && REV_RADIO[name]) {
        const selected = (field as any).getSelected();
        if (selected) {
          const { key, choices } = REV_RADIO[name];
          const answer = choices[selected];
          if (answer) {
            setNested(data, key, answer);
            matched++;
          }
        }
      }
      if (ctor === "PDFTextField" && (field as any).getText()) textFieldsWithValue++;
    } catch (e: any) {
      warnings.push(`${name}: ${e.message}`);
    }
  }

  // Diagnostic : si le PDF a bien un formulaire mais qu'on ne récupère rien,
  // ça aide à distinguer "pas de champs du tout" (PDF aplati/scanné) de
  // "des champs remplis mais aucun ne correspond à notre cartographie"
  // (export d'un autre outil que DroneKeeper, avec des noms de champs
  // différents) plutôt que de laisser un "aucune zone trouvée" muet.
  // Diagnostic bas niveau : compare getText() (API haut niveau) à une
  // lecture directe du dictionnaire /V du champ, pour un champ connu. Si les
  // deux divergent, le bug est dans getText() lui-même (ou son cache) plutôt
  // que dans les données du PDF.
  let rawProbe: string | null = null;
  try {
    const { PDFName } = await import("pdf-lib");
    const probeField = allFields.find((f) => f.getName() === "Code postalRow1");
    if (probeField) {
      const acroField: any = (probeField as any).acroField;
      const vRaw = acroField?.dict?.get(PDFName.of("V"));
      rawProbe = vRaw ? String(vRaw) : "(pas de /V sur ce champ)";
    } else {
      rawProbe = "(champ Code postalRow1 introuvable)";
    }
  } catch (e: any) {
    rawProbe = `(sonde en erreur: ${e.message})`;
  }

  const debug = { totalFields: allFields.length, textFieldsWithValue, matched, rawProbe };
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
