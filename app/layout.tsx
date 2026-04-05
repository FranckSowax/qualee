import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://cartelle.app'),
  title: {
    default: 'Cartelle - Boostez vos avis Google avec la gamification',
    template: '%s | Cartelle',
  },
  description:
    'Transformez vos clients satisfaits en ambassadeurs avec notre roue de la fortune gamifiée. Augmentez vos avis Google et TripAdvisor facilement.',
  keywords: [
    'avis google',
    'gamification',
    'roue de la fortune',
    'fidélisation client',
    'restaurant marketing',
    'QR code',
    'avis clients',
    'réputation en ligne',
    'FCFA',
    'Afrique',
  ],
  authors: [{ name: 'Cartelle' }],
  creator: 'Cartelle',
  publisher: 'Cartelle',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'Cartelle',
    title: 'Cartelle - Boostez vos avis Google avec la gamification',
    description:
      'Transformez vos clients satisfaits en ambassadeurs avec notre roue de la fortune gamifiée.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Cartelle - Boostez vos avis clients',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cartelle - Boostez vos avis Google',
    description: 'La roue gamifiée qui booste vos avis Google et TripAdvisor.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon-cartelle.png',
    apple: '/favicon-cartelle.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link href="https://fonts.cdnfonts.com/css/arco" rel="stylesheet" />
        <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <QueryProvider>
            <I18nProvider>
              {children}
            </I18nProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
