import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-guard';

/**
 * POST /api/brain-from-voice
 * Body: FormData with:
 *   - audio: Blob (webm/mp4 audio)
 *   - projectId?: string
 *
 * Returns:
 *   { transcript: string, brain: { bio, audience, style, pillars: string[], faqs: string[] } }
 *
 * TODO: Integrate a real STT service (Whisper via OpenAI, or Deepgram) and
 *       then pass the transcript through Claude to extract the brain fields.
 */
export async function POST(req) {
    try {
        // ── Auth ──────────────────────────────────────────────────────────
        const { user, error: authErr } = await getServerSession(req);
        if (authErr || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // ── Parse formData ────────────────────────────────────────────────
        const formData  = await req.formData();
        const audioBlob = formData.get('audio');
        const projectId = formData.get('projectId') || null;

        if (!audioBlob) {
            return NextResponse.json({ error: 'No se recibió audio.' }, { status: 400 });
        }

        // ── TODO: Step 1 — Transcribir con Whisper / Deepgram ────────────
        // const arrayBuffer = await audioBlob.arrayBuffer();
        // const buffer = Buffer.from(arrayBuffer);
        // const transcript = await transcribeWithWhisper(buffer, audioBlob.type);
        const transcript = '[TODO: transcripción del audio]'; // placeholder

        // ── TODO: Step 2 — Extraer campos con Claude ─────────────────────
        // const { Anthropic } = await import('@anthropic-ai/sdk');
        // const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        // const msg = await client.messages.create({
        //     model: 'claude-haiku-4-5-20251001',
        //     max_tokens: 800,
        //     messages: [{
        //         role: 'user',
        //         content: `A partir de esta transcripción, extrae en JSON:
        //         { bio, audience, style, pillars: string[], faqs: string[] }
        //         Transcripción: ${transcript}`
        //     }]
        // });
        // const brain = JSON.parse(msg.content[0].text);

        // Placeholder response mientras se implementa
        const brain = {
            bio:      '',
            audience: '',
            style:    '',
            pillars:  [],
            faqs:     [],
        };

        return NextResponse.json({ transcript, brain });
    } catch (err) {
        console.error('[brain-from-voice]', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}
