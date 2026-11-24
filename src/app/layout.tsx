import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default: 'RepoCast · Escucha cualquier repositorio de GitHub', template: '%s · RepoCast' },
  description:
    'Pega la URL de un repositorio de GitHub y RepoCast lo convierte en un podcast de dos voces, un mapa interactivo de su arquitectura y una visita guiada por el código.',
  openGraph: { siteName: 'RepoCast', type: 'website', locale: 'es_ES' },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = { themeColor: '#07070c' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
