"use client";

import Link from "next/link";
import { Drone, droneKey, droneLabel } from "@/lib/drones";

export default function DroneChecklist({
  drones,
  checkedKeys,
  onToggle,
  onSetAll,
}: {
  drones: Drone[];
  checkedKeys: Set<string>;
  onToggle: (key: string) => void;
  // Optionnel : "tout cocher" / "tout décocher" (retour bêta-testeur), pas
  // affiché si absent (ex. listes très courtes où ça n'apporte rien).
  onSetAll?: (keys: string[]) => void;
}) {
  if (drones.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Aucun drone enregistré pour l'instant.{" "}
        <Link href="/profile" className="text-brand hover:underline">
          Ajoutez-les dans votre profil
        </Link>{" "}
        (réutilisés ensuite pour toutes vos missions), ou importez un Cerfa qui en contient.
      </p>
    );
  }

  const allKeys = drones.map(droneKey);
  const allChecked = allKeys.every((k) => checkedKeys.has(k));
  const noneChecked = allKeys.every((k) => !checkedKeys.has(k));

  return (
    <div>
      {onSetAll && drones.length > 1 && (
        <div className="mb-2 flex gap-3 text-xs">
          <button
            type="button"
            onClick={() => onSetAll(allKeys)}
            disabled={allChecked}
            className="text-brand hover:underline disabled:cursor-default disabled:text-slate-400 disabled:no-underline"
          >
            Tout sélectionner
          </button>
          <button
            type="button"
            onClick={() => onSetAll([])}
            disabled={noneChecked}
            className="text-brand hover:underline disabled:cursor-default disabled:text-slate-400 disabled:no-underline"
          >
            Tout désélectionner
          </button>
        </div>
      )}
      <div className="space-y-1.5">
        {drones.map((d) => {
          const key = droneKey(d);
          return (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={checkedKeys.has(key)} onChange={() => onToggle(key)} />
              {droneLabel(d)}
            </label>
          );
        })}
      </div>
    </div>
  );
}
