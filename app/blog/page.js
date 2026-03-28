'use client';

import Link from 'next/link';
import { blogPosts } from '@/lib/blog-posts';
import Logo from '@/app/components/Logo';

export default function BlogPage() {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0a0a0f 0%, #050508 100%)',
            color: '#fff',
            fontFamily: "'Inter', 'Outfit', sans-serif",
        }}>
            {/* NAV */}
            <nav style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '16px 32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                maxWidth: 1200,
                margin: '0 auto',
            }}>
                <Link href="/" style={{ textDecoration: 'none' }}>
                    <Logo size="1rem" />
                </Link>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <Link href="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', textDecoration: 'none' }}>← Inicio</Link>
                    <Link href="/login?mode=register" style={{
                        background: 'linear-gradient(135deg, #9D00FF, #6100FF)',
                        color: '#fff', padding: '8px 20px', borderRadius: 8,
                        fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none',
                    }}>Prueba gratis</Link>
                </div>
            </nav>

            {/* HEADER */}
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '72px 24px 48px', textAlign: 'center' }}>
                <span style={{
                    display: 'inline-block',
                    background: 'rgba(157,0,255,0.12)',
                    border: '1px solid rgba(157,0,255,0.3)',
                    color: '#c084fc',
                    borderRadius: 20,
                    padding: '6px 16px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    marginBottom: 20,
                }}>Blog · Contenido con IA</span>
                <h1 style={{
                    fontSize: 'clamp(2rem, 5vw, 3.2rem)',
                    fontWeight: 900,
                    fontFamily: "'Outfit', sans-serif",
                    lineHeight: 1.15,
                    letterSpacing: '-0.03em',
                    marginBottom: 20,
                }}>Aprende a crear contenido con IA</h1>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', lineHeight: 1.7, maxWidth: 620, margin: '0 auto' }}>
                    Guías prácticas para creadores de contenido que quieren publicar más, trabajar menos y hacer crecer su audiencia con inteligencia artificial.
                </p>
            </div>

            {/* ARTICLES GRID */}
            <div style={{
                maxWidth: 1100,
                margin: '0 auto',
                padding: '0 24px 100px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 28,
            }}>
                {blogPosts.map((post, i) => (
                    <Link
                        key={post.slug}
                        href={`/blog/${post.slug}`}
                        style={{ textDecoration: 'none' }}
                    >
                        <article style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: 16,
                            padding: 28,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14,
                            transition: 'all 0.25s ease',
                            cursor: 'pointer',
                        }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(157,0,255,0.06)';
                                e.currentTarget.style.borderColor = 'rgba(157,0,255,0.25)';
                                e.currentTarget.style.transform = 'translateY(-3px)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <span style={{
                                    background: 'rgba(157,0,255,0.15)',
                                    color: '#c084fc',
                                    borderRadius: 6,
                                    padding: '3px 10px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                }}>SEO</span>
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>{post.date}</span>
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>· {post.readTime}</span>
                            </div>

                            <h2 style={{
                                fontSize: '1.05rem',
                                fontWeight: 700,
                                color: '#fff',
                                lineHeight: 1.45,
                                letterSpacing: '-0.01em',
                                margin: 0,
                            }}>{post.title}</h2>

                            <p style={{
                                color: 'rgba(255,255,255,0.55)',
                                fontSize: '0.88rem',
                                lineHeight: 1.65,
                                flexGrow: 1,
                                margin: 0,
                            }}>{post.excerpt}</p>

                            <span style={{ color: '#9D00FF', fontSize: '0.85rem', fontWeight: 700 }}>
                                Leer artículo →
                            </span>
                        </article>
                    </Link>
                ))}
            </div>

            {/* CTA FOOTER */}
            <div style={{
                background: 'rgba(157,0,255,0.06)',
                borderTop: '1px solid rgba(157,0,255,0.15)',
                padding: '56px 24px',
                textAlign: 'center',
            }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 12 }}>
                    ¿Listo para aplicar todo esto con IA?
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 28 }}>
                    WRITI.AI genera tus ideas, guiones y calendario en una tarde.
                </p>
                <Link href="/login?mode=register" style={{
                    display: 'inline-block',
                    background: 'linear-gradient(135deg, #9D00FF, #6100FF)',
                    color: '#fff',
                    padding: '16px 36px',
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: '1rem',
                    textDecoration: 'none',
                    letterSpacing: '-0.01em',
                }}>
                    ⚡ Prueba WRITI.AI gratis 7 días →
                </Link>
            </div>
        </div>
    );
}
