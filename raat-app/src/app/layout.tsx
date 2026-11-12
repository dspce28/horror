import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter, Noto_Sans_Devanagari, Noto_Sans_Gujarati } from 'next/font/google';
import './globals.css';

const display = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display', display: 'swap' });
const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const deva = Noto_Sans_Devanagari({ subsets: ['devanagari'], weight: ['400', '600', '700'], variable: '--font-deva', display: 'swap' });
const guj = Noto_Sans_Gujarati({ subsets: ['gujarati'], weight: ['400', '600', '700'], variable: '--font-guj', display: 'swap' });

export const metadata: Metadata = {
  title: 'RAAT — The Last Passenger',
  description: 'An interactive Indian horror story. Take the last bus to Ahmedabad. In English, Hindi and Gujarati.',
  openGraph: { title: 'RAAT — The Last Passenger', description: 'Some journeys are not meant to be completed.', type: 'website' },
};

export const viewport: Viewport = { themeColor: '#09090B', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${deva.variable} ${guj.variable}`}>
      <body>{children}</body>
    </html>
  );
}
