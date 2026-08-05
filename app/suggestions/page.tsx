import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppHeader from "../components/AppHeader";
import SuggestionForm from "./SuggestionForm";

export default async function SuggestionsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: suggestions } = await supabase
    .from("suggestions")
    .select("id, message, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-2 text-2xl font-medium text-ink">Suggestions</h1>
        <p className="mb-6 text-sm text-slate-600">
          Une fonctionnalité qui te manque, une source de carte à ajouter (Clearance, Google Maps...), un
          format d'import KML ? Dis-le ici, ça m'aide à prioriser.
        </p>

        <SuggestionForm />

        <div className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-ink">Tes suggestions précédentes</h2>
          {(suggestions || []).length === 0 && (
            <p className="text-sm text-slate-500">Aucune suggestion envoyée pour l'instant.</p>
          )}
          <div className="divide-y divide-slate-200 border border-slate-200">
            {(suggestions || []).map((s) => (
              <div key={s.id} className="border-l-2 border-brand bg-white px-4 py-3">
                <p className="text-sm text-ink">{s.message}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(s.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
