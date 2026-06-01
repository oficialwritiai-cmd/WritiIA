export const metadata = {
    title: 'Generador de Guiones con IA para Reels, TikTok y YouTube | WRITI.AI',
    description: 'Crea guiones virales en segundos con el generador de guiones con IA de WRITI. Ganchos (hooks) poderosos, desarrollo estructurado y CTA listos para grabar. Para coaches, consultores, infoproductores y creadores en español.',
    keywords: 'generador guiones IA, generador guiones reels, guiones TikTok IA, generador guiones YouTube, guiones IA español, guiones para coaches, guiones infoproductores, guiones reels gratis, generador scripts IA',
    alternates: {
        canonical: 'https://www.writi-ai.com/generador-guiones-ia',
    },
    openGraph: {
        title: 'Generador de Guiones con IA para Reels, TikTok y YouTube | WRITI.AI',
        description: 'Ganchos virales, desarrollo estructurado y CTA listos para grabar. Generador de guiones con IA diseñado para coaches, consultores e infoproductores en español.',
        url: 'https://www.writi-ai.com/generador-guiones-ia',
        siteName: 'WRITI.AI',
        images: [{ url: 'https://www.writi-ai.com/og-image.jpg', width: 1200, height: 630, alt: 'Generador de guiones con IA – WRITI.AI' }],
        locale: 'es_ES',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Generador de Guiones con IA para Reels, TikTok y YouTube | WRITI.AI',
        description: 'Ganchos virales, desarrollo estructurado y CTA listos para grabar. Para coaches e infoproductores en español.',
        images: ['https://www.writi-ai.com/og-image.jpg'],
    },
};

export default function GeneradorGuionesLayout({ children }) {
    return (
        <>
            {children}
        </>
    );
}
