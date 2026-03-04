import { stripe } from './lib/stripe';

async function listProducts() {
    try {
        const prices = await stripe.prices.list({
            active: true,
            expand: ['data.product'],
        });

        console.log('--- STRIPE PRODUCTS AND PRICES ---');
        prices.data.forEach(price => {
            console.log(`Product: ${price.product.name}`);
            console.log(`Price ID: ${price.id}`);
            console.log(`Amount: ${price.unit_amount / 100} ${price.currency.toUpperCase()}`);
            console.log('--------------------------------');
        });
    } catch (error) {
        console.error('Error listing products:', error);
    }
}

listProducts();
