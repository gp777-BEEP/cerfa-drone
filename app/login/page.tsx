"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createClient } from "@/lib/supabase/client";
import { ErrorBanner } from "../components/Banner";

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

  useEffect(() => {
    setReady(true);
    setOrigin(window.location.origin);
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.push("/dashboard");
        router.refresh();
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [router, supabase]);

  if (!ready) return null;

  const authError = searchParams.get("error");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-6 text-center text-2xl font-medium text-ink">Cerfa Drone</h1>

      {authError === "confirmation_failed" && (
        <ErrorBanner className="mb-4">
          Le lien de confirmation n'est plus valide (déjà utilisé, ou expiré). Reconnectez-vous, ou
          recommencez l'inscription si besoin.
        </ErrorBanner>
      )}

      <div className="bg-glass p-6">
        <Auth
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
      </div>
    </main>
  );
}
