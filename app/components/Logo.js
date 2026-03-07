import React from 'react';
import Link from 'next/link';

export default function Logo({ size = '1.4rem', mobile = false, dark = true }) {
    return (
        <Link href="/" style={{ textDecoration: 'none' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    userSelect: 'none'
                }}
            >
                {/* Reference-inspired Stylized W SVG */}
                <svg
                    width={mobile ? "32" : "38"}
                    height={mobile ? "32" : "38"}
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(157, 0, 255, 0.4))' }}
                >
                    <defs>
                        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#9D00FF" />
                            <stop offset="100%" stopColor="#00E0FF" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <path
                        d="M15 25L35 75L50 40L65 75L85 25"
                        stroke="url(#logo-grad)"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M35 75L50 40L65 75"
                        stroke="white"
                        strokeWidth="2"
                        opacity="0.5"
                    />
                </svg>

                {!mobile && (
                    <span style={{
                        color: dark ? 'white' : '#0B0B0F',
                        fontSize: size,
                        fontWeight: 900,
                        letterSpacing: '0.05em',
                        fontFamily: 'var(--font-outfit), "Plus Jakarta Sans", sans-serif',
                        background: 'linear-gradient(to right, #fff, #888)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: dark ? 'transparent' : 'inherit'
                    }}>
                        WRITI<span style={{ color: '#9D00FF' }}>.</span>AI
                    </span>
                )}
            </div>
        </Link>
    );
}
