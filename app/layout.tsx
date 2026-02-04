import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { Toaster } from "@/components/ui/toaster";
import { ConditionalLayout } from "@/components/conditional-layout";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "LE DASH - Plateforme d'Assurance NSIA",
  description: "Solution SaaS de gestion d'assurance developpee par Nodes Technology pour NSIA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${manrope.variable} ${sora.variable} font-sans`}>
        <Providers>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
