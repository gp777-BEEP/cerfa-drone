"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.push("/dashboard");
        router.refresh();
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [router, supabase]);

  if (!ready) return null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-6 text-center text-2xl font-semibold text-brand">Cerfa Drone</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="light"
          providers={[]}
          localization={{
            variables: {
              sign_in: { email_label: "Email", password_label: "Mot de passe", button_label: "Se connecter" },
              sign_up: { email_label: "Email", password_label: "Mot de passe", button_label: "Créer un compte" },
            },
          }}
        />
      </div>
    </main>
  );
}
