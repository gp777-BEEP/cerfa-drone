"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createClient } from "@/lib/supabase/client";
import { ErrorBanner } from "../components/Banner";

type View = "sign_in" | "sign_up" | "forgotten_password";

// Titre + onglets pilotés par nous plutôt que par le composant tiers : un
// beta testeur a signalé que rien n'indiquait "vous êtes en train de créer
// un compte" en cliquant sur ce bouton. showLinks={false} cache le lien de
// bascule interne du composant (qui ne mettait pas à jour ce titre) ; on
// pilote la vue nous-mêmes à la place, avec un intitulé toujours exact.
const VIEW_TITLE: Record<View, string> = {
  sign_in: "Connexion",
  sign_up: "Créer un compte",
  forgotten_password: "Mot de passe oublié",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [origin, setOrigin] = useState("");
  const [view, setView] = useState<View>("sign_in");

  useEffect(() => {
    setReady(true);
    setOrigin(window.location.origin);
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.push("/accueil");
        router.refresh();
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [router, supabase]);

  if (!ready) return null;

  const authError = searchParams.get("error");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-1 text-center text-2xl font-medium text-ink">Cerfa Drone</h1>
      <p className="mb-6 text-center text-sm text-slate-400">{VIEW_TITLE[view]}</p>

      {authError === "confirmation_failed" && (
        <ErrorBanner className="mb-4">
          Le lien de confirmation n'est plus valide (déjà utilisé, ou expiré). Reconnectez-vous, ou
          recommencez l'inscription si besoin.
        </ErrorBanner>
      )}

      {view !== "forgotten_password" && (
        <div className="mb-4 flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1 text-sm">
          <button
            type="button"
            onClick={() => setView("sign_in")}
            className={`flex-1 rounded-md py-1.5 transition-colors ${
              view === "sign_in" ? "bg-brand-light font-medium text-brand" : "text-slate-400 hover:text-ink"
            }`}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => setView("sign_up")}
            className={`flex-1 rounded-md py-1.5 transition-colors ${
              view === "sign_up" ? "bg-brand-light font-medium text-brand" : "text-slate-400 hover:text-ink"
            }`}
          >
            Créer un compte
          </button>
        </div>
      )}

      <div className="bg-glass p-6">
        <Auth
          key={view}
          view={view}
          showLinks={false}
          supabaseClient={supabase}
          redirectTo={origin ? `${origin}/auth/callback` : undefined}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "#41fabb",
                  // Ni le vert clair (bg par défaut) ni le vert très foncé
                  // (oklch 38%, réservé au texte sur fond clair) ne
                  // conviennent ici : ce composant tiers applique le même
                  // brandButtonText (foncé) aux deux états, donc le survol
                  // reste un ton intermédiaire pour rester lisible.
                  brandAccent: "#2fcb95",
                  brandButtonText: "#062018",
                  defaultButtonBackground: "rgba(255,255,255,0.05)",
                  defaultButtonBackgroundHover: "rgba(255,255,255,0.09)",
                  defaultButtonBorder: "rgba(255,255,255,0.14)",
                  defaultButtonText: "#eef1f4",
                  inputBackground: "rgba(255,255,255,0.03)",
                  inputBorder: "rgba(255,255,255,0.16)",
                  inputBorderHover: "rgba(45,217,172,0.5)",
                  inputBorderFocus: "#41fabb",
                  inputText: "#eef1f4",
                  inputLabelText: "#969daa",
                  inputPlaceholder: "#6b7280",
                  messageText: "#eef1f4",
                  messageTextDanger: "#ffb4b4",
                  anchorTextColor: "#41fabb",
                  anchorTextHoverColor: "#2fcb95",
                },
              },
            },
          }}
          theme="dark"
          providers={[]}
          localization={{
            variables: {
              sign_in: {
                email_label: "Email",
                password_label: "Mot de passe",
                email_input_placeholder: "vous@exemple.fr",
                password_input_placeholder: "Votre mot de passe",
                button_label: "Se connecter",
                loading_button_label: "Connexion...",
                link_text: "Vous avez déjà un compte ? Connectez-vous",
              },
              sign_up: {
                email_label: "Email",
                password_label: "Mot de passe",
                email_input_placeholder: "vous@exemple.fr",
                password_input_placeholder: "Choisissez un mot de passe",
                button_label: "Créer un compte",
                loading_button_label: "Création du compte...",
                link_text: "Pas encore de compte ? Inscrivez-vous",
                confirmation_text: "Vérifiez vos emails (pensez aussi aux spams) pour confirmer votre inscription.",
              },
              forgotten_password: {
                email_label: "Email",
                password_label: "Mot de passe",
                email_input_placeholder: "vous@exemple.fr",
                button_label: "Envoyer les instructions",
                loading_button_label: "Envoi en cours...",
                link_text: "Mot de passe oublié ?",
                confirmation_text: "Vérifiez vos emails (pensez aussi aux spams) pour réinitialiser votre mot de passe.",
              },
            },
          }}
        />
        {view === "sign_in" && (
          <button
            type="button"
            onClick={() => setView("forgotten_password")}
            className="mt-3 text-sm text-brand hover:underline"
          >
            Mot de passe oublié ?
          </button>
        )}
        {view === "forgotten_password" && (
          <button type="button" onClick={() => setView("sign_in")} className="mt-3 text-sm text-brand hover:underline">
            ← Retour à la connexion
          </button>
        )}
      </div>
    </main>
  );
}
