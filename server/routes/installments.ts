import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { Prisma } from '@prisma/client';

const router = Router();

const paymentSchema = z.object({
  amount: z.union([z.number(), z.string()]).transform(v => new Prisma.Decimal(v)),
  method: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE']),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const validatePayment = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = paymentSchema.parse(req.body);
    if (req.body.amount.lte(0)) {
      res.status(400).json({ error: 'Validation failed', details: [{ message: 'Payment amount must be greater than zero' }] });
      return;
    }
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    next(error);
  }
};

// GET /api/installments/:id/payments
router.get('/:id/payments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const payments = await prisma.payment.findMany({
      where: { installmentId: id },
      orderBy: { paymentDate: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    next(error);
  }
});

// POST /api/installments/:id/payments
router.post('/:id/payments', validatePayment, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, method, reference, notes } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch installment with existing payments
      const installment = await tx.installment.findUnique({
        where: { id },
        include: { payments: true }
      });

      if (!installment) {
        throw new Error('Installment not found');
      }

      // 2. Calculate sum of existing payments
      const existingTotal = installment.payments.reduce(
        (sum, p) => sum.add(p.amount), 
        new Prisma.Decimal(0)
      );

      // 3. Validate payment amount
      const remainingDue = installment.amountDue.sub(existingTotal);
      if (amount.gt(remainingDue)) {
        throw new Error(`Payment amount (${amount.toString()}) exceeds remaining amount due (${remainingDue.toString()})`);
      }

      // 4. Create payment
      const payment = await tx.payment.create({
        data: {
          installmentId: id,
          amount,
          method,
          reference: reference || null,
          notes: notes || null
        }
      });

      // 5. Calculate new status
      const newTotal = existingTotal.add(amount);
      let newStatus: 'PENDING' | 'PARTIAL' | 'PAID' = 'PENDING';
      
      if (newTotal.gte(installment.amountDue)) {
        newStatus = 'PAID';
      } else if (newTotal.gt(0)) {
        newStatus = 'PARTIAL';
      }

      // 6. Update installment status
      const updatedInstallment = await tx.installment.update({
        where: { id },
        data: { status: newStatus }
      });

      // 7. Audit log
      await tx.auditLog.create({
        data: {
          action: 'PAYMENT_CREATED',
          entity: 'Payment',
          entityId: payment.id,
          details: { installmentId: id, amount: amount.toString(), newStatus }
        }
      });

      return { payment, installment: updatedInstallment };
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (error.message === 'Installment not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message.includes('exceeds remaining amount due')) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

export default router;
