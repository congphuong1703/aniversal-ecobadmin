import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import "./globals.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display-face",
});

const uiFont = Manrope({
  subsets: ["latin", "vietnamese"],
  variable: "--font-ui-face",
});

export const metadata: Metadata = {
  title: "EcoBadminton | First Anniversary",
  description: "Celebrate one year of EcoBadminton and RSVP for the party.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${displayFont.variable} ${uiFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
