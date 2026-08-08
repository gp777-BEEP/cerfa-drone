import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ADMIN_EMAILS } from "@/lib/adminEmails";

function daysAgo(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const d = new Date(iso).getTime();
  return d >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!ADMIN_EMAILS.includes(user.email || "")) redirect("/dashboard");

  const admin = createAdminClient();

  // Pas de table "connexions" dédiée : Supabase Auth garde déjà
  // created_at/last_sign_in_at par utilisateur, pas besoin de dupliquer cette
  // info dans une table à part rien que pour ce dashboard.
  const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = usersPage?.users || [];

  const [{ count: missionsCount }, { count: documentsCount }, { count: suggestionsCount }, { data: recentSuggestions }, { data: profiles }] =
    await Promise.all([
      admin.from("missions").select("id", { count: "exact", head: true }),
      admin.from("documents").select("id", { count: "exact", head: true }),
      admin.from("suggestions").select("id", { count: "exact", head: true }),
      admin.from("suggestions").select("id, message, created_at, user_id").order("created_at", { ascending: false }).limit(30),
      admin.from("profiles").select("id, full_name"),
    ]);

  const emailByUserId = new Map<string, string>(users.map((u: any) => [u.id as string, (u.email as string) || ""]));
  // Nom affiché à côté de l'email pour chaque suggestion (retour
  // bêta-testeur) : facultatif, un profil non rempli retombe juste sur
  // l'email seul.
  const nameByUserId = new Map<string, string>(
    (profiles || []).filter((p: any) => p.full_name).map((p: any) => [p.id as string, p.full_name as string])
  );

  const totalUsers = users.length;
  const activeUsers7d = users.filter((u: any) => daysAgo(u.last_sign_in_at, 7)).length;
  const newUsers7d = users.filter((u: any) => daysAgo(u.created_at, 7)).length;
  const usersSorted = [...users].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-1 text-2xl font-medium text-ink">Suivi bêta</h1>
        <p className="mb-8 text-sm text-slate-500">Visible uniquement par vous ({user.email}).</p>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Counter label="Utilisateurs inscrits" value={totalUsers} />
          <Counter label="Connectés (7 derniers jours)" value={activeUsers7d} />
          <Counter label="Nouveaux inscrits (7j)" value={newUsers7d} />
          <Counter label="Missions créées" value={missionsCount ?? 0} />
          <Counter label="Dossiers générés" value={documentsCount ?? 0} />
          <Counter label="Suggestions reçues" value={suggestionsCount ?? 0} />
        </div>

        <div className="mb-8 bg-glass p-5">
          <h2 className="mb-3 font-medium text-ink">Derniers utilisateurs inscrits</h2>
          {usersSorted.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun utilisateur pour l'instant.</p>
          ) : (
            <div className="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 text-sm">
              {usersSorted.slice(0, 15).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-ink">{u.email}</span>
                  <span className="text-right text-xs text-slate-400">
                    Inscrit {fmtDateTime(u.created_at)}
                    <br />
                    {u.last_sign_in_at ? `Dernière connexion ${fmtDateTime(u.last_sign_in_at)}` : "Jamais connecté"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-glass p-5">
          <h2 className="mb-3 font-medium text-ink">Dernières suggestions</h2>
          {(recentSuggestions || []).length === 0 ? (
            <p className="text-sm text-slate-500">Aucune suggestion pour l'instant.</p>
          ) : (
            <div className="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10">
              {(recentSuggestions || []).map((s: any) => (
                <div key={s.id} className="border-l-2 border-brand px-4 py-3">
                  <p className="text-sm text-ink">{s.message}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {nameByUserId.get(s.user_id)
                      ? `${nameByUserId.get(s.user_id)} (${emailByUserId.get(s.user_id) || "email inconnu"})`
                      : emailByUserId.get(s.user_id) || "Utilisateur inconnu"}{" "}
                    · {fmtDateTime(s.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-glass p-4 text-center">
      <div className="text-2xl font-semibold text-brand">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}
