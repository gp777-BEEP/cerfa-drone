"use client";

import { useMemo } from "react";
import { findPrefecture, type PrefectureContact } from "@/lib/cerfa/prefectures";
import { useSpotlightHoverBgOnly } from "@/lib/useSpotlightHover";

type Zone = {
  id: string;
  title: string | null;
  adresse: string | null;
  code_postal: string | null;
  localite: string | null;
};

function frDate(iso?: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export default function SendToPrefectureButton({
  missionTitle,
  dateDebut,
  dateFin,
  pilotName,
  zones,
}: {
  missionTitle: string;
  dateDebut?: string | null;
  dateFin?: string | null;
  pilotName?: string | null;
  zones: Zone[];
}) {
  const spotlight = useSpotlightHoverBgOnly();

  const { destinataires, sansCodePostal } = useMemo(() => {
    const found = new Map<string, PrefectureContact>();
    let missing = 0;
    for (const z of zones) {
      const pref = findPrefecture(z.code_postal);
      if (pref?.email) {
        found.set(pref.code, pref);
      } else {
        missing++;
      }
    }
    return { destinataires: Array.from(found.values()), sansCodePostal: missing };
  }, [zones]);

  if (destinataires.length === 0) {
    return (
      <p className="mt-3 text-xs text-slate-400">
        L'adresse de la préfecture à contacter sera proposée ici une fois qu'au moins une zone aura un code postal
        valide renseigné.
      </p>
    );
  }

  const zonesLines = zones
    .map((z) => {
      const label = z.title || z.adresse || "Zone";
      const lieu = [z.adresse, z.code_postal, z.localite].filter(Boolean).join(" ");
      return `- ${label}${lieu ? ` : ${lieu}` : ""}`;
    })
    .join("\n");

  const objet = `Déclaration de vol de drone - ${pilotName ? pilotName + " - " : ""}${missionTitle}${
    dateDebut ? ` - ${frDate(dateDebut)}` : ""
  }`;

  const corps = `Madame, Monsieur,

Vous trouverez ci-joint le dossier de déclaration de vol de drone pour la mission "${missionTitle}"${
    dateDebut ? `, prévue du ${frDate(dateDebut)}${dateFin && dateFin !== dateDebut ? ` au ${frDate(dateFin)}` : ""}` : ""
  }.

Zone(s) de vol concernée(s) :
${zonesLines}

Cordialement,
${pilotName || ""}`;

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs text-slate-400">
        Le mail s'ouvrira pré-rempli dans votre logiciel de messagerie habituel. Pensez à{" "}
        <strong className="text-ink">joindre le dossier PDF téléchargé</strong> et à relire le message avant de
        l'envoyer.
      </p>
      {destinataires.map((pref) => (
        <a
          key={pref.code}
          href={`mailto:${pref.email}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`}
          className="inline-flex items-center gap-2 rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand outline-none transition-colors hover:bg-brand-light focus-visible:ring-2 focus-visible:ring-brand/50"
          style={spotlight.style}
          onMouseMove={spotlight.onMouseMove}
          onMouseLeave={spotlight.onMouseLeave}
          onClick={spotlight.onClick}
        >
          ✉ Envoyer à la préfecture ({pref.nom})
        </a>
      ))}
      {destinataires.length > 1 && (
        <p className="text-xs text-warning-text">
          Les zones de cette mission dépendent de {destinataires.length} préfectures différentes : un email
          pré-rempli est proposé pour chacune.
        </p>
      )}
      {sansCodePostal > 0 && (
        <p className="text-xs text-slate-400">
          {sansCodePostal} zone{sansCodePostal > 1 ? "s" : ""} sans code postal renseigné n'
          {sansCodePostal > 1 ? "ont" : "a"} pas pu être rattachée{sansCodePostal > 1 ? "s" : ""} à une préfecture.
        </p>
      )}
    </div>
  );
}
