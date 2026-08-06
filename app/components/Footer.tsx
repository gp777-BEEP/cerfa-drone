import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 py-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-6 text-xs text-slate-400 sm:flex-row">
        <span>© {new Date().getFullYear()} Cerfa Drone</span>
        <nav className="flex gap-5">
          <Link href="/tutoriel" className="hover:text-brand">
            Tutoriel
          </Link>
          <Link href="/contact" className="hover:text-brand">
            Contact
          </Link>
          <Link href="/suggestions" className="hover:text-brand">
            Suggestions
          </Link>
          <Link href="/confidentialite" className="hover:text-brand">
            Confidentialité
          </Link>
          <Link href="/mentions-legales" className="hover:text-brand">
            Mentions légales
          </Link>
        </nav>
      </div>
    </footer>
  );
}
