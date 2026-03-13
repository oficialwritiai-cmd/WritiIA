'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import es from '@/messages/es.json';
import en from '@/messages/en.json';

const LanguageContext = createContext(null);

const messages = { es, en };

export function useLanguage() {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
    return ctx;
}

export function LanguageProvider({ children }) {
    const [locale, setLocaleState] = useState('es');

    useEffect(() => {
        const savedLocale = localStorage.getItem('writi_locale');
        if (savedLocale && messages[savedLocale]) {
            setLocaleState(savedLocale);
        }
    }, []);

    const setLocale = useCallback((newLocale) => {
        if (messages[newLocale]) {
            setLocaleState(newLocale);
            localStorage.setItem('writi_locale', newLocale);
        }
    }, []);

    const t = useCallback((key, replacements = {}) => {
        const keys = key.split('.');
        let value = messages[locale];
        
        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                return key; // Fallback to key if not found
            }
        }

        if (typeof value !== 'string') return key;

        // Handle replacements: {{name}}
        let result = value;
        Object.entries(replacements).forEach(([k, v]) => {
            result = result.replace(new RegExp(`{{${k}}}`, 'g'), v);
        });

        return result;
    }, [locale]);

    return (
        <LanguageContext.Provider value={{
            locale,
            setLocale,
            t
        }}>
            {children}
        </LanguageContext.Provider>
    );
}
