// Build Version: 2026-03-09-v27 - Script & Calendar Overhaul v1.13.1
// v1.13.1 - FORCE_REPLOY_2026_03_09_07
import './globals.css';

export const metadata = {
    title: 'WRITI.AI | De Idea a Guion Viral en Segundos',
    description: 'Genera 5 guiones listos para grabar en 30 segundos. Para creadores y agencias. Prueba gratis sin tarjeta.',
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

export default function RootLayout({ children }) {
    return (
        <html lang="es">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Outfit:wght@300;600;900&display=swap" rel="stylesheet" />
            </head>
            <body>{children}</body>
        </html>
    );
}
