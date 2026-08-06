"use client";

import Link from "next/link";
import { Drone, droneKey, droneLabel } from "@/lib/drones";

export default function DroneChecklist({
  drones,
  checkedKeys,
  onToggle,
}: {
  drones: Drone[];
  checkedKeys: Set<string>;
  onToggle: (key: string) => void;
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

  return (
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
  );
}
