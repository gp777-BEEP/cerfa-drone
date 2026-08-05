// Les messages d'import (Cerfa/KML/relevé AlphaTango) sont des chaînes libres
// qui mélangent succès et échec ("3 zone(s) importée(s)..." vs "Aucune zone
// trouvée...", "Erreur : ..."). Avant, tout s'affichait dans la même couleur
// (text-brand), donc une erreur pouvait se lire comme une réussite. Ce
// composant détecte les tournures d'échec connues et bascule sur le style
// d'erreur ; sinon il garde le style "succès" existant.
const ERROR_PATTERNS = [/erreur/i, /aucune zone (trouvée|importée)/i, /introuvable/i, /impossible/i];

export default function StatusMessage({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;
  const isError = ERROR_PATTERNS.some((re) => re.test(text));

  if (isError) {
    return (
      <div className={`mt-2 flex items-start gap-2 border banner-error px-3 py-2 text-xs ${className}`}>
        <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-red-400/20 text-[10px] font-bold text-red-300">
          !
        </span>
        <p className="leading-relaxed">{text}</p>
      </div>
    );
  }

  return <p className={`mt-2 text-sm text-brand ${className}`}>{text}</p>;
}
