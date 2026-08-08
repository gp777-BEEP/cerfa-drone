"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { haversineMeters } from "@/lib/kml/parseKml";
import StatusMessage from "../../components/StatusMessage";

type LatLon = { lat: number; lon: number };

// Fond satellite Esri (mêmes tuiles publiques, sans clé, que celles utilisées
// pour composer la carte de la fiche PDF dans lib/kml/staticMap.ts) : garder
// la même imagerie évite la surprise "ça ne ressemble pas à ce que j'ai
// tracé" entre l'éditeur et le dossier généré.
const TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

// Distance de "clic sur un point existant" en pixels écran (pas en mètres :
// sinon le rayon de clic changerait avec le zoom). Cliquer près d'un sommet
// déjà posé le retire, comme sur DroneKeeper -- pas besoin d'un bouton
// "Annuler" séparé.
const HIT_PX = 16;

export default function MapZoneEditor({
  missionId,
  onZoneCreated,
  onCancel,
}: {
  missionId: string;
  onZoneCreated: (zones: any[]) => Promise<void> | void;
  onCancel: () => void;
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"draw" | "pilot">("draw");
  const [points, setPoints] = useState<LatLon[]>([]);
  const [pilot, setPilot] = useState<LatLon | null>(null);
  const [heightM, setHeightM] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Initialisation de la carte (une seule fois) -- l'import de leaflet se
  // fait ici, jamais en haut du fichier : le module touche `window` à
  // l'exécution, ce qui casse le rendu serveur des composants clients côté
  // Next.js si on l'importe de façon statique.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapDivRef.current || mapRef.current) return;
      const map = L.map(mapDivRef.current, { center: [46.6, 2.4], zoom: 5 });
      L.tileLayer(TILE_URL, { attribution: "Esri World Imagery", maxZoom: 19 }).addTo(map);
      L.control.scale({ metric: true, imperial: false }).addTo(map);
      mapRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Gestion du clic (dépend de mode/points, donc ré-attaché à chaque
  // changement -- carte re-rendue peu souvent, le coût est négligeable).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    function onClick(e: any) {
      const clicked = { lat: e.latlng.lat, lon: e.latlng.lng };
      if (mode === "draw") {
        let nearestIdx = -1;
        let nearestPx = HIT_PX;
        points.forEach((p, i) => {
          const a = map.latLngToContainerPoint(e.latlng);
          const b = map.latLngToContainerPoint([p.lat, p.lon]);
          const d = a.distanceTo(b);
          if (d < nearestPx) {
            nearestPx = d;
            nearestIdx = i;
          }
        });
        if (nearestIdx >= 0) setPoints((prev) => prev.filter((_, i) => i !== nearestIdx));
        else setPoints((prev) => [...prev, clicked]);
      } else {
        setPilot(clicked);
      }
    }
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [mode, points, ready]);

  // Redessine le polygone / les points / le télépilote à chaque changement.
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const L = (await import("leaflet")).default;
      const group = layerGroupRef.current;
      if (!group) return;
      group.clearLayers();
      if (points.length > 0) {
        L.polygon(
          points.map((p) => [p.lat, p.lon] as [number, number]),
          { color: "#0F6E56", weight: 2, fillColor: "#1D9E75", fillOpacity: 0.28 }
        ).addTo(group);
        points.forEach((p) => {
          L.circleMarker([p.lat, p.lon], {
            radius: 6,
            color: "white",
            weight: 2,
            fillColor: "#0F6E56",
            fillOpacity: 1,
          }).addTo(group);
        });
      }
      if (pilot) {
        L.circleMarker([pilot.lat, pilot.lon], {
          radius: 7,
          color: "white",
          weight: 2,
          fillColor: "#185FA5",
          fillOpacity: 1,
        }).addTo(group);
      }
    })();
  }, [points, pilot, ready]);

  const distanceEstimate = useMemo(() => {
    if (points.length === 0) return null;
    if (!pilot) {
      const centroid = {
        lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
        lon: points.reduce((s, p) => s + p.lon, 0) / points.length,
      };
      return Math.round(Math.max(...points.map((p) => haversineMeters(centroid, p))));
    }
    return Math.round(Math.max(...points.map((p) => haversineMeters(pilot, p))));
  }, [points, pilot]);

  async function searchAddress() {
    if (!addressQuery.trim() || !mapRef.current) return;
    setSearching(true);
    setMsg("");
    try {
      const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(addressQuery)}&limit=1`);
      const json = await res.json();
      const feature = json?.features?.[0];
      if (feature) {
        const [lon, lat] = feature.geometry.coordinates;
        mapRef.current.setView([lat, lon], 17);
      } else {
        setMsg("Adresse introuvable, déplacez-vous directement sur la carte.");
      }
    } catch {
      setMsg("Recherche d'adresse indisponible, déplacez-vous directement sur la carte.");
    } finally {
      setSearching(false);
    }
  }

  function buildKml(): string {
    const heightVal = Number(heightM) || 0;
    const ring = [...points, points[0]];
    const coords = ring.map((p) => `${p.lon},${p.lat},${heightVal}`).join(" ");
    const zoneName = addressQuery.trim() || "Zone tracée";
    const pilotPlacemark = pilot
      ? `<Placemark><ExtendedData><Data name="type"><value>PILOT</value></Data></ExtendedData><Point><coordinates>${pilot.lon},${pilot.lat},0</coordinates></Point></Placemark>`
      : "";
    return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${zoneName}</name><Placemark><name>${zoneName}</name><ExtendedData><Data name="type"><value>FLIGHT_ZONE</value></Data></ExtendedData><Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>${pilotPlacemark}</Document></kml>`;
  }

  async function handleUse() {
    if (points.length < 3) {
      setMsg("Tracez au moins 3 points pour former une zone.");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const kml = buildKml();
      const file = new File([kml], "zone-tracee.kml", { type: "application/vnd.google-earth.kml+xml" });
      const body = new FormData();
      body.append("file", file);
      body.append("missionId", missionId);
      const res = await fetch("/api/parse-kml", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur");
      if (!json.zones || json.zones.length === 0) throw new Error("La zone n'a pas pu être créée.");
      await onZoneCreated(json.zones);
      setPoints([]);
      setPilot(null);
      setHeightM("");
      setMsg("Zone créée. Vous pouvez en tracer une autre si besoin, ou fermer l'éditeur.");
    } catch (e: any) {
      setMsg(`Erreur : ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="block text-sm font-medium text-ink">Tracer une zone</span>
        <button onClick={onCancel} className="text-xs text-slate-400 hover:underline">
          Fermer
        </button>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Une seule zone à la fois : tracez-la, validez avec "Utiliser cette zone", puis recommencez si vous en
        avez une autre à ajouter.
      </p>

      <div className="mb-2 flex gap-2">
        <input
          value={addressQuery}
          onChange={(e) => setAddressQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchAddress())}
          placeholder="Rechercher une adresse pour centrer la carte"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={searchAddress}
          disabled={searching}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {searching ? "..." : "Chercher"}
        </button>
      </div>

      <div className="mb-2 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("draw")}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
            mode === "draw" ? "border-brand bg-brand-light text-brand" : "border-slate-300 text-slate-600"
          }`}
        >
          Tracer la zone
        </button>
        <button
          type="button"
          onClick={() => setMode("pilot")}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
            mode === "pilot" ? "border-brand bg-brand-light text-brand" : "border-slate-300 text-slate-600"
          }`}
        >
          Placer le télépilote
        </button>
        <button
          type="button"
          onClick={() => {
            setPoints([]);
            setPilot(null);
          }}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600"
        >
          Effacer
        </button>
      </div>

      <div ref={mapDivRef} style={{ height: 340 }} className="overflow-hidden rounded-md border border-slate-300" />
      <p className="mt-2 text-xs text-slate-500">
        Cliquez sur la carte pour poser les sommets. Cliquez sur un point déjà posé pour le retirer.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-md bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">Éloignement max estimé</p>
          <p className="text-lg font-medium text-ink">{distanceEstimate != null ? `${distanceEstimate} m` : "--"}</p>
        </div>
        <label className="block text-xs text-slate-500">
          Hauteur max de vol (m)
          <input
            type="number"
            value={heightM}
            onChange={(e) => setHeightM(e.target.value)}
            placeholder="120"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-ink"
          />
        </label>
      </div>

      <StatusMessage text={msg} />

      <button
        type="button"
        onClick={handleUse}
        disabled={saving || points.length < 3}
        className="mt-3 rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand hover:bg-brand-light disabled:opacity-50"
      >
        {saving ? "Enregistrement..." : "Utiliser cette zone"}
      </button>
    </div>
  );
}
