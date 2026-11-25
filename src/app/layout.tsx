import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeowMaria — Cat Logic Puzzle",
  description: "A cozy cat-themed logic puzzle inspired by Meowdoku.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
