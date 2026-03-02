import { NextResponse } from 'next/server';

export async function GET() {
    const key = process.env.ANTHROPIC_API_KEY || '';
    return NextResponse.json({
        exists: !!key,
        length: key.length,
        prefix: key.substring(0, 10),
        suffix: key.substring(key.length - 4),
    });
}
