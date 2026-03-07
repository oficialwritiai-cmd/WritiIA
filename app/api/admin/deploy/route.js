/**
 * /api/admin/deploy/route.js
 * 
 * SECURITY: Admin-only endpoint to trigger a Vercel deployment.
 * Auth is verified server-side via session JWT (Authorization header),
 * never via client-supplied userId in the request body.
 */

import { NextResponse } from 'next/server';
import rateLimit from '@/lib/rate-limit';
import { getServerSession, isAdmin } from '@/lib/auth-guard';

// Extremely tight rate limit for admin actions
const limiter = rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 100,
});

export async function POST(request) {
    try {
        // 1. Rate limit by IP
        const ip = (request.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();
        const resObj = new NextResponse();
        try {
            await limiter.check(resObj, 5, ip); // 5 deploy attempts per minute
        } catch {
            return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers: resObj.headers });
        }

        // 2. SECURITY: Verify session from JWT header (NOT from request body)
        const { user, supabase } = await getServerSession(request);
        if (!user) {
            return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
        }

        // 3. Verify admin privileges using the verified user ID
        const adminCheck = await isAdmin(supabase, user.id);
        if (!adminCheck) {
            console.warn(`[SECURITY][Admin] Non-admin user ${user.id} attempted deploy`);
            return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
        }

        const deployHook = process.env.VERCEL_DEPLOY_HOOK;
        if (!deployHook) {
            console.error('[admin/deploy] VERCEL_DEPLOY_HOOK not configured');
            return NextResponse.json({ error: 'Configuración de despliegue no disponible.' }, { status: 500 });
        }

        const res = await fetch(deployHook, { method: 'POST' });

        if (!res.ok) {
            console.error('[admin/deploy] Vercel rejected deployment request');
            return NextResponse.json({ error: 'Error al iniciar el despliegue.' }, { status: 500 });
        }

        console.log(`[admin/deploy] Deployment triggered by admin user: ${user.id}`);
        return NextResponse.json({ success: true, message: 'Despliegue iniciado correctamente en Vercel.' });

    } catch (err) {
        console.error('[admin/deploy] Critical error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
