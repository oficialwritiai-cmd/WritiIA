import { blogPosts, getPostBySlug } from '@/lib/blog-posts';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/app/components/Logo';

export async function generateStaticParams() {
    return blogPosts.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const post = getPostBySlug(slug);
    if (!post) return {};
    return {
        title: `${post.title} | WRITI.AI Blog`,
        description: post.description,
        keywords: post.keyword,
        alternates: { canonical: `https://www.writi-ai.com/blog/${post.slug}` },
        openGraph: {
            title: post.title,
            description: post.description,
            url: `https://www.writi-ai.com/blog/${post.slug}`,
            type: 'article',
            siteName: 'WRITI.AI',
            images: [{ url: post.image ? `https://www.writi-ai.com${post.image}` : 'https://www.writi-ai.com/og-image.jpg', width: 1200, height: 630 }],
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description: post.description,
            images: [post.image ? `https://www.writi-ai.com${post.image}` : 'https://www.writi-ai.com/og-image.jpg'],
        },
    };
}

export default async function BlogArticlePage({ params }) {
    const { slug } = await params;
    const post = getPostBySlug(slug);
    if (!post) notFound();


    const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.description,
        author: { '@type': 'Organization', name: 'WRITI.AI' },
        datePublished: post.date,
        dateModified: post.date,
        publisher: {
            '@type': 'Organization',
            name: 'WRITI.AI',
            url: 'https://www.writi-ai.com',
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': `https://www.writi-ai.com/blog/${post.slug}` },
        image: post.image ? `https://www.writi-ai.com${post.image}` : undefined,
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0a0a0f 0%, #050508 100%)',
            color: '#fff',
            fontFamily: "'Inter', 'Outfit', sans-serif",
        }}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

            {/* NAV */}
            <nav style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '16px 32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <Link href="/" style={{ textDecoration: 'none' }}>
                    <Logo size="1rem" />
                </Link>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <Link href="/blog" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', textDecoration: 'none' }}>← Blog</Link>
                    <Link href="/login?mode=register" style={{
                        background: 'linear-gradient(135deg, #9D00FF, #6100FF)',
                        color: '#fff', padding: '8px 18px', borderRadius: 8,
                        fontSize: '0.83rem', fontWeight: 700, textDecoration: 'none',
                    }}>Empieza con WRITI</Link>
                </div>
            </nav>

            {/* ARTICLE */}
            <article style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 100px' }}>
                {/* Hero Image */}
                {post.image && (
                    <div style={{
                        width: '100%',
                        aspectRatio: '16/9',
                        borderRadius: 20,
                        overflow: 'hidden',
                        marginBottom: 40,
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    }}>
                        <img 
                            src={post.image} 
                            alt={post.title} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                )}
                {/* Meta */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
                    <span style={{
                        background: 'rgba(157,0,255,0.15)', color: '#c084fc',
                        borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700,
                    }}>Contenido con IA</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>{post.date}</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>·</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>{post.readTime} de lectura</span>
                </div>

                {/* H1 */}
                <h1 style={{
                    fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)',
                    fontWeight: 900,
                    fontFamily: "'Outfit', sans-serif",
                    lineHeight: 1.18,
                    letterSpacing: '-0.03em',
                    marginBottom: 28,
                }}>{post.title}</h1>

                {/* Excerpt */}
                <p style={{
                    fontSize: '1.15rem',
                    color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.7,
                    borderLeft: '3px solid #9D00FF',
                    paddingLeft: 20,
                    marginBottom: 48,
                    fontStyle: 'italic',
                }}>{post.excerpt}</p>

                {/* Divider */}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 48 }} />

                {/* Content */}
                <div
                    style={{
                        lineHeight: 1.8,
                        fontSize: '1.02rem',
                        color: 'rgba(255,255,255,0.82)',
                    }}
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />

                {/* Divider */}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '56px 0 40px' }} />

                {/* Related articles */}
                <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Más artículos
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {blogPosts
                            .filter(p => p.slug !== post.slug)
                            .slice(0, 3)
                            .map(related => (
                                <Link key={related.slug} href={`/blog/${related.slug}`} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    borderRadius: 10, padding: '14px 18px',
                                    textDecoration: 'none', color: '#fff',
                                    fontSize: '0.9rem', fontWeight: 600,
                                    transition: 'all 0.2s',
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(157,0,255,0.3)'; e.currentTarget.style.background = 'rgba(157,0,255,0.05)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                >
                                    <span>{related.title}</span>
                                    <span style={{ color: '#9D00FF', flexShrink: 0, marginLeft: 12 }}>→</span>
                                </Link>
                            ))}
                    </div>
                </div>
            </article>

            {/* GLOBAL ARTICLE STYLES */}
            <style>{`
                article h2 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    font-family: 'Outfit', sans-serif;
                    letter-spacing: -0.025em;
                    margin: 2.5rem 0 1rem;
                    color: #fff;
                    line-height: 1.3;
                }
                article h3 {
                    font-size: 1.15rem;
                    font-weight: 700;
                    margin: 1.8rem 0 0.7rem;
                    color: rgba(255,255,255,0.9);
                }
                article p {
                    margin-bottom: 1.2rem;
                }
                article ul, article ol {
                    padding-left: 1.5rem;
                    margin-bottom: 1.4rem;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                article li {
                    line-height: 1.7;
                    color: rgba(255,255,255,0.75);
                }
                article strong {
                    color: #fff;
                    font-weight: 700;
                }
                article a {
                    color: #c084fc;
                    text-decoration: underline;
                }
            `}</style>
        </div>
    );
}
