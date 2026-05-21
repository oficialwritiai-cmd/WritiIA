/*
  Writi.ai - Core Layout v2.6.0
  Build: 2026-03-28
*/
import './globals.css';

export const metadata = {
    title: 'WRITI.AI – Planificador de Contenido con IA para Creadores | Ideas + Guiones + Calendario',
    description: 'Genera ideas virales, guiones completos y un calendario mensual de contenido con IA. Para creadores de Reels y Shorts en español. Empieza hoy mismo.',
    keywords: 'planificador contenido IA, generador guiones reels, calendario contenido ia, ideas virales creadores, guiones shorts ia, planificar redes sociales ia',
    metadataBase: new URL('https://www.writi-ai.com'),
    alternates: {
        canonical: 'https://www.writi-ai.com/',
    },
    openGraph: {
        title: 'WRITI.AI – Tu mes de contenido planificado con IA',
        description: 'Ideas virales, guiones para Reels y calendario mensual con IA. Para creadores que publican solos.',
        url: 'https://www.writi-ai.com/',
        siteName: 'WRITI.AI',
        images: [
            {
                url: 'https://www.writi-ai.com/og-image.jpg',
                width: 1200,
                height: 630,
                alt: 'WRITI.AI – Planificador de contenido con IA',
            },
        ],
        locale: 'es_ES',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'WRITI.AI – Tu mes de contenido planificado con IA',
        description: 'Ideas virales, guiones para Reels y calendario mensual con IA. Para creadores que publican solos.',
        images: ['https://www.writi-ai.com/og-image.jpg'],
    },
    robots: {
        index: true,
        follow: true,
    },
};

export const viewport = {
    themeColor: '#050505',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
};

import SupportWidget from '@/app/components/SupportWidget';
import { Providers } from '@/app/components/Providers';
import PostHogProvider from '@/app/components/PostHogProvider';

const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'WRITI.AI',
    applicationCategory: 'BusinessApplication',
    description: 'Planificador de contenido con IA para creadores. Genera ideas, guiones y calendario mensual automático.',
    offers: {
        '@type': 'Offer',
        price: '24.90',
        priceCurrency: 'EUR',
    },
    operatingSystem: 'Web',
    url: 'https://www.writi-ai.com',
};

export default function RootLayout({ children }) {
    return (
        <html lang="es">
            <head>
                <meta charSet="UTF-8" />
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Outfit:wght@300;400;500;600;700;900&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
                />
            </head>
            <body>
                <PostHogProvider>
                    <Providers>
                        {children}
                    </Providers>
                    <SupportWidget />
                </PostHogProvider>
            </body>
        </html>
    );
}
