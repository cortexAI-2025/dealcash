import { Router } from 'express';
import { body } from 'express-validator';
import { paymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from './validation';

const router = Router();

// Stripe webhook must receive raw body
router.post('/webhook', paymentController.handleWebhook);

router.post(
  '/intent',
  authenticate,
  [body('listingId').isUUID()],
  validateRequest,
  paymentController.createPaymentIntent
);

router.get('/transaction/:id', authenticate, paymentController.getTransaction);

export default router;
