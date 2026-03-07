import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import rateLimit from '@/lib/rate-limit';
import { WaitlistSchema } from '@/lib/validations';

// Tight limit: 5 waitlist submissions per 10 minutes per IP prevents spam insertion
const limiter = rateLimit({
    interval: 10 * 60 * 1000, // 10 minutes
    uniqueTokenPerInterval: 500,
});

export async function POST(request) {
    try {
        // 1. Rate limiting
        const ip = (request.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();
        const resObj = new NextResponse();
        try {
            await limiter.check(resObj, 5, ip);
        } catch {
            return NextResponse.json(
                { error: 'Demasiadas solicitudes. Intenta más tarde.' },
                { status: 429, headers: resObj.headers }
            );
        }

        // 2. Validate email using Zod (was just includes('@') — easily bypassable)
        const body = await request.json();
        const validation = WaitlistSchema.safeParse(body);
        if (!validation.success) {
            // SECURITY: Return same 200 response to prevent email enumeration
            return NextResponse.json({ success: true });
        }

        const { email } = validation.data;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY // Use service key, not anon
        );

        await supabase.from('waitlist').insert({
            email: email.toLowerCase(),
            source: 'landing_page',
        });

        // SECURITY: Always return success regardless of DB result to prevent enumeration
        return NextResponse.json({ success: true });

    } catch {
        // SECURITY: Return success even on error to prevent enumeration
        return NextResponse.json({ success: true });
    }
}
