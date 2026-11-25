import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DudaMia — Cat Logic Puzzle",
  description: "Um jogo aconchegante de lógica felina.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
