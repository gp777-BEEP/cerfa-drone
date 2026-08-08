import AppHeader from "../components/AppHeader";

export default function ContactPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="mb-4 text-2xl font-medium text-ink">Contact</h1>
        <p className="mb-6 text-slate-600">
          Une question, un problème avec un dossier généré, ou besoin d'aide pour démarrer ? Passez par la page
          Suggestions ci-dessous (les messages y sont lus personnellement), ou écrivez directement à{" "}
          <a href="mailto:gonnetpaul74+cerfa@gmail.com" className="text-brand hover:underline">
            gonnetpaul74+cerfa@gmail.com
          </a>
          .
        </p>
        <a
          href="/suggestions"
          className="inline-block rounded-md border border-brand px-5 py-2.5 font-medium text-brand hover:bg-brand-light"
        >
          Aller à Suggestions
        </a>
        <p className="mt-8 text-sm text-slate-500">
          Une idée d'amélioration plutôt qu'un problème de fonctionnement ? Même page : les suggestions et
          les problèmes remontent au même endroit pour l'instant.
        </p>
      </main>
    </>
  );
}
