import Stripe from 'stripe';
import { config } from '../config';
import { logger } from './logger.service';

const stripe = new Stripe(config.stripe.secretKey || 'sk_test_placeholder', {
  apiVersion: '2023-10-16',
});

export const stripeService = {
  async createCustomer(email: string, name: string): Promise<string> {
    const customer = await stripe.customers.create({ email, name });
    return customer.id;
  },

  async createPaymentIntent(
    amount: number,
    currency: string = 'eur',
    customerId: string,
    metadata: Record<string, string> = {}
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const amountInCents = Math.round(amount * 100);
    const platformFeeInCents = Math.round(
      amountInCents * (config.stripe.platformFeePercent / 100)
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      customer: customerId,
      application_fee_amount: platformFeeInCents,
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  },

  async confirmPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return stripe.paymentIntents.retrieve(paymentIntentId);
  },

  async createRefund(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    const params: Stripe.RefundCreateParams = { payment_intent: paymentIntentId };
    if (amount) params.amount = Math.round(amount * 100);
    return stripe.refunds.create(params);
  },

  async constructWebhookEvent(payload: string | Buffer, signature: string): Promise<Stripe.Event> {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe.webhookSecret
    );
  },

  calculateFees(price: number): { platformFee: number; sellerAmount: number } {
    const platformFee = parseFloat((price * config.stripe.platformFeePercent / 100).toFixed(2));
    const sellerAmount = parseFloat((price - platformFee).toFixed(2));
    return { platformFee, sellerAmount };
  },
};

export { stripe };
