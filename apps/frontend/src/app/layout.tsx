import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Reustafy | SaaS de Gestión Integral de Restaurantes Multi-tenant',
  description: 'Esqueleto y panel interactivo multi-tenant con Row Level Security (RLS) en PostgreSQL, optimizado para camareros, cocina y floor managers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        {/* PWA Tags */}
        <meta name="theme-color" content="#090d16" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
