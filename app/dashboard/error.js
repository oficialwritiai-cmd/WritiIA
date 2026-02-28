'use client';
import { useEffect } from 'react';

export default function DashboardError({ error, reset }) {
    useEffect(() => {
        console.error('DASHBOARD ERROR:', error);
    }, [error]);

    return (
        <div style={{ padding: '2rem', background: '#222', color: 'red', borderRadius: '10px', marginTop: '50px' }}>
            <h2 style={{ fontSize: '2rem' }}>Something went wrong!</h2>
            <p><strong>Error type:</strong> {error.name}</p>
            <p><strong>Message:</strong> {error.message}</p>
            <details style={{ background: '#111', padding: '10px', marginTop: '10px', color: '#fca' }}>
                <summary>Stack trace</summary>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>{error.stack}</pre>
            </details>
            <button onClick={() => reset()} style={{ marginTop: '20px', padding: '10px 20px', background: 'white', color: 'black', fontWeight: 'bold' }}>
                Try again
            </button>
        </div>
    );
}
