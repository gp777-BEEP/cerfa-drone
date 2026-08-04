import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cerfa Drone — Déclarations de vol simplifiées",
  description: "Génère automatiquement ton dossier de déclaration préfectorale de vol de drone.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
