import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Koralia — Dashboard",
  description: "Cuida a tus abuelitos con llamadas de IA",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-stone-50 text-stone-900 font-[family-name:var(--font-geist)]">
        {children}
      </body>
    </html>
  );
}
