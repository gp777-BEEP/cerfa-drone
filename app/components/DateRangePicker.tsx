"use client";

import { useEffect, useMemo, useState } from "react";

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];
const DOWS = ["L", "M", "M", "J", "V", "S", "D"];

function parseIso(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmtShort(d: Date | null): string {
  if (!d) return "Choisir une date";
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3).toLowerCase()}. ${d.getFullYear()}`;
}
function sameDay(a: Date | null, b: Date | null) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type Props = {
  dateDebut: string;
  setDateDebut: (v: string) => void;
  heureDebut: string;
  setHeureDebut: (v: string) => void;
  dateFin: string;
  setDateFin: (v: string) => void;
  heureFin: string;
  setHeureFin: (v: string) => void;
};

// Sélecteur de plage de dates : contrairement à deux <input type="date">
// natifs séparés (où choisir la fin fait perdre de vue le début, chacun
// ouvrant son propre calendrier modal), les deux dates restent affichées en
// permanence au-dessus d'un calendrier unique et partagé.
export default function DateRangePicker({
  dateDebut,
  setDateDebut,
  heureDebut,
  setHeureDebut,
  dateFin,
  setDateFin,
  heureFin,
  setHeureFin,
}: Props) {
  const start = parseIso(dateDebut);
  const end = parseIso(dateFin);
  const [picking, setPicking] = useState<"debut" | "fin">(start ? "fin" : "debut");
  const [viewDate, setViewDate] = useState(() => start || end || new Date());

  // dateDebut/dateFin arrivent parfois APRÈS le montage (import Cerfa
  // asynchrone qui préremplit les dates une fois la réponse reçue) : sans
  // ça, le calendrier restait bloqué sur le mois du jour de la création,
  // même une fois une date d'octobre importée et affichée au-dessus.
  useEffect(() => {
    if (start) setViewDate(start);
    else if (end) setViewDate(end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateDebut, dateFin]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  function shiftMonth(delta: number) {
    setViewDate(new Date(viewYear, viewMonth + delta, 1));
  }

  function pickDay(d: Date) {
    if (picking === "debut") {
      setDateDebut(toIso(d));
      if (end && d > end) setDateFin(toIso(d));
      setPicking("fin");
    } else {
      if (start && d < start) {
        setDateFin(toIso(start));
        setDateDebut(toIso(d));
      } else {
        setDateFin(toIso(d));
      }
      setPicking("fin");
    }
  }

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const out: { day: number; date: Date | null }[] = [];
    for (let i = 0; i < startOffset; i++) out.push({ day: 0, date: null });
    for (let d = 1; d <= daysInMonth; d++) out.push({ day: d, date: new Date(viewYear, viewMonth, d) });
    const trailing = (7 - (out.length % 7)) % 7;
    for (let i = 0; i < trailing; i++) out.push({ day: 0, date: null });
    return out;
  }, [viewYear, viewMonth]);

  return (
    <div>
      <div className="flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        <button
          type="button"
          onClick={() => setPicking("debut")}
          className={`flex-1 px-4 py-2.5 text-left transition-colors ${
            picking === "debut" ? "bg-brand/10" : "hover:bg-white/[0.04]"
          }`}
        >
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Début</div>
          <div className="text-sm font-medium text-ink">{fmtShort(start)}</div>
        </button>
        <div className="flex items-center px-1 text-slate-500">→</div>
        <button
          type="button"
          onClick={() => setPicking("fin")}
          className={`flex-1 px-4 py-2.5 text-left transition-colors ${
            picking === "fin" ? "bg-brand/10" : "hover:bg-white/[0.04]"
          }`}
        >
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Fin</div>
          <div className="text-sm font-medium text-ink">{fmtShort(end)}</div>
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Mois précédent"
            className="h-6 w-6 rounded-md border border-white/10 text-sm text-ink hover:bg-white/[0.06]"
          >
            ‹
          </button>
          <div className="text-sm font-medium text-ink">
            {MONTHS[viewMonth]} {viewYear}
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Mois suivant"
            className="h-6 w-6 rounded-md border border-white/10 text-sm text-ink hover:bg-white/[0.06]"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {DOWS.map((d, i) => (
            <div key={i} className="py-1 text-center text-[11px] text-slate-500">
              {d}
            </div>
          ))}
          {cells.map((c, i) => {
            if (!c.date) return <div key={i} className="aspect-square" />;
            const inRange = !!start && !!end && c.date >= start && c.date <= end;
            const isEdge = sameDay(c.date, start) || sameDay(c.date, end);
            return (
              <button
                type="button"
                key={i}
                onClick={() => pickDay(c.date as Date)}
                className={`aspect-square rounded-md text-xs transition-colors ${
                  isEdge
                    ? "bg-brand font-semibold text-[#062018]"
                    : inRange
                    ? "bg-brand/15 text-ink"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-ink"
                }`}
              >
                {c.day}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex gap-3 border-t border-white/10 pt-3">
          <label className="flex-1 text-xs">
            <span className="mb-1 block text-slate-500">Heure de début</span>
            <input
              type="time"
              value={heureDebut}
              onChange={(e) => setHeureDebut(e.target.value)}
              className="w-full rounded-md border border-white/10 px-2.5 py-1.5 text-sm"
            />
          </label>
          <label className="flex-1 text-xs">
            <span className="mb-1 block text-slate-500">Heure de fin</span>
            <input
              type="time"
              value={heureFin}
              onChange={(e) => setHeureFin(e.target.value)}
              className="w-full rounded-md border border-white/10 px-2.5 py-1.5 text-sm"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
