export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-4 text-2xl font-medium text-ink">Contact</h1>
      <p className="mb-6 text-slate-600">
        Une question, un problème avec un dossier généré, ou besoin d'aide pour démarrer ? Écris-moi
        directement, je réponds personnellement.
      </p>
      <a
        href="mailto:gonnetpaul74@gmail.com?subject=Cerfa%20Drone"
        className="inline-block rounded-md border border-brand px-5 py-2.5 font-medium text-brand hover:bg-brand-light"
      >
        gonnetpaul74@gmail.com
      </a>
      <p className="mt-8 text-sm text-slate-500">
        Une idée d'amélioration plutôt qu'un problème ? Passe par la page{" "}
        <a href="/suggestions" className="text-brand hover:underline">
          Suggestions
        </a>{" "}
        pour que ça reste visible et priorisé.
      </p>
    </main>
  );
}
