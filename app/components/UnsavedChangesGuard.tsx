"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Avertit avant de quitter une page avec des modifications non enregistrées
 * (retour bêta-testeur : un clic malheureux sur un lien de nav a fait perdre
 * des modifs de profil non sauvegardées).
 *  - Fermeture d'onglet / rafraîchissement / navigation tapée dans la barre
 *    d'adresse : popup native du navigateur (beforeunload), impossible à
 *    styliser mais fonctionnelle dans tous les cas.
 *  - Navigation interne (clic sur un lien de la page, ex. la nav du haut) :
 *    on intercepte le clic et on affiche un bloc de confirmation stylé au
 *    lieu de la popup native du navigateur -- "voulez-vous enregistrer avant
 *    de quitter, ou continuer sans enregistrer ?".
 */
export default function UnsavedChangesGuard({
  dirty,
  onSave,
}: {
  dirty: boolean;
  // Doit renvoyer true si la sauvegarde a réussi (auquel cas on poursuit la
  // navigation), false sinon (l'erreur est déjà affichée par le formulaire
  // lui-même, on reste sur place).
  onSave?: () => Promise<boolean> | boolean;
}) {
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!dirtyRef.current) return;
      const anchor = (e.target as HTMLElement)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;
      if (/^https?:\/\//.test(href) && !href.startsWith(window.location.origin)) return; // lien externe
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(href);
    }
    // Capture plutôt que bubble : on veut intercepter avant que Next.js
    // (via le composant Link) ne déclenche sa propre navigation.
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  async function handleSaveAndLeave() {
    if (!onSave) {
      handleLeaveWithoutSaving();
      return;
    }
    setSaving(true);
    const ok = await onSave();
    setSaving(false);
    if (ok && pendingHref) {
      window.location.href = pendingHref;
    }
  }

  function handleLeaveWithoutSaving() {
    if (pendingHref) window.location.href = pendingHref;
  }

  if (!pendingHref) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-glass w-full max-w-sm p-6 text-center shadow-xl">
        <h2 className="mb-2 font-medium text-ink">Modifications non enregistrées</h2>
        <p className="mb-5 text-sm text-slate-500">
          Vous avez des modifications non enregistrées sur cette page. Voulez-vous les enregistrer avant de
          quitter, ou continuer sans les enregistrer ?
        </p>
        <div className="flex flex-col gap-2">
          {onSave && (
            <button
              type="button"
              onClick={handleSaveAndLeave}
              disabled={saving}
              className="rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-[#05100c] hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Enregistrement..." : "Enregistrer et quitter"}
            </button>
          )}
          <button
            type="button"
            onClick={handleLeaveWithoutSaving}
            className="rounded-md border border-white/10 px-4 py-2.5 text-sm text-ink hover:bg-white/5"
          >
            Quitter sans enregistrer
          </button>
          <button
            type="button"
            onClick={() => setPendingHref(null)}
            className="mt-1 text-sm text-slate-400 hover:text-ink"
          >
            Annuler, rester sur cette page
          </button>
        </div>
      </div>
    </div>
  );
}
