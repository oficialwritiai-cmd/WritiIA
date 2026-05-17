import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export default async function SharePage({ params }) {
    const { token } = params;
    let item = null;
    try {
        const id = Buffer.from(token, 'base64url').toString();
        const cookieStore = cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { cookies: { get: (n) => cookieStore.get(n)?.value } }
        );
        const { data } = await supabase.from('library').select('titulo, platform, content, script_full_text').eq('id', id).single();
        item = data;
    } catch(e) {}

    if (!item) return (
        <div style={{ minHeight:'100vh', background:'#0c0c0e', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:'Inter,sans-serif' }}>
            <p>Este guion no existe o fue eliminado.</p>
        </div>
    );

    const c = item.content || {};
    const hook = c.hook || c.gancho || '';
    const desarrollo = Array.isArray(c.desarrollo) ? c.desarrollo : [];
    const cta = c.cta || c.cierre || '';

    return (
        <div style={{ minHeight:'100vh', background:'#0c0c0e', color:'#fff', fontFamily:'Inter,sans-serif', padding:'48px 24px' }}>
            <div style={{ maxWidth:'700px', margin:'0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom:'32px', textAlign:'center' }}>
                    <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#a78bfa', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'12px' }}>
                        Guion generado con WRITI.AI
                    </div>
                    <h1 style={{ fontSize:'2rem', fontWeight:900, lineHeight:1.2, letterSpacing:'-0.03em', marginBottom:'8px' }}>
                        {item.titulo}
                    </h1>
                    {item.platform && <span style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)', background:'rgba(255,255,255,0.06)', padding:'3px 12px', borderRadius:'20px' }}>{item.platform}</span>}
                </div>

                {/* Hook */}
                {hook && (
                    <div style={{ marginBottom:'20px', padding:'20px 24px', background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)', borderLeft:'4px solid #a78bfa', borderRadius:'0 14px 14px 0' }}>
                        <div style={{ fontSize:'0.62rem', fontWeight:800, color:'#a78bfa', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'10px' }}>Hook</div>
                        <p style={{ fontSize:'1.1rem', fontWeight:600, lineHeight:1.6, margin:0 }}>{hook}</p>
                    </div>
                )}

                {/* Desarrollo */}
                {desarrollo.length > 0 && (
                    <div style={{ marginBottom:'20px', padding:'20px 24px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'14px' }}>
                        <div style={{ fontSize:'0.62rem', fontWeight:800, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px' }}>Desarrollo</div>
                        {desarrollo.map((p,i) => (
                            <p key={i} style={{ fontSize:'0.95rem', lineHeight:1.7, color:'rgba(255,255,255,0.8)', marginBottom:'10px' }}>
                                <span style={{ color:'#7c3aed', fontWeight:700, marginRight:'8px' }}>{i+1}.</span>{p}
                            </p>
                        ))}
                    </div>
                )}

                {/* Full text fallback if no structured content */}
                {!hook && desarrollo.length === 0 && item.script_full_text && (
                    <div style={{ marginBottom:'20px', padding:'20px 24px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'14px' }}>
                        <pre style={{ fontSize:'0.93rem', lineHeight:1.75, color:'rgba(255,255,255,0.8)', whiteSpace:'pre-wrap', fontFamily:'inherit', margin:0 }}>
                            {item.script_full_text}
                        </pre>
                    </div>
                )}

                {/* CTA */}
                {cta && (
                    <div style={{ marginBottom:'32px', padding:'16px 24px', background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.2)', borderLeft:'4px solid #34d399', borderRadius:'0 14px 14px 0' }}>
                        <div style={{ fontSize:'0.62rem', fontWeight:800, color:'#34d399', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'8px' }}>CTA</div>
                        <p style={{ fontSize:'0.95rem', fontWeight:600, color:'#34d399', margin:0 }}>{cta}</p>
                    </div>
                )}

                {/* CTA viral */}
                <div style={{ textAlign:'center', padding:'32px', background:'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(109,40,217,0.08))', border:'1px solid rgba(124,58,237,0.25)', borderRadius:'20px' }}>
                    <p style={{ fontSize:'1.1rem', fontWeight:700, marginBottom:'8px' }}>Quieres guiones asi para tu marca?</p>
                    <p style={{ fontSize:'0.88rem', color:'rgba(255,255,255,0.5)', marginBottom:'24px' }}>WRITI.AI genera guiones virales personalizados en segundos.</p>
                    <a href="/" style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'#7c3aed', color:'#fff', padding:'14px 28px', borderRadius:'12px', fontWeight:700, fontSize:'0.95rem', textDecoration:'none' }}>
                        Crea guiones como este &rarr;
                    </a>
                </div>
            </div>
        </div>
    );
}
