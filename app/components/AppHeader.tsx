import Link from "next/link";
import SignOutButton from "../dashboard/SignOutButton";
import DroneIcon from "./DroneIcon";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 nav-glass border-b border-white/10">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
        <Link href="/dashboard" className="flex items-center gap-2 font-medium text-ink">
          <DroneIcon
            size={20}
            className="text-brand"
            style={{ filter: "drop-shadow(0 0 6px rgba(65,250,187,0.65))" }}
          />
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
