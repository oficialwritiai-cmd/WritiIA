'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const translations = {
    es: {
        nav: {
            system: 'El Sistema',
            forWho: 'Para quién',
            pricing: 'Precios',
            faq: 'FAQ',
            login: 'Iniciar sesión',
            cta: 'Activar PRO →',
        },
        hero: {
            pill: '⚡ Lanzamiento · Onboarding personal incluido',
            h1Pre: '¿Cuándo fue la última vez que',
            h1Italic: 'publicaste sin estrés?',
            h1Post: '',
            sub: 'Writi.AI planea tu mes completo en 20 minutos. Guiones en tu voz, ideas para tu nicho, calendario listo.',
            subSmall: 'Sin ChatGPT genérico. Sin empezar de cero cada semana.',
            ctaPrimary: 'Activar mi plan PRO — 24,90€/mes',
            ctaTrust: 'Sin permanencia · Cancela cuando quieras · Pago seguro con Stripe',
            ctaSecondary: 'Ver cómo funciona ↓',
            pills: ['Cerebro IA de tu marca', 'Ideas + guiones humanos', 'Mini calendario 2–4 semanas'],
            dash: {
                label: 'Panel WRITI',
                title: 'Plan mensual de contenido',
                stat1: 'Guiones guardados',
                stat2: 'Créditos IA',
                brand: 'Tu Marca Personal',
                brandSub: 'Cerebro IA · activo',
                pillars: ['Autoridad', 'Cliente ideal', 'Pilares', 'FAQs reales'],
                cta: 'Generar plan mensual',
            },
        },
        problem: {
            eyebrow: 'El problema real',
            title: 'Si dependes del contenido para vender, esto te suena:',
            items: [
                { k: 'Cada semana, de cero', v: 'Sabes que el contenido llena tu agenda… pero cada semana empiezas de cero y pierdes horas pensando qué publicar.' },
                { k: 'ChatGPT suena genérico', v: 'Has probado ChatGPT… pero suena genérico y acabas reescribiendo todo para que parezca tuyo.' },
                { k: 'Un mes sí, otro no', v: 'Un mes publicas bien… y al siguiente desapareces porque no tienes un plan claro.' },
            ],
            outroA: 'El problema no es disciplina.',
            outroB: 'El problema es que no tienes un sistema.',
            outroC: 'WRITI es ese sistema.',
        },
        system: {
            eyebrow: 'Sistema de Sesión',
            title: '4 pasos. 60 minutos. Un mes listo para grabar.',
            sub: 'Una sesión guiada que reemplaza tu domingo de planificación, tu carpeta de ideas y tu calendario a medias.',
            steps: [
                { n: '01', k: 'Cerebro IA de tu marca', v: 'En 5–10 minutos defines tu negocio, tu cliente ideal, tus pilares de contenido y las preguntas reales que te hacen los clientes. WRITI guarda este Cerebro IA y solo genera contenido desde ahí.' },
                { n: '02', k: 'Ideas estratégicas para tu mes', v: 'WRITI genera ideas específicas basadas en tus pilares y FAQs, agrupadas por tema. Solo eliges 4–8 ideas que quieras grabar este mes.' },
                { n: '03', k: 'Guiones en tu voz, con huecos humanos', v: 'Por cada idea, la IA redacta un guion con hook, desarrollo y CTA, dejando huecos explícitos tipo «[Aquí añade una anécdota tuya]» para tus historias y ejemplos.' },
                { n: '04', k: 'Mini calendario de 2–4 semanas', v: 'Arrastras los guiones a un calendario simple. Sales con un plan claro: qué grabar y qué publicar cada día.' },
            ],
        },
        notai: {
            eyebrow: 'No es otra IA de contenido',
            title: 'No es otro ChatGPT con prompts',
            blocks: [
                { k: 'No es un chat', v: 'No es un chat donde tienes que saber qué preguntar.' },
                { k: 'No es un calendario vacío', v: 'No es un calendario en blanco que tienes que rellenar tú.' },
                { k: 'No es contenido robot', v: 'No es contenido genérico que suena a IA en lugar de a ti.' },
            ],
            outro: 'Es un sistema completo: Cerebro IA + ideas + guiones + fecha + tu voz de marca, en un solo sitio.',
        },
        forwho: {
            eyebrow: 'Para quién es WRITI',
            title: 'Hecho para expertos que enseñan',
            cards: [
                { k: 'Coaches y consultores', v: 'Demuestra autoridad con contenido educativo profundo. WRITI te ayuda a transformar tu experiencia en ideas, guiones y un calendario que llena tu agenda.' },
                { k: 'Creadores educativos', v: 'Publica 3–5 veces por semana sin quedarte en blanco. WRITI piensa las ideas, escribe el esqueleto del guion y te deja los huecos para tus historias.' },
                { k: 'Agencias y community managers', v: 'Planifica el mes de varios clientes en tiempo récord. Cada proyecto tiene su propio Cerebro IA para mantener la voz de marca.' },
            ],
        },
        value: {
            eyebrow: 'PLAN PRO · Todo incluido',
            planTitle: 'PLAN PRO',
            planPrice: '24,90 €',
            planFreq: '/mes · sin permanencia',
            planBenefits: [
                'Cerebro IA personalizado a tu marca y nicho',
                'Guiones ilimitados listos para grabar',
                'Ideas virales adaptadas a tu sector',
                'Calendario mensual automático',
                'Asistente Nico para refinar y reescribir',
                'Multi-proyecto incluido',
            ],
            guaranteeTitle: '🛡 Garantía total 30 días',
            guarantee: 'Si después de tu primera sesión no tienes 8 ideas, 4 guiones y un calendario para las próximas 2 semanas — te devuelvo el mes completo. Sin formularios. Sin esperas. Solo escríbeme.',
            urgencyTitle: 'Onboarding personal incluido',
            urgency: 'Este mes hago onboarding personal contigo. Te ayudo a configurar tu Cerebro IA y sacar tu primera sesión completa. Cuando escale, este acompañamiento desaparecerá.',
            cta: 'Activar mi plan PRO →',
        },
        launch: {
            eyebrow: '🚀 Lanzamiento — Plazas limitadas',
            title: 'Sé de los primeros',
            body: 'Este mes ofrezco onboarding personal a los primeros 20 usuarios. Te ayudo a configurar tu Cerebro IA y sacar tu primera sesión completa.',
            cta: 'Activar ahora →',
        },
        faq: {
            eyebrow: 'FAQ',
            title: 'Preguntas frecuentes',
            items: [
                { q: '¿Cuánto tarda en configurarse?', a: '10 minutos para el Cerebro IA. En la primera sesión ya tienes guiones listos.' },
                { q: '¿Es diferente a ChatGPT?', a: 'Sí. Writi aprende tu voz, tu nicho y tu estilo. ChatGPT no te conoce. Writi sí.' },
                { q: '¿Qué pasa si cancelo?', a: 'Cancelas cuando quieras desde tu perfil. Sin llamadas, sin emails, sin preguntas.' },
                { q: '¿Para qué plataformas genera contenido?', a: 'Instagram Reels, TikTok, YouTube Shorts, LinkedIn y X.' },
                { q: '¿Funciona para mi nicho?', a: 'Sí. El Cerebro IA se adapta a cualquier nicho porque aprende de ti, no de plantillas genéricas.' },
            ],
        },
        final: {
            eyebrow: 'Empieza hoy',
            title: 'Ten tu mes de contenido resuelto hoy',
            sub: 'Activa WRITI y deja que la IA piense tus ideas, guiones y calendario. Tú solo grabas y publicas.',
            cta: 'Activar mi plan PRO →',
            badges: ['Acceso Premium', 'Sin permanencia', 'Pago seguro vía Stripe'],
        },
        footer: {
            rights: 'Todos los derechos reservados.',
            sys: 'Sistema de Sesión IA para coaches y consultores.',
            links: { product: 'Producto', company: 'Compañía', legal: 'Legal' },
        },
    },
    en: {
        nav: {
            system: 'The System',
            forWho: "Who it's for",
            pricing: 'Pricing',
            faq: 'FAQ',
            login: 'Log in',
            cta: 'Activate PRO →',
        },
        hero: {
            pill: '⚡ Launch · Personal onboarding included',
            h1Pre: "When was the last time you",
            h1Italic: 'posted without stress?',
            h1Post: '',
            sub: 'Writi.AI plans your full month in 20 minutes. Scripts in your voice, ideas for your niche, calendar ready.',
            subSmall: 'No generic ChatGPT. No starting from scratch every week.',
            ctaPrimary: 'Activate my PRO plan — €24.90/mo',
            ctaTrust: 'No commitment · Cancel anytime · Secure Stripe payment',
            ctaSecondary: 'See how it works ↓',
            pills: ['AI Brain of your brand', 'Ideas + human scripts', '2–4 week mini calendar'],
            dash: {
                label: 'WRITI Dashboard',
                title: 'Monthly content plan',
                stat1: 'Scripts saved',
                stat2: 'AI credits',
                brand: 'Your Personal Brand',
                brandSub: 'AI Brain · active',
                pillars: ['Authority', 'Ideal client', 'Pillars', 'Real FAQs'],
                cta: 'Generate monthly plan',
            },
        },
        problem: {
            eyebrow: 'The real problem',
            title: 'If content drives your sales, this sounds familiar:',
            items: [
                { k: 'Every week from zero', v: 'You know content fills your calendar… but every week you start from scratch and lose hours wondering what to post.' },
                { k: 'ChatGPT sounds generic', v: "You've tried ChatGPT… but it sounds generic and you end up rewriting everything so it sounds like you." },
                { k: 'On one month, off the next', v: "One month you post consistently… and the next you disappear because there's no clear plan." },
            ],
            outroA: "The problem isn't discipline.",
            outroB: "The problem is you don't have a system.",
            outroC: 'WRITI is that system.',
        },
        system: {
            eyebrow: 'Session System',
            title: '4 steps. 60 minutes. A month ready to record.',
            sub: "A guided session that replaces your Sunday planning, your folder of ideas and your half-finished calendar.",
            steps: [
                { n: '01', k: 'AI Brain of your brand', v: 'In 5–10 minutes you define your business, your ideal client, your content pillars and the real questions your clients ask. WRITI stores this AI Brain and only generates content from it.' },
                { n: '02', k: 'Strategic ideas for your month', v: 'WRITI generates specific ideas based on your pillars and FAQs, grouped by topic. You just pick 4–8 ideas you want to record this month.' },
                { n: '03', k: 'Scripts in your voice, with human gaps', v: 'For each idea, the AI drafts a script with hook, body and CTA — leaving explicit gaps like "[Add a personal story here]" for your real examples.' },
                { n: '04', k: '2–4 week mini calendar', v: 'Drag scripts into a simple calendar. You leave with a clear plan: what to record and what to publish each day.' },
            ],
        },
        notai: {
            eyebrow: 'Not another AI tool',
            title: "It's not another ChatGPT with prompts",
            blocks: [
                { k: 'Not a chat', v: 'Not a chat where you have to know what to ask.' },
                { k: 'Not an empty calendar', v: 'Not a blank calendar that you have to fill yourself.' },
                { k: 'Not robot content', v: "Not generic content that sounds like AI instead of you." },
            ],
            outro: 'It\'s a complete system: AI Brain + ideas + scripts + date + your brand voice, all in one place.',
        },
        forwho: {
            eyebrow: 'Who WRITI is for',
            title: 'Built for experts who teach',
            cards: [
                { k: 'Coaches & consultants', v: 'Prove authority with deep educational content. WRITI turns your expertise into ideas, scripts and a calendar that fills your pipeline.' },
                { k: 'Educational creators', v: 'Publish 3–5 times a week without going blank. WRITI thinks the ideas, drafts the skeleton, and leaves the gaps for your stories.' },
                { k: 'Agencies & community managers', v: 'Plan the month for several clients in record time. Each project gets its own AI Brain to keep brand voice consistent.' },
            ],
        },
        value: {
            eyebrow: 'PRO PLAN · All included',
            planTitle: 'PRO PLAN',
            planPrice: '€24.90',
            planFreq: '/mo · no commitment',
            planBenefits: [
                'AI Brain personalised to your brand and niche',
                'Unlimited scripts ready to record',
                'Viral ideas tailored to your sector',
                'Automatic monthly calendar',
                'Assistant Nico to refine and rewrite',
                'Multi-project included',
            ],
            guaranteeTitle: '🛡 Total 30-day guarantee',
            guarantee: "If after your first session you don't have 8 ideas, 4 scripts and a calendar for the next 2 weeks — I'll refund the full month. No forms. No waiting. Just message me.",
            urgencyTitle: 'Personal onboarding included',
            urgency: "This month I do personal onboarding with you. I help you set up your AI Brain and ship your first complete session. When we scale, this disappears.",
            cta: 'Activate my PRO plan →',
        },
        launch: {
            eyebrow: '🚀 Launch — Limited spots',
            title: 'Be one of the first',
            body: 'This month I offer personal onboarding to the first 20 users. I help you set up your AI Brain and get your first complete session done.',
            cta: 'Activate now →',
        },
        faq: {
            eyebrow: 'FAQ',
            title: 'Frequently asked questions',
            items: [
                { q: 'How long does setup take?', a: '10 minutes for the AI Brain. In the first session you already have scripts ready.' },
                { q: 'Is it different from ChatGPT?', a: 'Yes. Writi learns your voice, your niche and your style. ChatGPT does not know you. Writi does.' },
                { q: 'What happens if I cancel?', a: 'Cancel anytime from your profile. No calls, no emails, no questions.' },
                { q: 'What platforms does it generate content for?', a: 'Instagram Reels, TikTok, YouTube Shorts, LinkedIn and X.' },
                { q: 'Does it work for my niche?', a: 'Yes. The AI Brain adapts to any niche because it learns from you, not from generic templates.' },
            ],
        },
        final: {
            eyebrow: 'Start today',
            title: 'Get your month of content sorted today',
            sub: 'Activate WRITI and let AI think your ideas, scripts and calendar. You just record and publish.',
            cta: 'Activate my PRO plan →',
            badges: ['Premium access', 'No commitment', 'Secure Stripe payment'],
        },
        footer: {
            rights: 'All rights reserved.',
            sys: 'AI Session System for coaches & consultants.',
            links: { product: 'Product', company: 'Company', legal: 'Legal' },
        },
    },
};

const LangCtx = createContext(null);

export function LanguageLandingProvider({ children }) {
    const [lang, setLangState] = useState('es');

    useEffect(() => {
        const saved = localStorage.getItem('writi_lang');
        if (saved && translations[saved]) setLangState(saved);
    }, []);

    function setLang(l) {
        if (translations[l]) {
            setLangState(l);
            localStorage.setItem('writi_lang', l);
        }
    }

    function t(key) {
        const keys = key.split('.');
        let val = translations[lang];
        for (const k of keys) {
            if (val == null) return key;
            val = val[k];
        }
        return val ?? key;
    }

    return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export function useLang() {
    const ctx = useContext(LangCtx);
    if (!ctx) throw new Error('useLang must be used within LanguageLandingProvider');
    return ctx;
}
