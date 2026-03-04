import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreditsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard?open_credits=true');
    }, [router]);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="loading-spinner"></div>
        </div>
    );
}
