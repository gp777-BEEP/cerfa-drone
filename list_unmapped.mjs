import { readFile } from "fs/promises";
import { PDFDocument } from "pdf-lib";

const bytes = await readFile("/tmp/sitebuild/public/cerfa_template.pdf");
const doc = await PDFDocument.load(bytes);
const form = doc.getForm();
const fields = form.getFields();
const names = fields.map(f => f.getName());
console.log("total fields:", names.length);
for (const n of names) console.log(JSON.stringify(n), "-", fields.find(f=>f.getName()===n).constructor.name);
