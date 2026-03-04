import Stripe from "stripe";

// Create a new Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Use a placeholder if the key is missing to prevent build-time crashes
// Vercel build will only succeed if the key is provided in the dashboard
export const stripe = new Stripe(stripeSecretKey || "sk_test_placeholder", {
    apiVersion: "2023-10-16",
    appInfo: {
        name: "Writiai",
        version: "1.0.0",
    },
});
