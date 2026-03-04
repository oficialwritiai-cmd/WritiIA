import Stripe from "stripe";

// Create a new Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_for_build";

let stripeInstance;

export const getStripe = () => {
    if (!stripeInstance) {
        stripeInstance = new Stripe(stripeSecretKey, {
            apiVersion: "2023-10-16",
            appInfo: {
                name: "Writiai",
                version: "1.0.0",
            },
        });
    }
    return stripeInstance;
};

// For backward compatibility if needed, but we'll update usage
export const stripe = getStripe();
