import './globals.css';

export const metadata = {
    title: 'WRITI.AI — Genera guiones virales para Reels y TikTok con IA',
    description: 'Genera 5 guiones listos para grabar en 30 segundos. Para creadores y agencias. Prueba gratis sin tarjeta.',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

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
