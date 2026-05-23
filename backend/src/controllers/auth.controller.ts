import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/prisma.service';
import { stripeService } from '../services/stripe.service';
import { config } from '../config';
import { createError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../types';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name, phone } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return next(createError('Email already registered', 409));
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const stripeCustomerId = await stripeService.createCustomer(email, name);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone,
          stripeCustomerId,
        },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as `${number}${'s'|'m'|'h'|'d'}` }
      );

      res.status(201).json({ success: true, data: { user, token } });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return next(createError('Invalid credentials', 401));
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return next(createError('Invalid credentials', 401));
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as `${number}${'s'|'m'|'h'|'d'}` }
      );

      res.json({
        success: true,
        data: {
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true, email: true, name: true, phone: true,
          avatarUrl: true, role: true, createdAt: true,
          _count: { select: { listings: true, sales: true, purchases: true } },
        },
      });

      if (!user) return next(createError('User not found', 404));
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, phone, avatarUrl, pushToken } = req.body;

      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: { name, phone, avatarUrl, pushToken },
        select: { id: true, email: true, name: true, phone: true, avatarUrl: true },
      });

      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (!user) return next(createError('User not found', 404));

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) return next(createError('Invalid current password', 401));

      const hashed = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

      res.json({ success: true, message: 'Password updated' });
    } catch (err) {
      next(err);
    }
  },
};
