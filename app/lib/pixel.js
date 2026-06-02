export function trackPixelEvent(eventName, data = {}) {
    if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', eventName, data);
    }
}

export function trackInitiateCheckout() {
    trackPixelEvent('InitiateCheckout');
}

export function trackPurchase(value = 24.90, currency = 'EUR') {
    trackPixelEvent('Purchase', {
        value,
        currency,
    });
}
