import { Router } from 'express';
import { body } from 'express-validator';
import { listingController } from '../controllers/listing.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from './validation';

const router = Router();

router.get('/', listingController.getListings);
router.get('/my', authenticate, listingController.getMyListings);
router.get('/:id', listingController.getListing);

router.post(
  '/',
  authenticate,
  [
    body('title').trim().isLength({ min: 5, max: 200 }),
    body('description').trim().isLength({ min: 10, max: 2000 }),
    body('price').isFloat({ min: 0.01 }),
    body('category').notEmpty(),
    body('urgency').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'FLASH']),
    body('photos').optional().isArray(),
  ],
  validateRequest,
  listingController.createListing
);

router.put('/:id', authenticate, listingController.updateListing);
router.delete('/:id', authenticate, listingController.deleteListing);

export default router;
