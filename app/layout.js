import './globals.css';

export const metadata = {
    title: 'WRITI.AI — Genera guiones virales para Reels y TikTok con IA',
    description: 'Genera 5 guiones listos para grabar en 30 segundos. Para creadores y agencias. Prueba gratis sin tarjeta.',
};

export default function RootLayout({ children }) {
    return (
        <html lang="es">
            <body>{children}</body>
        </html>
    );
}
