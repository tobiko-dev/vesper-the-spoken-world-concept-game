import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vesper — The Spoken World",
  description: "A single-player voice spellcasting RPG. Explore the Lantern Vale, shape magic with your voice, and choose a path beyond the academy.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
