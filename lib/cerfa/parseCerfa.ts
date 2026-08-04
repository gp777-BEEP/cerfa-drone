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

  for (const field of form.getFields()) {
    const name = field.getName();
    const ctor = field.constructor.name;

    try {
      if (ctor === "PDFTextField" && REV_TEXT[name]) {
        const value = (field as any).getText();
        if (value) setNested(data, REV_TEXT[name], value);
      } else if (ctor === "PDFCheckBox" && REV_CHECK[name]) {
        const checked = (field as any).isChecked();
        if (checked) setNested(data, REV_CHECK[name], true);
      } else if (ctor === "PDFRadioGroup" && REV_RADIO[name]) {
        const selected = (field as any).getSelected();
        if (selected) {
          const { key, choices } = REV_RADIO[name];
          const answer = choices[selected];
          if (answer) setNested(data, key, answer);
        }
      }
    } catch (e: any) {
      warnings.push(`${name}: ${e.message}`);
    }
  }

  return { data, warnings };
}
