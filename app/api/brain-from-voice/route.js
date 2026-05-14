import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { improveBlockWithHaiku } from '@/lib/anthropic';

export async function POST(req) {
    try {
        // ── Auth via cookies (FormData requests don't send Bearer) ────────
        const cookieStore = cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { cookies: { get: (name) => cookieStore.get(name)?.value } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // ── Parse formData ────────────────────────────────────────────────
        const formData  = await req.formData();
        const audioBlob = formData.get('audio');
        const transcript = formData.get('transcript') || ''; // client may send pre-transcribed text
        const fieldHint  = formData.get('fieldHint') || '';  // e.g. 'bio', 'audience', 'style', 'pillars', 'faqs'

        if (!audioBlob && !transcript) {
            return NextResponse.json({ error: 'No se recibió audio ni transcripción.' }, { status: 400 });
        }

        // ── TODO: Transcribir audio con Whisper/Deepgram ──────────────────
        // If audioBlob provided and no transcript yet:
        // const arrayBuffer = await audioBlob.arrayBuffer();
        // const finalTranscript = await transcribeWithWhisper(Buffer.from(arrayBuffer));
        const finalTranscript = transcript || 'Transcripción pendiente de implementación STT.';

        // ── Extraer campos con Claude (Haiku) ─────────────────────────────
        const fieldInstructions = fieldHint
            ? `El usuario estaba hablando sobre: "${fieldHint}". Extrae principalmente ese campo.`
            : 'Extrae todos los campos que puedas.';

        const userMessage = `Eres un asistente de WRITI.AI. Analiza esta transcripción de voz de un creador de contenido y extrae información para su Cerebro IA.

${fieldInstructions}

Transcripción: "${finalTranscript}"

Extrae en JSON (deja vacío "" o [] si no hay información suficiente):
{
  "bio": "Quién es, qué hace, resultados o experiencia (máx 3 frases)",
  "audience": "Cliente ideal, problemas y deseos (máx 2 frases)",
  "style": "Tono y palabras clave (máx 1 frase, 3-5 palabras)",
  "pillars": ["pilar1", "pilar2", "pilar3"],
  "faqs": ["pregunta1", "pregunta2", "pregunta3"]
}

Responde SOLO con el JSON, sin texto extra.`;

        let brain = { bio: '', audience: '', style: '', pillars: [], faqs: [] };

        if (finalTranscript && !finalTranscript.includes('pendiente de implementación')) {
            try {
                const raw = await improveBlockWithHaiku({
                    apiKey: process.env.ANTHROPIC_API_KEY,
                    systemPrompt: 'Respondes siempre SOLO con JSON válido.',
                    userMessage,
                });
                const jsonStr = raw.startsWith('{') ? raw : raw.match(/\{[\s\S]*\}/)?.[0];
                if (jsonStr) brain = { ...brain, ...JSON.parse(jsonStr) };
            } catch (e) {
                console.error('[brain-from-voice] Claude extraction error:', e);
            }
        }

        return NextResponse.json({ transcript: finalTranscript, brain });
    } catch (err) {
        console.error('[brain-from-voice]', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}
