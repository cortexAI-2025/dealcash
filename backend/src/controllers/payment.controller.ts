import { Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service';
import { stripeService } from '../services/stripe.service';
import { notificationService } from '../services/notification.service';
import { createError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../types';
import { logger } from '../services/logger.service';
import { Request } from 'express';

export const paymentController = {
  async createPaymentIntent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { listingId } = req.body;

      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: { seller: true },
      });

      if (!listing) return next(createError('Listing not found', 404));
      if (listing.status !== 'ACTIVE') return next(createError('Listing is not available', 400));
      if (listing.sellerId === req.user!.id) return next(createError('Cannot buy your own listing', 400));

      const buyer = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (!buyer?.stripeCustomerId) return next(createError('Stripe customer not found', 400));

      const { platformFee, sellerAmount } = stripeService.calculateFees(listing.price);

      const { clientSecret, paymentIntentId } = await stripeService.createPaymentIntent(
        listing.price,
        'eur',
        buyer.stripeCustomerId,
        { listingId: listing.id, buyerId: req.user!.id }
      );

      // Reserve the listing
      await prisma.listing.update({ where: { id: listingId }, data: { status: 'RESERVED' } });

      await prisma.transaction.create({
        data: {
          listingId,
          buyerId: req.user!.id,
          sellerId: listing.sellerId,
          amount: listing.price,
          platformFee,
          sellerAmount,
          status: 'PENDING',
          stripePaymentIntentId: paymentIntentId,
        },
      });

      res.json({
        success: true,
        data: {
          clientSecret,
          paymentIntentId,
          amount: listing.price,
          platformFee,
          sellerAmount,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    const signature = req.headers['stripe-signature'] as string;

    try {
      const event = await stripeService.constructWebhookEvent(
        req.body,
        signature
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          await paymentController.handlePaymentSuccess(event.data.object as import('stripe').Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await paymentController.handlePaymentFailed(event.data.object as import('stripe').Stripe.PaymentIntent);
          break;
        default:
          logger.debug(`Unhandled webhook event: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      logger.error('Webhook error:', err);
      next(createError('Webhook signature verification failed', 400));
    }
  },

  async handlePaymentSuccess(paymentIntent: import('stripe').Stripe.PaymentIntent): Promise<void> {
    const transaction = await prisma.transaction.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
      include: { listing: true },
    });

    if (!transaction) return;

    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      await tx.listing.update({
        where: { id: transaction.listingId },
        data: { status: 'SOLD' },
      });
    });

    await Promise.all([
      notificationService.create({
        userId: transaction.buyerId,
        title: '✅ Payment Confirmed!',
        body: `Payment for "${transaction.listing.title}" was successful`,
        type: 'PAYMENT_SUCCESS',
        data: { transactionId: transaction.id },
      }),
      notificationService.create({
        userId: transaction.sellerId,
        title: '💰 Payment Received!',
        body: `You earned ${transaction.sellerAmount}€ for "${transaction.listing.title}"`,
        type: 'SALE_COMPLETE',
        data: { transactionId: transaction.id },
      }),
    ]);
  },

  async handlePaymentFailed(paymentIntent: import('stripe').Stripe.PaymentIntent): Promise<void> {
    const transaction = await prisma.transaction.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!transaction) return;

    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({ where: { id: transaction.id }, data: { status: 'FAILED' } });
      await tx.listing.update({ where: { id: transaction.listingId }, data: { status: 'ACTIVE' } });
    });

    await notificationService.create({
      userId: transaction.buyerId,
      title: '❌ Payment Failed',
      body: 'Your payment could not be processed. Please try again.',
      type: 'PAYMENT_FAILED',
      data: { transactionId: transaction.id },
    });
  },

  async getTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: req.params.id },
        include: {
          listing: true,
          buyer: { select: { id: true, name: true, email: true } },
          seller: { select: { id: true, name: true, email: true } },
        },
      });

      if (!transaction) return next(createError('Transaction not found', 404));

      if (transaction.buyerId !== req.user!.id && transaction.sellerId !== req.user!.id) {
        return next(createError('Not authorized', 403));
      }

      res.json({ success: true, data: transaction });
    } catch (err) {
      next(err);
    }
  },
};
