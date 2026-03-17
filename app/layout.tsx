import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SoundAtlas",
  description: "A social music journal for rating albums, tracks, and artists.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
