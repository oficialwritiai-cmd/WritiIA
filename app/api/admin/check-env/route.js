import { NextResponse } from 'next/server';

export async function GET() {
    const key = process.env.ANTHROPIC_API_KEY || '';
    const cleanKey = key.replace(/['"\s]/g, '').trim();

    console.log(`[DEBUG_ENV] Key Prefix (20 chars): ${cleanKey.substring(0, 20)}`);
    console.log(`[DEBUG_ENV] Total Length: ${cleanKey.length}`);

    return NextResponse.json({
        exists: !!key,
        length: cleanKey.length,
        prefix: cleanKey.substring(0, 25),
        suffix: cleanKey.substring(cleanKey.length - 5),
        isNew: cleanKey.includes('cwW2r6WN'),
        now: new Date().toISOString()
    });
}
