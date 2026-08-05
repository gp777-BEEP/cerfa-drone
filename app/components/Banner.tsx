import type { ReactNode } from "react";

const STYLES = {
  error: { cls: "banner-error", dot: "bg-red-400/20 text-red-300" },
  warning: { cls: "banner-warning", dot: "bg-amber-400/20 text-amber-300" },
} as const;

function Banner({ kind, children, className = "" }: { kind: "error" | "warning"; children: ReactNode; className?: string }) {
  const s = STYLES[kind];
  return (
    <div className={`flex items-start gap-2.5 border ${s.cls} px-3.5 py-3 text-sm ${className}`}>
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${s.dot}`}>
        !
      </span>
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

// Message d'erreur ponctuel (échec d'enregistrement, réponse serveur en erreur...).
export function ErrorBanner({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Banner kind="error" className={className}>
      {children}
    </Banner>
  );
}

// Avertissement non bloquant (profil incomplet, rappel avant envoi...).
export function WarningBanner({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Banner kind="warning" className={className}>
      {children}
    </Banner>
  );
}
