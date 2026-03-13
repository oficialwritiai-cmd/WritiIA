'use client';

import { LanguageProvider } from './LanguageContext';
import { ProjectProvider } from './ProjectContext';

export function Providers({ children }) {
    return (
        <LanguageProvider>
            <ProjectProvider>
                {children}
            </ProjectProvider>
        </LanguageProvider>
    );
}
