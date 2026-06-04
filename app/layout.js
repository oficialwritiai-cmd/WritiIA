/*
  Writi.ai - Core Layout v2.7.0
  Build: 2026-05-23
*/
import './globals.css';

export const metadata = {
    title: 'WRITI.AI – Generador de Guiones con IA para Coaches, Creadores e Infoproductores',
    description: 'WRITI.AI genera ideas virales, guiones completos y un calendario mensual de contenido con IA. Diseñado para coaches, consultores, infoproductores y creadores de Reels en español. Tu mes de contenido listo en una tarde.',
    keywords: 'planificador contenido IA, generador guiones reels, calendario contenido ia, ideas virales creadores, guiones shorts ia, planificar redes sociales ia, generador guiones coaches, contenido IA infoproductores, herramienta contenido consultores, guiones TikTok IA, generador de guiones español, planificar contenido redes sociales',
    metadataBase: new URL('https://www.writi-ai.com'),
    alternates: {
        canonical: 'https://www.writi-ai.com/',
    },
    openGraph: {
        title: 'WRITI.AI – Generador de Guiones e Ideas con IA para Coaches y Creadores',
        description: 'Genera guiones para Reels y TikTok, ideas virales y un calendario mensual automático con IA. Para coaches, consultores, infoproductores y creadores en español.',
        url: 'https://www.writi-ai.com/',
        siteName: 'WRITI.AI',
        images: [
            {
                url: 'https://www.writi-ai.com/og-image.jpg',
                width: 1200,
                height: 630,
                alt: 'WRITI.AI – Generador de guiones con IA para coaches y creadores',
            },
        ],
        locale: 'es_ES',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'WRITI.AI – Generador de Guiones e Ideas con IA para Coaches y Creadores',
        description: 'Genera guiones para Reels y TikTok, ideas virales y un calendario mensual automático con IA. Para coaches, consultores e infoproductores en español.',
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
import MetaPixel from '@/app/components/MetaPixel';

const schemaOrg = [
    {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'WRITI.AI',
        applicationCategory: 'BusinessApplication',
        description: 'WRITI.AI es el generador de guiones con IA para coaches, consultores, infoproductores y creadores de contenido en español. Genera ideas virales, guiones completos para Reels y TikTok, y un calendario mensual automático. Diseñado para el mercado hispanohablante.',
        featureList: [
            'Generador de guiones para Reels, TikTok y YouTube Shorts',
            'Ideas de contenido viral adaptadas al nicho',
            'Calendario de contenido mensual con IA',
            'Cerebro IA con memoria de marca persistente',
            'Optimizado para coaches, consultores e infoproductores',
            'Exportación de guiones en 1 clic',
        ],
        audience: {
            '@type': 'Audience',
            audienceType: 'Coaches, consultores, infoproductores, creadores de contenido en español',
        },
        offers: {
            '@type': 'Offer',
            price: '39',
            priceCurrency: 'EUR',
            priceValidUntil: '2026-12-31',
            availability: 'https://schema.org/InStock',
        },
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            reviewCount: '47',
            bestRating: '5',
        },
        operatingSystem: 'Web, iOS, Android',
        url: 'https://www.writi-ai.com',
        sameAs: [
            'https://www.instagram.com/writi.ai',
        ],
    },
    {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'WRITI.AI',
        url: 'https://www.writi-ai.com',
        logo: 'https://www.writi-ai.com/favicon.svg',
        description: 'WRITI.AI es una plataforma SaaS especializada en generación de contenido con inteligencia artificial para el mercado hispanohablante. Ayuda a coaches, consultores, infoproductores y creadores a generar guiones virales, planificar su calendario mensual y publicar contenido de forma consistente.',
        foundingDate: '2025',
        areaServed: ['ES', 'MX', 'AR', 'CO', 'CL', 'PE'],
        contactPoint: {
            '@type': 'ContactPoint',
            email: 'hi@writi-ai.com',
            contactType: 'customer service',
            availableLanguage: 'Spanish',
        },
    },
    {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            {
                '@type': 'Question',
                name: '¿Qué es WRITI.AI?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'WRITI.AI es una plataforma con inteligencia artificial que genera ideas de contenido, guiones completos para Reels y TikTok, y un calendario mensual automático. Está diseñada específicamente para coaches, consultores, infoproductores y creadores de contenido en español.',
                },
            },
            {
                '@type': 'Question',
                name: '¿Cómo funciona el generador de guiones con IA de WRITI?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'WRITI aprende tu voz de marca, nicho y objetivo a través del "Cerebro IA". Luego genera ideas estratégicas y redacta guiones completos con gancho (hook), desarrollo y llamada a la acción (CTA), listos para grabar. Todo el proceso desde idea hasta guion tarda menos de 1 minuto.',
                },
            },
            {
                '@type': 'Question',
                name: '¿Para quién es WRITI.AI?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'WRITI.AI está diseñado para coaches, consultores, infoproductores, creadores de contenido en solitario y agencias de marketing digital que necesitan publicar contenido de forma consistente en Reels, TikTok, YouTube Shorts o LinkedIn, principalmente en el mercado hispanohablante.',
                },
            },
            {
                '@type': 'Question',
                name: '¿Cuánto cuesta WRITI.AI?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'El plan Pro de WRITI.AI cuesta 39 €/mes. Incluye generación ilimitada de ideas y guiones (dentro de créditos mensuales), calendario IA con drag & drop, Cerebro IA de marca persistente, biblioteca de guiones y exportación en 1 clic. Sin permanencias, cancelas cuando quieras.',
                },
            },
            {
                '@type': 'Question',
                name: '¿Funciona para cualquier nicho?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Sí. WRITI.AI funciona para cualquier nicho: fitness, negocios, coaching, moda, gastronomía, tecnología, educación y más. El sistema adapta las ideas y los guiones al nicho, audiencia y tono de marca de cada usuario.',
                },
            },
        ],
    },
];

export default function RootLayout({ children }) {
    return (
        <html lang="es">
            <head>
                <meta charSet="UTF-8" />
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Outfit:wght@300;400;500;600;700;900&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet" />
                {schemaOrg.map((schema, i) => (
                    <script
                        key={i}
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
                    />
                ))}
            </head>
            <body>
                <MetaPixel />
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
