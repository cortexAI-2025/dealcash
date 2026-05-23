import { Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service';
import { aiAgentService } from '../services/ai-agent.service';
import { createError } from '../middleware/error.middleware';
import { AuthenticatedRequest, AgentRuleInput } from '../types';

export const agentController = {
  async getRules(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rules = await prisma.agentRule.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: rules });
    } catch (err) {
      next(err);
    }
  },

  async createRule(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: AgentRuleInput = req.body;

      const existing = await prisma.agentRule.count({ where: { userId: req.user!.id } });
      if (existing >= 10) return next(createError('Maximum 10 agent rules allowed', 400));

      const rule = await prisma.agentRule.create({
        data: {
          userId: req.user!.id,
          name: input.name,
          maxPrice: input.maxPrice,
          categories: input.categories,
          urgencyLevels: input.urgencyLevels as import('@prisma/client').UrgencyLevel[],
          maxDistanceKm: input.maxDistanceKm,
          userLatitude: input.userLatitude,
          userLongitude: input.userLongitude,
          keywords: input.keywords || [],
          dailyBudget: input.dailyBudget,
        },
      });

      res.status(201).json({ success: true, data: rule });
    } catch (err) {
      next(err);
    }
  },

  async updateRule(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rule = await prisma.agentRule.findUnique({ where: { id: req.params.id } });
      if (!rule) return next(createError('Rule not found', 404));
      if (rule.userId !== req.user!.id) return next(createError('Not authorized', 403));

      const updated = await prisma.agentRule.update({
        where: { id: rule.id },
        data: req.body,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  async deleteRule(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rule = await prisma.agentRule.findUnique({ where: { id: req.params.id } });
      if (!rule) return next(createError('Rule not found', 404));
      if (rule.userId !== req.user!.id) return next(createError('Not authorized', 403));

      await prisma.agentRule.delete({ where: { id: rule.id } });
      res.json({ success: true, message: 'Rule deleted' });
    } catch (err) {
      next(err);
    }
  },

  async toggleRule(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rule = await prisma.agentRule.findUnique({ where: { id: req.params.id } });
      if (!rule) return next(createError('Rule not found', 404));
      if (rule.userId !== req.user!.id) return next(createError('Not authorized', 403));

      const newStatus = rule.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      const updated = await prisma.agentRule.update({
        where: { id: rule.id },
        data: { status: newStatus },
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  async runManually(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user!.role !== 'ADMIN') return next(createError('Admin only', 403));
      await aiAgentService.runAgentCycle();
      res.json({ success: true, message: 'Agent cycle triggered' });
    } catch (err) {
      next(err);
    }
  },
};
