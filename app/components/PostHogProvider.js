'use client';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export default function PostHogProvider({ children }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (typeof window !== 'undefined' && key) {
      posthog.init(key, {
        api_host: 'https://us.i.posthog.com',
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: false,
        persistence: 'localStorage',
      });
    }
  }, []);

  if (typeof window === 'undefined') return <>{children}</>;
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
