import { Router } from 'express';
import { body } from 'express-validator';
import { agentController } from '../controllers/agent.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from './validation';

const router = Router();

router.use(authenticate);

router.get('/', agentController.getRules);

router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2, max: 100 }),
    body('maxPrice').isFloat({ min: 0.01 }),
    body('dailyBudget').isFloat({ min: 0.01 }),
    body('categories').isArray(),
    body('urgencyLevels').isArray(),
  ],
  validateRequest,
  agentController.createRule
);

router.put('/:id', agentController.updateRule);
router.delete('/:id', agentController.deleteRule);
router.post('/:id/toggle', agentController.toggleRule);
router.post('/run', agentController.runManually);

export default router;
