'use client';
import Reveal from "./Reveal";

const VIDEO_URL = 'https://www.youtube.com/embed/C6MJRgDxbIY?rel=0&modestbranding=1';

const VideoSection = () => {
    return (
        <section className="relative w-full py-20 sm:py-28" style={{ background: 'rgba(10,6,30,0.6)' }}>
            <div className="mx-auto max-w-4xl px-5 lg:px-8">
                <Reveal>
                    <div className="text-center mb-10">
                        <h2
                            className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4"
                            style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.03em' }}
                        >
                            Mira cómo funciona en{' '}
                            <span className="text-transparent bg-clip-text"
                                style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }}>
                                90 segundos
                            </span>
                        </h2>
                        <p className="text-white/50 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                            Sin complicaciones. Sin curva de aprendizaje. Tú solo grabas y publicas.
                        </p>
                    </div>

                    <div
                        style={{
                            position: 'relative',
                            width: '100%',
                            paddingBottom: '56.25%',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '1px solid rgba(124,58,237,0.3)',
                            boxShadow: '0 20px 60px rgba(124,58,237,0.3)',
                        }}
                    >
                        <iframe
                            src={VIDEO_URL}
                            frameBorder="0"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                            }}
                            title="Demo Writi.AI — 90 segundos"
                        />
                    </div>
                </Reveal>
            </div>
        </section>
    );
};

export default VideoSection;
