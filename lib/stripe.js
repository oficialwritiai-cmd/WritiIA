import Stripe from "stripe";

// Create a new Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
    console.warn("WARNING: STRIPE_SECRET_KEY is not defined in environment variables.");
}

export const stripe = new Stripe(stripeSecretKey || "", {
    apiVersion: "2023-10-16",
    appInfo: {
        name: "Writiai",
        version: "1.0.0",
    },
});
