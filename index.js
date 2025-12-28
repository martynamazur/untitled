import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(bodyParser.json());

/**
 * Mapowanie planId -> cena (TEST)
 * Docelowo: Stripe Prices / Subscriptions
 */
const PLANS = {
    basic_monthly: { amount: 19.00, currency: 'pln' },
    pro_monthly: { amount: 3999.00, currency: 'pln' },
};

app.post('/create-payment-intent', async (req, res) => {
    try {
        const { planId } = req.body;

        if (!PLANS[planId]) {
            return res.status(400).json({ error: 'Invalid planId' });
        }

        const plan = PLANS[planId];

        // 1️⃣ Customer (na razie tworzymy za każdym razem)
        const customer = await stripe.customers.create();

        // 2️⃣ Ephemeral Key (WYMAGANE przez PaymentSheet)
        const ephemeralKey = await stripe.ephemeralKeys.create(
            { customer: customer.id },
            { apiVersion: '2023-10-16' }
        );

        // 3️⃣ PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: plan.amount,
            currency: plan.currency,
            customer: customer.id,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
            amount: plan.amount,
            currency: plan.currency,
            customerId: customer.id,
            ephemeralKey: ephemeralKey.secret,
            status: paymentIntent.status,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => {
    console.log('Stripe backend running on http://localhost:3000');
});
