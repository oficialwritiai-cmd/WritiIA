import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(req) {
  try {
    const { action, metadata, error_message } = await req.json();
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { get: (n) => cookieStore.get(n)?.value } }
    );
    // SECURITY: get user from session, never trust user_id from body
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    await supabase.from('app_logs').insert({
      user_id: user.id,
      action,
      metadata: metadata || {},
      error_message: error_message || null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false });
  }
}

export async function GET(req) {
  // Admin only: returns last 200 logs
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { get: (n) => cookieStore.get(n)?.value } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ss.companyes@gmail.com';
    const { data: profile } = await supabase
      .from('users_profiles')
      .select('email')
      .eq('id', user?.id)
      .single();
    if (profile?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    const { data } = await supabase
      .from('app_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    return NextResponse.json({ logs: data || [] });
  } catch (e) {
    return NextResponse.json({ logs: [] });
  }
}
