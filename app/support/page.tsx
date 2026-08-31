import type { Metadata } from 'next';
import supportDocument from '../../support/index.html?raw';
import { StaticDocument } from '../html-document';

export const metadata: Metadata = {
  title: 'Support — Cheridose',
  description:
    'Get help with Cheridose medication schedules, local reminders, dose history, privacy, and Premium purchases.',
  alternates: { canonical: '/support/' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Cheridose',
    title: 'Support — Cheridose',
    description:
      'Help with Cheridose medication reminders, dose history, and account-free local storage.',
    url: '/support/',
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
    title: 'Support — Cheridose',
    description:
      'Help with Cheridose medication reminders, dose history, and account-free local storage.',
    images: [{ url: '/assets/social-card.png', alt: 'Cheridose — Know what’s next.' }],
  },
};

export default function SupportPage() {
  return <StaticDocument document={supportDocument} />;
}
