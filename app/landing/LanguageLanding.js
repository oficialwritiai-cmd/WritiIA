'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const translations = {
    es: {
        nav: {
            system: 'El Sistema',
            forWho: 'Para quién',
            pricing: 'Precios',
            testimonials: 'Testimonios',
            cta: 'Empezar Sesión',
        },
        hero: {
            pill: 'Sistema de Sesión · 60 minutos',
            h1Pre: 'Coaches y consultores:',
            h1Italic: 'tu mes de contenido',
            h1Post: 'planificado en 60 minutos',
            sub: 'En una sola sesión WRITI te ayuda a sacar ideas claras, guiones en tu voz y un mini calendario listo para grabar, sin pelearte con ChatGPT, Notion ni hojas de cálculo.',
            ctaPrimary: 'Empezar mi primera Sesión WRITI',
            ctaSecondary: 'Ver cómo funciona',
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
            eyebrow: 'Stack de valor',
            title: 'Lo que incluye tu acceso a WRITI',
            items: [
                { k: 'Cerebro IA de tu marca (bio, pilares, FAQs)', v: '197 €' },
                { k: 'Sesión de Planificación Mensual (Sistema 4 pasos)', v: '97 €' },
                { k: 'Guiones con huecos para tu voz', v: '147 €' },
                { k: 'Mini calendario accionable 2–4 semanas', v: '47 €' },
                { k: 'Soporte directo 30 días en tu arranque', v: '97 €' },
            ],
            total: 'Valor total',
            totalValue: '585 €/mes',
            today: 'Tu inversión hoy',
            todayValue: '24,90 €/mes',
            planTitle: 'PLAN PRO · Lanzamiento',
            planPrice: '24,90 €',
            planFreq: '/mes · sin permanencia',
            planBenefits: [
                'Ideas estratégicas ilimitadas en tu Cerebro IA',
                'Guiones listos con huecos para tus historias',
                'Mini calendario IA arrastrable 2–4 semanas',
                'Cerebro IA por marca (multi-proyecto incluido)',
                'Asistente de chat para refinar y reescribir',
                'Cancela cuando quieras, sin preguntas',
            ],
            guaranteeTitle: 'Garantía 30 días, sin preguntas',
            guarantee: 'Si después de tu primera Sesión WRITI no tienes al menos 8 ideas, 4 guiones y un calendario para las próximas 2 semanas, te devuelvo el mes completo. Sin preguntas.',
            urgencyTitle: 'Onboarding manual incluido este mes',
            urgency: 'Solo ahora: este mes hago el onboarding manual contigo. En tu primera semana te ayudo a configurar tu Cerebro IA y a sacar tu primera sesión completa. Cuando escale, este acompañamiento desaparecerá.',
            cta: 'Activar mi PLAN PRO',
        },
        testimonials: {
            eyebrow: 'Testimonios',
            title: 'Coaches y creadores que ya tienen su mes resuelto',
            items: [
                { name: 'Marcos A.', role: 'Coach de marketing', text: 'Pasé de 6 horas de planificación los domingos a una sesión de 50 minutos. Los guiones suenan a mí, no a IA. Mi engagement subió un 38% en 3 semanas.' },
                { name: 'Lucía R.', role: 'Consultora financiera', text: 'Lo que más valoro son los huecos humanos. Por fin tengo un esqueleto profesional y meto mis casos reales sin reescribir todo desde cero.' },
                { name: 'Diego P.', role: 'Creador educativo', text: 'El Cerebro IA es el cambio. WRITI no me da contenido genérico: me da contenido mío. Publico 4 veces por semana y dejé de procrastinar.' },
            ],
        },
        final: {
            eyebrow: 'Empieza hoy',
            title: 'Ten tu mes de contenido resuelto hoy',
            sub: 'Activa WRITI y deja que la IA piense tus ideas, guiones y calendario. Tú solo grabas y publicas.',
            cta: 'Crear mi mes con IA',
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
            testimonials: 'Testimonials',
            cta: 'Start Session',
        },
        hero: {
            pill: 'Session System · 60 minutes',
            h1Pre: 'Coaches & consultants:',
            h1Italic: 'your month of content',
            h1Post: 'planned in 60 minutes',
            sub: 'In a single session WRITI helps you generate clear ideas, scripts in your voice and a mini calendar ready to record — without fighting ChatGPT, Notion or spreadsheets.',
            ctaPrimary: 'Start my first WRITI Session',
            ctaSecondary: 'See how it works',
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
            eyebrow: 'Value stack',
            title: 'What your access to WRITI includes',
            items: [
                { k: 'AI Brain of your brand (bio, pillars, FAQs)', v: '€197' },
                { k: 'Monthly Planning Session (4-step System)', v: '€97' },
                { k: 'Scripts with gaps for your voice', v: '€147' },
                { k: '2–4 week actionable mini calendar', v: '€47' },
                { k: 'Direct support for your first 30 days', v: '€97' },
            ],
            total: 'Total value',
            totalValue: '€585/mo',
            today: 'Your investment today',
            todayValue: '€24.90/mo',
            planTitle: 'PRO PLAN · Launch',
            planPrice: '€24.90',
            planFreq: '/mo · no commitment',
            planBenefits: [
                'Unlimited strategic ideas in your AI Brain',
                'Ready-made scripts with gaps for your stories',
                'Drag-and-drop 2–4 week mini calendar',
                'AI Brain per brand (multi-project included)',
                'Chat assistant to refine and rewrite',
                'Cancel anytime, no questions asked',
            ],
            guaranteeTitle: '30-day guarantee, no questions asked',
            guarantee: "If after your first WRITI Session you don't have at least 8 ideas, 4 scripts and a calendar for the next 2 weeks, I'll refund the full month. No questions.",
            urgencyTitle: 'Manual onboarding included this month',
            urgency: "Only now: this month I do manual onboarding with you. In your first week I help you set up your AI Brain and ship your first complete session. When we scale, this disappears.",
            cta: 'Activate my PRO PLAN',
        },
        testimonials: {
            eyebrow: 'Testimonials',
            title: 'Coaches and creators who already have their month sorted',
            items: [
                { name: 'Marcos A.', role: 'Marketing coach', text: 'Went from 6 hours of Sunday planning to a 50-minute session. The scripts sound like me, not like AI. Engagement up 38% in 3 weeks.' },
                { name: 'Lucía R.', role: 'Financial consultant', text: 'What I value most are the human gaps. I finally have a professional skeleton and I add my real cases without rewriting everything.' },
                { name: 'Diego P.', role: 'Educational creator', text: "The AI Brain is the game changer. WRITI doesn't give me generic content — it gives me my content. I publish 4 times a week and stopped procrastinating." },
            ],
        },
        final: {
            eyebrow: 'Start today',
            title: 'Get your month of content sorted today',
            sub: 'Activate WRITI and let AI think your ideas, scripts and calendar. You just record and publish.',
            cta: 'Build my month with AI',
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
