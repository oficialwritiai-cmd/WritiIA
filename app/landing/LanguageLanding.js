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
            pill: '⚡ Precio de lanzamiento — 24,90€/mes · Sin permanencia · Plazas limitadas',
            h1Pre: 'El sistema que usan los coaches',
            h1Italic: 'para convertir su contenido en llamadas de venta.',
            h1Post: '',
            sub: 'Writi.AI genera tu mes completo de contenido en una tarde. Guiones en tu voz, ideas para tu nicho y calendario listo para grabar. Sin bloqueos. Sin improvisar. Sin sonar a robot.',
            subSmall: '',
            ctaPrimary: 'Activa tu plan PRO — 24,90€/mes →',
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
            eyebrow: 'Writi.AI es para ti si...',
            title: 'Eres coach o consultor y vendes programas o servicios de alto valor',
            items: [
                { k: '✅ Sabes que el contenido atrae clientes', v: 'Pero no tienes tiempo ni sistema para hacerlo consistente.' },
                { k: '✅ Has probado ChatGPT y suena genérico', v: 'No suena a ti. Necesitas algo que aprenda tu voz y tu estilo único.' },
                { k: '✅ Publicas una semana sí y tres no', v: 'Porque no tienes plan claro. Necesitas un calendario que funcione sin que lo pienses.' },
            ],
            outroA: 'Writi.AI NO es para ti si...',
            outroB: '❌ Buscas una herramienta genérica de generación de texto',
            outroC: '❌ No tienes un negocio de coaching definido',
        },
        system: {
            eyebrow: 'Una tarde. Un mes resuelto.',
            title: '4 pasos. 30 minutos.',
            sub: 'El sistema completo que convierte tu experiencia en contenido que vende.',
            steps: [
                { n: '10 min', k: 'Configuras tu Cerebro IA', v: 'Defines quién eres, a quién ayudas, qué vendes y cómo hablas. Writi lo guarda para siempre.' },
                { n: '5 min', k: 'Eliges tus ideas del mes', v: 'Writi genera 20-30 ideas específicas para tu nicho. Tú solo eliges las que quieres grabar.' },
                { n: '10 min', k: 'Tienes tus guiones listos', v: 'Por cada idea, un guión completo. Gancho, desarrollo y CTA. Con huecos para tus historias reales.' },
                { n: '5 min', k: 'Organizas tu calendario', v: 'Arrastras los guiones a las fechas. Sales con un plan claro de qué grabar y publicar cada día.' },
            ],
        },
        notai: {
            eyebrow: 'El Cerebro IA de tu negocio de coaching',
            title: 'No es un chat. No son prompts. Es un sistema que te conoce.',
            blocks: [
                { k: '🧠 Aprende tu voz', v: 'Define tu estilo, tono y pilares. Solo una vez.' },
                { k: '💡 Genera ideas', v: 'Específicas para tu nicho y tu cliente ideal.' },
                { k: '✍️ Crea guiones', v: 'Con huecos para tus historias personales reales.' },
            ],
            outro: 'La mayoría de herramientas de IA no te conocen. Writi aprende quién eres y cada guión suena exactamente a ti. No a una IA. A ti.',
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
            eyebrow: 'Un sistema. Un precio. Sin sorpresas.',
            planTitle: 'PLAN PRO',
            planPrice: '24,90 €',
            planFreq: '/mes · sin permanencia',
            planBenefits: [
                'Cerebro IA de tu negocio',
                'Guiones ilimitados en tu voz',
                'Ideas virales para tu nicho',
                'Calendario mensual completo',
                'Asistente Nico personalizado',
                'Multi-proyecto incluido',
            ],
            guaranteeTitle: '✦ Garantía de resultado',
            guarantee: 'Haz tu primera sesión con Writi. Si no tienes tu mes listo — reembolso inmediato.',
            urgencyTitle: '⚡ Acceso inmediato',
            urgency: 'Activa ahora y empieza tu primera sesión hoy. Sin esperas. Sin instalación.',
            cta: 'Activa tu plan PRO — 24,90€/mes →',
        },
        launch: {
            eyebrow: '🚀 Lanzamiento — Plazas limitadas',
            title: 'Sé de los primeros',
            body: 'Este mes ofrezco onboarding personal a los primeros 20 usuarios. Te ayudo a configurar tu Cerebro IA y sacar tu primera sesión completa.',
            cta: 'Activar ahora →',
        },
        faq: {
            eyebrow: 'FAQ',
            title: 'Preguntas que todos hacen',
            items: [
                { q: '¿Cuánto tarda en configurarse?', a: 'En 10 minutos tienes el Cerebro IA listo. En tu primera sesión ya tienes guiones listos para grabar.' },
                { q: '¿Es diferente a ChatGPT?', a: 'Completamente. ChatGPT no te conoce. Writi aprende tu voz, tu nicho y tu estilo. El resultado suena a ti, no a una máquina.' },
                { q: '¿Para qué plataformas genera contenido?', a: 'Instagram Reels, TikTok, YouTube Shorts, LinkedIn y X. Tú eliges el formato y la duración.' },
                { q: '¿Qué pasa si cancelo?', a: 'Cancelas cuando quieras desde tu perfil. Sin llamadas, sin emails, sin preguntas.' },
                { q: '¿Funciona para mi nicho de coaching?', a: 'Sí. El Cerebro IA se adapta a cualquier nicho porque aprende de ti, no de plantillas genéricas.' },
                { q: '¿Necesito saber de marketing o copywriting?', a: 'No. Writi lo hace por ti. Tú solo necesitas saber de lo que eres experto — tu negocio de coaching.' },
            ],
        },
        final: {
            eyebrow: 'Tu agenda no se llena sola.',
            title: 'Pero tu contenido puede llenarla. Empieza hoy con el sistema que convierte lo que sabes en clientes.',
            sub: '',
            cta: 'Activa tu plan PRO — 24,90€/mes →',
            badges: ['✅ Acceso inmediato', '✅ Sin permanencia', '✅ Garantía 30 días'],
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
            title: 'Questions everyone asks',
            items: [
                { q: 'How long does setup take?', a: 'In 10 minutes you have the AI Brain ready. In your first session you already have scripts ready to record.' },
                { q: 'Is it different from ChatGPT?', a: 'Completely. ChatGPT does not know you. Writi learns your voice, your niche and your style. The result sounds like you, not a machine.' },
                { q: 'What platforms does it generate content for?', a: 'Instagram Reels, TikTok, YouTube Shorts, LinkedIn and X. You choose the format and duration.' },
                { q: 'What happens if I cancel?', a: 'Cancel anytime from your profile. No calls, no emails, no questions.' },
                { q: 'Does it work for my coaching niche?', a: 'Yes. The AI Brain adapts to any niche because it learns from you, not from generic templates.' },
                { q: 'Do I need to know marketing or copywriting?', a: 'No. Writi does it for you. You only need to be an expert in what you know — your coaching business.' },
            ],
        },
        final: {
            eyebrow: 'Your calendar does not fill itself.',
            title: 'But your content can fill it. Start today with the system that turns what you know into clients.',
            sub: '',
            cta: 'Activate your PRO plan — €24.90/mo →',
            badges: ['✅ Instant access', '✅ No commitment', '✅ 30-day guarantee'],
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
