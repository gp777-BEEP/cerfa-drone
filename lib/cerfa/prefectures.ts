// Contacts "déclaration de vol de drone" des préfectures, par département.
// Source : tableau DGAC "Aéronefs télépilotés : contacts dans les
// préfectures" (déclarations de vol en zone peuplée), version du 16/01/2024,
// fourni par l'utilisateur. Tableau encore en cours de constitution côté
// DGAC : certains départements changent parfois de boîte mail, à vérifier
// ponctuellement si un envoi revient en erreur.
export type PrefectureContact = {
  code: string; // code département / collectivité (ex. "69", "201", "971")
  nom: string;
  email: string | null;
};

export const PREFECTURES: PrefectureContact[] = [
  { code: "01", nom: "Ain", email: "pref-manifestations-aeriennes@ain.gouv.fr" },
  { code: "02", nom: "Aisne", email: "pref-bureau-reglementation@aisne.gouv.fr" },
  { code: "03", nom: "Allier", email: "pref-declaration-drones@allier.gouv.fr" },
  { code: "04", nom: "Alpes-de-Haute-Provence", email: "pref-declaration-drones@alpes-de-haute-provence.gouv.fr" },
  { code: "05", nom: "Hautes-Alpes", email: "pref-declaration-drones@hautes-alpes.gouv.fr" },
  { code: "06", nom: "Alpes-Maritimes", email: "pref-aeronautique@alpes-maritimes.gouv.fr" },
  { code: "07", nom: "Ardèche", email: "pref-elections@ardeche.gouv.fr" },
  { code: "08", nom: "Ardennes", email: "pref-drones@ardennes.gouv.fr" },
  { code: "09", nom: "Ariège", email: "pref-drones@ariege.gouv.fr" },
  { code: "10", nom: "Aube", email: "pref-declaration-drones@aube.gouv.fr" },
  { code: "11", nom: "Aude", email: "pref-drones@aude.gouv.fr" },
  { code: "12", nom: "Aveyron", email: "pref-declaration-drones@aveyron.gouv.fr" },
  { code: "13", nom: "Bouches-du-Rhône", email: "pref-autorisations-aeriennes@bouches-du-rhone.gouv.fr" },
  { code: "14", nom: "Calvados", email: "pref-drones@calvados.gouv.fr" },
  { code: "15", nom: "Cantal", email: "pref-declaration-drones@cantal.gouv.fr" },
  { code: "16", nom: "Charente", email: "pref-reglementation@charente.gouv.fr" },
  { code: "17", nom: "Charente-Maritime", email: "pref-manifestations-aeriennes@charente-maritime.gouv.fr" },
  { code: "18", nom: "Cher", email: "pref-drones@cher.gouv.fr" },
  { code: "19", nom: "Corrèze", email: "pref-declaration-drones@correze.gouv.fr" },
  { code: "201", nom: "Corse-du-Sud", email: "pref-demande-survol@corse-du-sud.gouv.fr" },
  { code: "202", nom: "Haute-Corse", email: "pref-declaration-drones@haute-corse.gouv.fr" },
  { code: "21", nom: "Côte-d'Or", email: "pref-drone@cote-dor.gouv.fr" },
  { code: "22", nom: "Côtes-d'Armor", email: "pref-policedelair@cotes-darmor.gouv.fr" },
  { code: "23", nom: "Creuse", email: "pref-travail-aerien@creuse.gouv.fr" },
  { code: "24", nom: "Dordogne", email: "pref-aeronautique@dordogne.gouv.fr" },
  { code: "25", nom: "Doubs", email: "pref-polices-administratives@doubs.gouv.fr" },
  { code: "26", nom: "Drôme", email: "pref-declaration-drones@drome.gouv.fr" },
  { code: "27", nom: "Eure", email: "pref-aerien@eure.gouv.fr" },
  { code: "28", nom: "Eure-et-Loir", email: "pref-manifestations-aeriennes@eure-et-loir.gouv.fr" },
  { code: "29", nom: "Finistère", email: "sp-brest-activites-aeriennes@finistere.gouv.fr" },
  { code: "30", nom: "Gard", email: "pref-declaration-drones@gard.gouv.fr" },
  { code: "31", nom: "Haute-Garonne", email: "pref-declaration-drones@haute-garonne.gouv.fr" },
  { code: "32", nom: "Gers", email: "pref-drones@gers.gouv.fr" },
  { code: "33", nom: "Gironde", email: "pref-declaration-drones@gironde.gouv.fr" },
  { code: "34", nom: "Hérault", email: "pref-drones@herault.gouv.fr" },
  { code: "35", nom: "Ille-et-Vilaine", email: "pref-aerien@ille-et-vilaine.gouv.fr" },
  { code: "36", nom: "Indre", email: "pref-defense-protection-civile@indre.gouv.fr" },
  { code: "37", nom: "Indre-et-Loire", email: "pref-drones@indre-et-loire.gouv.fr" },
  { code: "38", nom: "Isère", email: "pref-declaration-drones@isere.gouv.fr" },
  { code: "39", nom: "Jura", email: "pref-declaration-drones@jura.gouv.fr" },
  { code: "40", nom: "Landes", email: "pref-drones@landes.gouv.fr" },
  { code: "41", nom: "Loir-et-Cher", email: "pref-bpas@loir-et-cher.gouv.fr" },
  { code: "42", nom: "Loire", email: "pref-declaration-drones@loire.gouv.fr" },
  { code: "43", nom: "Haute-Loire", email: "pref-drones@haute-loire.gouv.fr" },
  { code: "44", nom: "Loire-Atlantique", email: "pref-drones@loire-atlantique.gouv.fr" },
  { code: "45", nom: "Loiret", email: "pref-manif-aerienne@loiret.gouv.fr" },
  { code: "46", nom: "Lot", email: "pref-drones@lot.gouv.fr" },
  { code: "47", nom: "Lot-et-Garonne", email: "pref-domaineaerien@lot-et-garonne.gouv.fr" },
  { code: "48", nom: "Lozère", email: "pref-declaration-drones@lozere.gouv.fr" },
  { code: "49", nom: "Maine-et-Loire", email: "pref-ide-reglementation-generale@maine-et-loire.gouv.fr" },
  { code: "50", nom: "Manche", email: "pref-manifestations-aeriennes@manche.gouv.fr" },
  { code: "51", nom: "Marne", email: "pref-drones@marne.gouv.fr" },
  { code: "52", nom: "Haute-Marne", email: "pref-declaration-drones@haute-marne.gouv.fr" },
  { code: "53", nom: "Mayenne", email: "pref-reglementation-generale@mayenne.gouv.fr" },
  { code: "54", nom: "Meurthe-et-Moselle", email: "pref-declaration-drones@meurthe-et-moselle.gouv.fr" },
  { code: "55", nom: "Meuse", email: "pref-polices-administratives@meuse.gouv.fr" },
  { code: "56", nom: "Morbihan", email: "pref-brvc@morbihan.gouv.fr" },
  { code: "57", nom: "Moselle", email: "pref-manifestations-aeriennes@moselle.gouv.fr" },
  { code: "58", nom: "Nièvre", email: "pref-manifestations-sportives@nievre.gouv.fr" },
  { code: "59", nom: "Nord", email: "pref-drones@nord.gouv.fr" },
  { code: "60", nom: "Oise", email: "pref-reglementation@oise.gouv.fr" },
  { code: "61", nom: "Orne", email: "ddt-aviation-civile@orne.gouv.fr" },
  { code: "62", nom: "Pas-de-Calais", email: "pref-drones@pas-de-calais.gouv.fr" },
  { code: "63", nom: "Puy-de-Dôme", email: "pref-manif-sport-63@puy-de-dome.gouv.fr" },
  { code: "64", nom: "Pyrénées-Atlantiques", email: "pref-declaration-drones@pyrenees-atlantiques.gouv.fr" },
  { code: "65", nom: "Hautes-Pyrénées", email: "pref-drones@hautes-pyrenees.gouv.fr" },
  { code: "66", nom: "Pyrénées-Orientales", email: "pref-declaration-drones@pyrenees-orientales.gouv.fr" },
  { code: "67", nom: "Bas-Rhin", email: "pref-drones@bas-rhin.gouv.fr" },
  { code: "68", nom: "Haut-Rhin", email: "pref-declaration-drones@haut-rhin.gouv.fr" },
  { code: "69", nom: "Rhône", email: "pref-manifestationsportive@rhone.gouv.fr" },
  { code: "70", nom: "Haute-Saône", email: "pref-declaration-drones@haute-saone.gouv.fr" },
  { code: "71", nom: "Saône-et-Loire", email: "pref-defense-protection-civile@saone-et-loire.gouv.fr" },
  { code: "72", nom: "Sarthe", email: "pref-epreuves-sportives@sarthe.gouv.fr" },
  { code: "73", nom: "Savoie", email: "pref-drone@savoie.gouv.fr" },
  { code: "74", nom: "Haute-Savoie", email: "pref-declaration-drones@haute-savoie.gouv.fr" },
  { code: "75", nom: "Paris", email: "pp-cabinet-sdc-bvp-circul@interieur.gouv.fr" },
  { code: "76", nom: "Seine-Maritime", email: "pref-rouen-aerien@seine-maritime.gouv.fr" },
  { code: "77", nom: "Seine-et-Marne", email: "pref-drones@seine-et-marne.gouv.fr" },
  { code: "78", nom: "Yvelines", email: "pref-police-aerienne@yvelines.gouv.fr" },
  { code: "79", nom: "Deux-Sèvres", email: "pref-manifestations-aeriennes@deux-sevres.gouv.fr" },
  { code: "80", nom: "Somme", email: "pref-declaration-drones@somme.gouv.fr" },
  { code: "81", nom: "Tarn", email: "pref-epreuves-sportives@tarn.gouv.fr" },
  { code: "82", nom: "Tarn-et-Garonne", email: "pref-declaration-drones@tarn-et-garonne.gouv.fr" },
  { code: "83", nom: "Var", email: "pref-aeronautique@var.gouv.fr" },
  { code: "84", nom: "Vaucluse", email: "pref-declaration-drones@vaucluse.gouv.fr" },
  { code: "85", nom: "Vendée", email: "emmanuel.poisblaud@vendee.gouv.fr" },
  { code: "86", nom: "Vienne", email: "pref-manifestations-sportives@vienne.gouv.fr" },
  { code: "87", nom: "Haute-Vienne", email: "pref-manifestations-sportives@haute-vienne.gouv.fr" },
  { code: "88", nom: "Vosges", email: "pref-drones@vosges.gouv.fr" },
  { code: "89", nom: "Yonne", email: "pref-pole-securite-publique@yonne.gouv.fr" },
  { code: "90", nom: "Territoire de Belfort", email: "pref-declaration-drones@territoire-de-belfort.gouv.fr" },
  { code: "91", nom: "Essonne", email: "pref-reglementation-etampes@essonne.gouv.fr" },
  { code: "92", nom: "Hauts-de-Seine", email: "pref-survol@hauts-de-seine.gouv.fr" },
  { code: "93", nom: "Seine-Saint-Denis", email: "pref-manifvp-aerien@seine-saint-denis.gouv.fr" },
  { code: "94", nom: "Val-de-Marne", email: "pref-police-administrative@val-de-marne.gouv.fr" },
  { code: "95", nom: "Val-d'Oise", email: "pref-police-aerienne@val-doise.gouv.fr" },
  { code: "971", nom: "Guadeloupe", email: "police-administrative@guadeloupe.pref.gouv.fr" },
  { code: "972", nom: "Martinique", email: "reglementation@martinique.pref.gouv.fr" },
  { code: "973", nom: "Guyane", email: "emzd@guyane.pref.gouv.fr" },
  { code: "974", nom: "La Réunion", email: "drones@reunion.pref.gouv.fr" },
  { code: "975", nom: "Saint-Pierre-et-Miquelon", email: "cabinet@spm975.gouv.fr" },
  { code: "976", nom: "Mayotte", email: "defense-protection-civile@mayotte.pref.gouv.fr" },
  { code: "977", nom: "Saint-Barthélémy", email: "reglementation@saint-barth-saint-martin.gouv.fr" },
  { code: "978", nom: "Saint-Martin", email: "reglementation@saint-barth-saint-martin.gouv.fr" },
  { code: "984", nom: "Terres Australes et Antarctiques", email: null },
  { code: "986", nom: "Wallis et Futuna", email: "webmestre@wallis-et-futuna.pref.gouv.fr" },
  { code: "987", nom: "Polynésie Française", email: "cab-polesecurite@polynesie-francaise.pref.gouv.fr" },
  { code: "988", nom: "Nouvelle-Calédonie", email: "ordrepublic988@nouvelle-caledonie.gouv.fr" },
  { code: "989", nom: "Île de Clipperton", email: "cab-polesecurite@polynesie-francaise.pref.gouv.fr" },
];

// Codes postaux à 5 chiffres -> code département utilisé dans PREFECTURES.
// Cas particuliers : Corse (2A/2B en plaque, mais CP commence par 20 ->
// distingué par les 3 premiers chiffres 200-201 = Corse-du-Sud, 202-206 =
// Haute-Corse, approximation courante car le découpage précis suit les
// communes, pas les CP), et DOM-TOM à 3 chiffres de département (971-989).
export function deriveDeptCode(codePostal: string | null | undefined): string | null {
  if (!codePostal) return null;
  const cp = codePostal.trim();
  if (!/^\d{5}$/.test(cp)) return null;

  // DOM-TOM : les 3 premiers chiffres du CP correspondent déjà au code.
  if (cp.startsWith("97") || cp.startsWith("98")) {
    return cp.slice(0, 3);
  }

  // Corse : CP 20xxx, distingué par la commune (arrondi usuel : < 20200 =
  // Corse-du-Sud sauf exceptions, >= 20200 = Haute-Corse). Approximation
  // simple et suffisante ici : le champ reste modifiable si jamais faux.
  if (cp.startsWith("20")) {
    const n = parseInt(cp, 10);
    return n < 20200 ? "201" : "202";
  }

  return cp.slice(0, 2);
}

export function findPrefecture(codePostal: string | null | undefined): PrefectureContact | null {
  const code = deriveDeptCode(codePostal);
  if (!code) return null;
  return PREFECTURES.find((p) => p.code === code) || null;
}
