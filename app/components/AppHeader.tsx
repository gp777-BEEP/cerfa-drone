import Link from "next/link";
import SignOutButton from "../dashboard/SignOutButton";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 nav-glass border-b border-white/10">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
        <Link href="/dashboard" className="flex items-center gap-2 font-medium text-ink">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2dd9ac" strokeWidth="1.8">
            <path d="M12 3v18M4.5 8.5l15 7M19.5 8.5l-15 7" strokeLinecap="round" />
          </svg>
          Cerfa Drone
        </Link>
        <nav className="flex items-center gap-5 text-sm text-slate-500">
          <Link href="/dashboard" className="hover:text-brand">
            Missions
          </Link>
          <Link href="/profile" className="hover:text-brand">
            Profil
          </Link>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
