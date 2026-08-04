import { PDFDocument } from "pdf-lib";
import { TEXT_FIELDS, CHECKBOX_FIELDS, RADIO_FIELDS, DEFAULT_ENGAGEMENTS_ON } from "./fieldMap";

/** Dict imbriqué {exploitant: {nom: "X"}} -> plat {"exploitant.nom": "X"} */
function flatten(obj: any, prefix = ""): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

/**
 * Remplit le CERFA 15476*04 à partir d'un objet "mission" (même structure que
 * le prototype Python validé). templateBytes = octets du PDF officiel corrigé.
 * Retourne les octets du PDF rempli.
 */
export async function fillCerfa(templateBytes: Uint8Array | ArrayBuffer, mission: Record<string, any>) {
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  const flat = flatten(mission);
  for (const key of DEFAULT_ENGAGEMENTS_ON) {
    if (!(key in flat)) flat[key] = true;
  }

  const unmapped: string[] = [];

  for (const [key, val] of Object.entries(flat)) {
    if (val === null || val === undefined || val === "") continue;

    if (key in TEXT_FIELDS) {
      try {
        form.getTextField(TEXT_FIELDS[key]).setText(String(val));
      } catch (e: any) {
        unmapped.push(`${key} (texte introuvable: ${e.message})`);
      }
      continue;
    }

    if (key in CHECKBOX_FIELDS) {
      try {
        const cb = form.getCheckBox(CHECKBOX_FIELDS[key]);
        if (val) cb.check();
        else cb.uncheck();
      } catch (e: any) {
        unmapped.push(`${key} (case introuvable: ${e.message})`);
      }
      continue;
    }

    if (key in RADIO_FIELDS) {
      const [pdfField, choices] = RADIO_FIELDS[key];
      const answer = String(val).toLowerCase();
      try {
        const rg = form.getRadioGroup(pdfField);
        if (key === "site1.aeronefs_choice" && answer === "tous") {
          // état "tous" à export value corrompue (encodage) -> 1re option du groupe
          const opts = rg.getOptions();
          rg.select(opts[0]);
        } else if (choices[answer as keyof typeof choices]) {
          const exportValue = (choices as any)[answer].replace(/^\//, "");
          rg.select(exportValue);
        } else {
          unmapped.push(`${key}=${val} (valeur non reconnue)`);
        }
      } catch (e: any) {
        unmapped.push(`${key} (radio introuvable: ${e.message})`);
      }
      continue;
    }

    unmapped.push(key);
  }

  // Nécessaire pour que les cases/radios s'affichent correctement dans tous
  // les lecteurs PDF (regénère les apparences visuelles des champs modifiés).
  form.updateFieldAppearances();

  const bytes = await pdfDoc.save();
  return { bytes, unmapped };
}
