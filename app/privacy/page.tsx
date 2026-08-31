import type { Metadata } from 'next';
import privacyDocument from '../../privacy/index.html?raw';
import { StaticDocument } from '../html-document';

export const metadata: Metadata = {
  title: 'Privacy Policy — Cheridose',
  description:
    'Learn how Cheridose stores medication schedules and dose history locally on your device.',
  alternates: { canonical: '/privacy/' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Cheridose',
    title: 'Privacy Policy — Cheridose',
    description: 'Cheridose is private by default. Learn how your information is handled.',
    url: '/privacy/',
    images: [
      {
        url: '/assets/social-card.png',
        width: 1200,
        height: 630,
        alt: 'Cheridose — Know what’s next.',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy — Cheridose',
    description: 'Cheridose is private by default. Learn how your information is handled.',
    images: [{ url: '/assets/social-card.png', alt: 'Cheridose — Know what’s next.' }],
  },
};

export default function PrivacyPage() {
  return <StaticDocument document={privacyDocument} />;
}
