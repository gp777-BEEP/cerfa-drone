"use client";

import { usePathname } from "next/navigation";
import AppHeader from "./AppHeader";

// Rendu une seule fois depuis le layout racine (comme le Footer), au lieu
// d'être importé et instancié séparément dans chaque page.tsx -- ce dernier
// schéma faisait que la nav entière (avec son état de survol/spotlight)
// était démontée puis remontée à chaque navigation, provoquant un flash
// visible (disparition/réapparition instantanée) au clic, absent des liens
// du Footer qui lui reste monté en permanence. En centralisant ici, la nav
// persiste à travers les navigations client-side entre les pages qui
// l'affichent.
const HIDDEN_ON = ["/", "/login"];

export default function ConditionalHeader() {
  const pathname = usePathname();
  if (pathname && HIDDEN_ON.includes(pathname)) return null;
  return <AppHeader />;
}
