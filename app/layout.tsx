import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

const socialImage = {
  url: '/assets/social-card.png',
  width: 1200,
  height: 630,
  alt: 'Cheridose — Know what’s next.',
  type: 'image/png',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://cheridose.com'),
  title: 'Cheridose — Simple Medication Reminders for iPhone',
  description:
    'Cheridose is a calm medication reminder and dose tracker for iPhone. See what’s next, understand when it’s due, and record it with one clear action.',
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/assets/icon.svg', type: 'image/svg+xml' },
      { url: '/assets/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Cheridose',
    title: 'Cheridose — Know what’s next.',
    description: 'A calm, clear medication reminder and dose tracker for iPhone.',
    url: '/',
    images: [socialImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cheridose — Know what’s next.',
    description: 'A calm, clear medication reminder and dose tracker for iPhone.',
    images: [{ url: socialImage.url, alt: socialImage.alt }],
  },
};

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f5f0e9',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        {children}
        <Script src="/site-config.js" strategy="beforeInteractive" />
        <Script src="/site.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
