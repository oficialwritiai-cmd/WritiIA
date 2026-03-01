import React from 'react';
import Link from 'next/link';

export default function Logo({ size = '1.5rem', mobile = false }) {
    return (
        <Link href="/" style={{ textDecoration: 'none' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer'
                }}
            >
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--accent-gradient, linear-gradient(135deg, #7ECECA 0%, #9D00FF 100%))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'black',
                    fontWeight: 900,
                    fontSize: '1rem'
                }}>
                    W
                </div>
                {!mobile && (
                    <span style={{
                        color: '#7ECECA',
                        fontSize: size,
                        fontWeight: 300,
                        letterSpacing: '0.3em',
                        fontFamily: 'var(--font-outfit), sans-serif',
                        textTransform: 'uppercase'
                    }}>
                        WRITI.AI
                    </span>
                )}
            </div>
        </Link>
    );
}
