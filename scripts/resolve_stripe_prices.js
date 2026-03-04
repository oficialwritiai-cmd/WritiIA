const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const envPath = path.join(__dirname, '../.env.local');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const match = envFile.match(/STRIPE_SECRET_KEY=([^\s]+)/);

        if (!match || !match[1]) throw new Error('Secret key not found');

        const stripe = new Stripe(match[1]);
        const products = {
            '500': 'prod_U5X53LOdSC6k9B',
            '250': 'prod_U5X4JuborfAJNW',
            '100': 'prod_U5X3aTmOroVFwW'
        };

        const result = {};
        for (const [credits, prodId] of Object.entries(products)) {
            const prices = await stripe.prices.list({ product: prodId, active: true, limit: 1 });
            if (prices.data.length > 0) {
                result[credits] = prices.data[0].id;
            }
        }

        fs.writeFileSync(path.join(__dirname, '../stripe_prices.json'), JSON.stringify(result, null, 2));
        console.log('Done');
    } catch (err) {
        console.error(err.message);
    }
}

run();
