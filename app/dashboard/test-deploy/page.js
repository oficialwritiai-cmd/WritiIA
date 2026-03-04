'use client';

export default function TestDeployPage() {
    return (
        <div style={{ padding: '100px', textAlign: 'center', background: '#000', color: '#fff', minHeight: '100vh' }}>
            <h1 style={{ fontSize: '4rem', color: '#7ECECA' }}>🚀 DEPLOY V1.3.0 LIVE</h1>
            <p style={{ fontSize: '1.5rem', marginTop: '20px' }}>Si ves esto, el despliegue está funcionando correctamente.</p>
            <p style={{ color: '#888', marginTop: '40px' }}>Hora del cambio: {new Date().toLocaleTimeString()}</p>
        </div>
    );
}
