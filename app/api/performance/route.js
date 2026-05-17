import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const supabaseClient = (req) => {
    const cookieStore = cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { cookies: { get: (n) => cookieStore.get(n)?.value } }
    );
};

// POST — guardar feedback o métricas
export async function POST(req) {
    try {
        const body = await req.json();
        const { scriptId, rating, views, likes_count, comments_count, shares_count, published_at, notes, platform, hookStyle, tone } = body;
        const supabase = supabaseClient(req);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // Upsert script_performance
        const { data: existing } = await supabase.from('script_performance').select('id').eq('script_id', scriptId).eq('user_id', user.id).single();
        const perfData = { user_id: user.id, script_id: scriptId, updated_at: new Date().toISOString(), ...(rating !== undefined && { rating }), ...(views !== undefined && { views }), ...(likes_count !== undefined && { likes_count }), ...(comments_count !== undefined && { comments_count }), ...(shares_count !== undefined && { shares_count }), ...(published_at && { published_at }), ...(notes && { notes }), ...(platform && { platform }), ...(hookStyle && { hook_style: hookStyle }), ...(tone && { tone }) };

        if (existing) {
            await supabase.from('script_performance').update(perfData).eq('id', existing.id);
        } else {
            await supabase.from('script_performance').insert(perfData);
        }

        // Recalcular señales de aprendizaje
        await analyzeAndUpdateCerebro(supabase, user.id);

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error('[performance]', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// GET — obtener feedback de un script
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const scriptId = searchParams.get('scriptId');
        const supabase = supabaseClient(req);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        if (scriptId) {
            const { data } = await supabase.from('script_performance').select('*').eq('script_id', scriptId).eq('user_id', user.id).single();
            return NextResponse.json({ performance: data || null });
        }

        // Get all performances + learning signals
        const [{ data: perfs }, { data: signals }] = await Promise.all([
            supabase.from('script_performance').select('*').eq('user_id', user.id),
            supabase.from('cerebro_learning_signals').select('*').eq('user_id', user.id).order('performance_score', { ascending: false }),
        ]);
        return NextResponse.json({ performances: perfs || [], signals: signals || [] });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

async function analyzeAndUpdateCerebro(supabase, userId) {
    try {
        const { data: perfs } = await supabase.from('script_performance').select('*').eq('user_id', userId);
        if (!perfs || perfs.length === 0) return;

        const scores = {};
        const counts = {};

        for (const p of perfs) {
            let score = 0;
            if (p.rating === 'like') score += 2;
            if (p.rating === 'dislike') score -= 2;
            if (p.views > 50000) score += 5;
            else if (p.views > 10000) score += 3;
            if (p.views > 0 && p.likes_count / p.views > 0.05) score += 2;
            if (p.views > 0 && p.comments_count / p.views > 0.01) score += 2;

            if (p.hook_style) {
                const key = `hook_style:${p.hook_style}`;
                scores[key] = (scores[key] || 0) + score;
                counts[key] = (counts[key] || 0) + 1;
            }
            if (p.tone) {
                const key = `tone:${p.tone}`;
                scores[key] = (scores[key] || 0) + score;
                counts[key] = (counts[key] || 0) + 1;
            }
        }

        for (const [key, totalScore] of Object.entries(scores)) {
            const [signalType, signalValue] = key.split(':');
            const performanceScore = totalScore / counts[key];
            await supabase.from('cerebro_learning_signals').upsert({
                user_id: userId, signal_type: signalType, signal_value: signalValue,
                performance_score: performanceScore, sample_count: counts[key],
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,signal_type,signal_value' });
        }
    } catch (e) {
        console.error('[analyzeAndUpdateCerebro]', e.message);
    }
}
