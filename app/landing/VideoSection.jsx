'use client';
import { useState } from "react";
import Reveal from "./Reveal";

const VIDEO_ID = 'UcaCvukwpW8';
const THUMBNAIL = `https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`;
const EMBED_URL = `https://www.youtube.com/embed/${VIDEO_ID}?rel=0&modestbranding=1&autoplay=1`;

const VideoSection = () => {
    const [playing, setPlaying] = useState(false);

    return (
        <section className="relative w-full py-20 sm:py-28" style={{ background: 'rgba(10,6,30,0.6)' }}>
            <div className="mx-auto max-w-4xl px-5 lg:px-8">
                <Reveal>
                    <div className="text-center mb-10">
                        <h2
                            className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4"
                            style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.03em' }}
                        >
                            Ve{' '}
                            <span className="text-transparent bg-clip-text"
                                style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }}>
                                Writi IA en acción
                            </span>
                        </h2>
                        <p className="text-white/50 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                            Sin complicaciones. Sin curva de aprendizaje. Tú solo grabas y publicas.
                        </p>
                    </div>

                    {/* Video container */}
                    <div
                        style={{
                            position: 'relative',
                            width: '100%',
                            paddingBottom: '56.25%',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '1px solid rgba(124,58,237,0.3)',
                            boxShadow: '0 20px 60px rgba(124,58,237,0.3)',
                            cursor: playing ? 'default' : 'pointer',
                        }}
                        onClick={() => !playing && setPlaying(true)}
                    >
                        {playing ? (
                            <iframe
                                src={EMBED_URL}
                                frameBorder="0"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                title="Tutorial Writi.AI"
                            />
                        ) : (
                            <>
                                {/* Thumbnail */}
                                <img
                                    src={THUMBNAIL}
                                    alt="Tutorial Writi IA"
                                    style={{
                                        position: 'absolute', top: 0, left: 0,
                                        width: '100%', height: '100%',
                                        objectFit: 'cover',
                                    }}
                                />
                                {/* Dark overlay */}
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: 'rgba(0,0,0,0.35)',
                                    transition: 'background 0.2s ease',
                                }} />
                                {/* Play button */}
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <div style={{
                                        width: '72px', height: '72px',
                                        borderRadius: '50%',
                                        background: 'rgba(124,58,237,0.9)',
                                        boxShadow: '0 0 0 8px rgba(124,58,237,0.25), 0 8px 32px rgba(0,0,0,0.5)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'transform 0.2s ease, background 0.2s ease',
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = '#6d28d9'; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(124,58,237,0.9)'; }}
                                    >
                                        {/* Triangle play icon */}
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '4px' }}>
                                            <polygon points="5,3 19,12 5,21" />
                                        </svg>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </Reveal>
            </div>
        </section>
    );
};

export default VideoSection;
