import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DudaMia — Cat Logic Puzzle",
  description: "Um jogo aconchegante de lógica felina.",
};

const portraitAssets = [
  "maria-face.webp",
  "maria-face-party.webp",
  "maria-face-smile.webp",
  "maria-face-pizza.webp",
  "maria-face-square.webp",
  "maria-face-child.webp",
  "maria-face-baby.webp",
  "maria-face-laugh-1.webp",
  "maria-face-laugh-2.webp",
  "maria-face-pose.webp",
  "maria-face-adjusting.webp",
  "maria-face-painting.webp",
  "maria-face-cap-close.webp",
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        {portraitAssets.map((asset) => (
          <link key={asset} rel="preload" href={`/${asset}`} as="image" type="image/webp" />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
