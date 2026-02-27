import { TrendingUp, Flame, Star, Zap } from 'lucide-react';

const TRENDS = [
    { title: 'Marketing de Afiliados 2024', platform: 'Reels', impact: 'Fuego', color: '#FF4D4D' },
    { title: 'Nuevos Jobs en IA', platform: 'LinkedIn', impact: 'Viral', color: '#9D00FF' },
    { title: 'Storytelling para Solopreneurs', platform: 'X', impact: 'Tendencia', color: '#00F3FF' },
    { title: 'Edición Estilo Hormozi', platform: 'TikTok', impact: 'Explosivo', color: '#7ECECA' },
];

export default function TrendsPage() {
    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '8px' }}>Tendencias Virales</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Insights de alto impacto detectados por nuestra IA en tiempo real.</p>
                </div>
                <div style={{ background: 'rgba(126, 206, 202, 0.1)', padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <TrendingUp color="#7ECECA" />
                    <span style={{ fontWeight: 800, color: '#7ECECA' }}>LIVE: 142 Temas Hot</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                {TRENDS.map((t, i) => (
                    <div key={i} className="premium-card" style={{ padding: '24px', border: `1px solid ${t.color}20` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <span className="badge" style={{ background: `${t.color}10`, color: t.color, border: 'none' }}>{t.platform}</span>
                            <Flame size={16} color={t.color} fill={t.color} />
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', lineHeight: '1.4' }}>{t.title}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.color }}></div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: t.color }}>{t.impact}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="premium-card" style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-dark)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                <div style={{ position: 'relative' }}>
                    <Zap size={64} color="#7ECECA" fill="#7ECECA" style={{ opacity: 0.2 }} />
                    <Star size={24} color="#7ECECA" fill="#7ECECA" style={{ position: 'absolute', top: '20px', right: '-10px' }} />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px' }}>Análisis Profundo en Proceso</h2>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '500px' }}>
                        Estamos analizando +10k publicaciones diarias para darte los ángulos exactos que están funcionando hoy. Vuelve pronto para ver el reporte completo.
                    </p>
                </div>
                <button className="btn-primary" style={{ padding: '12px 32px' }}>Suscribirse a reportes</button>
            </div>
        </div>
    );
}
