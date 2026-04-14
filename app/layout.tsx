import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import CookieConsent from "@/components/rgpd/CookieConsent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://qualee.app'),
  title: {
    default: 'Qualee - Boostez vos avis Google avec la gamification',
    template: '%s | Qualee',
  },
  description:
    'Transformez vos clients satisfaits en ambassadeurs avec notre roue de la fortune gamifiée. Augmentez vos avis Google et TripAdvisor facilement.',
  keywords: [
    'avis google',
    'gamification',
    'roue de la fortune',
    'fidélisation client',
    'QR code',
    'avis clients',
    'réputation en ligne',
  ],
  authors: [{ name: 'Qualee' }],
  creator: 'Qualee',
  publisher: 'Qualee',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'Qualee',
    title: 'Qualee - Boostez vos avis Google avec la gamification',
    description:
      'Transformez vos clients satisfaits en ambassadeurs avec notre roue de la fortune gamifiée.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Qualee - Boostez vos avis clients',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qualee - Boostez vos avis Google',
    description: 'La roue gamifiée qui booste vos avis Google et TripAdvisor.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon-qualee.png',
    apple: '/favicon-qualee.png',
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

      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <QueryProvider>
            <I18nProvider>
              {children}
              <CookieConsent />
            </I18nProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
