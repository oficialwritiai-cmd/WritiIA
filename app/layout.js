/*
  Writi.ai - Core Layout v2.5.7
  Build: 2026-03-10
*/
import './globals.css';

export const metadata = {
    title: 'Writi.ai | Planificador de Contenido e Ideas con IA para Creadores',
    description: 'Crea tu calendario mensual en minutos. WRITI es el generador de contenido con IA que te da ideas virales y escribe los guiones para tus Reels, TikToks y posts.',
};
// v14
export const viewport = {
    themeColor: '#050505',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
};

// EXTREME CACHE BUSTING FOR VERCEL
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs'; // Ensure no edge-caching of the layout itself

import SupportWidget from '@/app/components/SupportWidget';
import { Providers } from '@/app/components/Providers';

export default function RootLayout({ children }) {
    return (
        <html lang="es">
            <head>
                <meta charset="UTF-8" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Outfit:wght@300;600;900&display=swap" rel="stylesheet" />
            </head>
            <body>
                <Providers>
                    {children}
                </Providers>
                <SupportWidget />
            </body>
        </html>
    );
}
