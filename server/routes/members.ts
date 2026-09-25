import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js'; // Ensure correct import path relative to build output or use tsx
import { Prisma } from '@prisma/client';

const router = Router();

// Validation schema for creating/updating a member
const memberSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().optional().nullable().transform(val => val === '' ? null : val),
  email: z.string().trim().email('Invalid email format').optional().nullable().transform(val => val === '' ? null : val),
  address: z.string().trim().optional().nullable().transform(val => val === '' ? null : val),
});

// Middleware for validation
const validateMember = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = memberSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    next(error);
  }
};

// GET /api/members
router.get('/', async (req, res, next) => {
  try {
    const members = await prisma.member.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(members);
  } catch (error) {
    next(error);
  }
});

// GET /api/members/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Invalid ID format' });
      return;
    }
    const member = await prisma.member.findUnique({
      where: { id }
    });
    
    if (!member || !member.isActive) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    
    res.json(member);
  } catch (error) {
    next(error);
  }
});

// GET /api/members/:id/summary
router.get('/:id/summary', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Invalid ID format' });
      return;
    }

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        groupMemberships: {
          include: {
            group: true,
            installments: {
              include: { payments: true }
            }
          }
        }
      }
    });
    
    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    let totalDue = new Prisma.Decimal(0);
    let totalPaid = new Prisma.Decimal(0);
    const groupsJoined = member.groupMemberships.map(gm => gm.group);
    const paymentHistory: any[] = [];

    for (const gm of member.groupMemberships) {
      for (const inst of gm.installments) {
        totalDue = totalDue.add(inst.amountDue);
        for (const payment of inst.payments) {
          totalPaid = totalPaid.add(payment.amount);
          paymentHistory.push({
            ...payment,
            installmentId: inst.id,
            monthNumber: inst.monthNumber,
            groupId: gm.groupId,
            groupName: gm.group.name
          });
        }
      }
    }

    const totalOutstanding = totalDue.sub(totalPaid);
    paymentHistory.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    res.json({
      memberId: member.id,
      name: member.name,
      groupsJoined,
      totalDue: totalDue.toString(),
      totalPaid: totalPaid.toString(),
      totalOutstanding: totalOutstanding.toString(),
      paymentHistory
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/members
router.post('/', validateMember, async (req, res, next) => {
  try {
    const data = req.body;
    const newMember = await prisma.member.create({
      data
    });
    res.status(201).json(newMember);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/members/:id
router.patch('/:id', validateMember, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Invalid ID format' });
      return;
    }
    
    // Ensure member exists and is active
    const existing = await prisma.member.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    const data = req.body;
    const updatedMember = await prisma.member.update({
      where: { id },
      data
    });
    res.json(updatedMember);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/members/:id (Soft delete)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Invalid ID format' });
      return;
    }

    const existing = await prisma.member.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    // Soft delete
    const deletedMember = await prisma.member.update({
      where: { id },
      data: { isActive: false }
    });
    
    res.json({ message: 'Member deleted successfully', member: deletedMember });
  } catch (error) {
    next(error);
  }
});

export default router;
