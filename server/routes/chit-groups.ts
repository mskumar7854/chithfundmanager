import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { Prisma } from '@prisma/client';

const router = Router();

const baseGroupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  totalAmount: z.union([z.number(), z.string()]).transform(v => new Prisma.Decimal(v)),
  installmentAmt: z.union([z.number(), z.string()]).transform(v => new Prisma.Decimal(v)),
  totalMonths: z.number().int().positive('Total months must be positive'),
  commissionPct: z.union([z.number(), z.string()]).transform(v => new Prisma.Decimal(v)),
  startDate: z.string().datetime({ message: 'Invalid date format' }),
  status: z.enum(['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional()
});

const validateGroupFinancials = (data: any, ctx: z.RefinementCtx) => {
  if (data.totalAmount && data.totalAmount.lte(0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Total amount must be greater than zero', path: ['totalAmount'] });
  }
  if (data.installmentAmt && data.installmentAmt.lte(0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Installment amount must be greater than zero', path: ['installmentAmt'] });
  }
  if (data.commissionPct && (data.commissionPct.lt(0) || data.commissionPct.gt(100))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Commission must be between 0 and 100', path: ['commissionPct'] });
  }
  
  if (data.totalAmount && data.installmentAmt && data.totalMonths) {
    const expectedTotal = data.installmentAmt.mul(data.totalMonths);
    if (!data.totalAmount.equals(expectedTotal)) {
      ctx.addIssue({ 
        code: z.ZodIssueCode.custom, 
        message: `Total amount (${data.totalAmount.toString()}) must exactly equal installment amount * total months (${expectedTotal.toString()})`,
        path: ['totalAmount'] 
      });
    }
  }
};

const createGroupSchema = baseGroupSchema.superRefine(validateGroupFinancials);
const updateGroupSchema = baseGroupSchema.partial().superRefine(validateGroupFinancials);

const validateCreate = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = createGroupSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    next(error);
  }
};

const validateUpdate = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = updateGroupSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    next(error);
  }
};

// GET /api/chit-groups
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    
    // Default to active/pending if no status is specified
    const statusFilter = status ? (status as string).toUpperCase() : { in: ['PENDING', 'ACTIVE'] };
    
    const groups = await prisma.chitGroup.findMany({
      where: {
        status: statusFilter as any
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(groups);
  } catch (error) {
    next(error);
  }
});

// GET /api/chit-groups/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const group = await prisma.chitGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: { member: true }
        }
      }
    });
    
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }
    
    res.json(group);
  } catch (error) {
    next(error);
  }
});

// POST /api/chit-groups
router.post('/', validateCreate, async (req, res, next) => {
  try {
    const newGroup = await prisma.chitGroup.create({
      data: req.body
    });
    res.status(201).json(newGroup);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/chit-groups/:id
router.patch('/:id', validateUpdate, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Retrieve group and check its state and activity
    const existing = await prisma.chitGroup.findUnique({
      where: { id },
      include: {
        auctions: true,
        expenses: true,
        members: {
          include: {
            installments: true,
            payouts: true,
            bids: true
          }
        }
      }
    });

    if (!existing) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    if (existing.status === 'COMPLETED') {
      res.status(400).json({ error: 'Cannot modify a completed group' });
      return;
    }

    // Check for financial modifications
    const financialFields: (keyof typeof req.body)[] = ['totalAmount', 'installmentAmt', 'totalMonths', 'commissionPct'];
    const isModifyingFinancials = financialFields.some(field => req.body[field] !== undefined);

    if (isModifyingFinancials) {
      // Check for any financial activity
      const hasAuctions = existing.auctions.length > 0;
      const hasMembersWithActivity = existing.members.some(
        m => m.installments.length > 0 || m.payouts.length > 0 || m.bids.length > 0
      );

      if (hasAuctions || hasMembersWithActivity) {
        res.status(400).json({ error: 'Cannot modify financial configuration after financial activity has occurred' });
        return;
      }
    }

    const updatedGroup = await prisma.chitGroup.update({
      where: { id },
      data: req.body
    });
    
    res.json(updatedGroup);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/chit-groups/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const existing = await prisma.chitGroup.findUnique({
      where: { id },
      include: {
        auctions: true,
        members: {
          include: {
            installments: true,
            payouts: true,
            bids: true
          }
        }
      }
    });

    if (!existing) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Check for any financial activity
    const hasAuctions = existing.auctions.length > 0;
    const hasMembersWithActivity = existing.members.some(
      m => m.installments.length > 0 || m.payouts.length > 0 || m.bids.length > 0
    );

    if (hasAuctions || hasMembersWithActivity) {
      res.status(400).json({ error: 'Cannot cancel or delete a group containing historical financial records' });
      return;
    }

    // Mark as cancelled since it has no activity
    const updatedGroup = await prisma.chitGroup.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });
    
    res.json({ message: 'Group cancelled successfully', group: updatedGroup });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// Group Membership (Phase A)
// -----------------------------------------------------------------------------

// GET /api/chit-groups/:groupId/members
router.get('/:groupId/members', async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const members = await prisma.groupMember.findMany({
      where: { groupId, isActive: true },
      include: { member: true }
    });
    res.json(members);
  } catch (error) {
    next(error);
  }
});

// POST /api/chit-groups/:groupId/members
router.post('/:groupId/members', async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { memberId } = req.body;

    if (!memberId) {
      res.status(400).json({ error: 'memberId is required' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Verify group
      const group = await tx.chitGroup.findUnique({
        where: { id: groupId },
        include: { auctions: true, members: { include: { installments: true } } }
      });
      if (!group) throw new Error('Group not found');

      // Do not allow adding members after the group's financial activity has started
      const hasAuctions = group.auctions.length > 0;
      const hasInstallments = group.members.some(m => m.installments.length > 0);
      if (hasAuctions || hasInstallments) {
        throw new Error('Cannot add members after financial activity has started');
      }

      // Verify member
      const member = await tx.member.findUnique({ where: { id: memberId } });
      if (!member) throw new Error('Member not found');
      if (!member.isActive) throw new Error('Cannot add an inactive member');

      // Check if already in group
      const existing = await tx.groupMember.findUnique({
        where: { memberId_groupId: { memberId, groupId } }
      });
      if (existing && existing.isActive) {
        throw new Error('Member is already in this group');
      }

      let groupMember;
      if (existing) {
        // Reactivate
        groupMember = await tx.groupMember.update({
          where: { id: existing.id },
          data: { isActive: true }
        });
      } else {
        // Create new
        groupMember = await tx.groupMember.create({
          data: { memberId, groupId }
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'MEMBER_ADDED_TO_GROUP',
          entity: 'GroupMember',
          entityId: groupMember.id,
          details: { memberId, groupId }
        }
      });

      return groupMember;
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (['Group not found', 'Member not found', 'Cannot add an inactive member', 'Member is already in this group', 'Cannot add members after financial activity has started'].includes(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

// DELETE /api/chit-groups/:groupId/members/:memberId
router.delete('/:groupId/members/:memberId', async (req, res, next) => {
  try {
    const { groupId, memberId } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const groupMember = await tx.groupMember.findUnique({
        where: { memberId_groupId: { memberId, groupId } }
      });

      if (!groupMember || !groupMember.isActive) {
        throw new Error('Member is not in this group');
      }

      const updated = await tx.groupMember.update({
        where: { id: groupMember.id },
        data: { isActive: false }
      });

      await tx.auditLog.create({
        data: {
          action: 'MEMBER_REMOVED_FROM_GROUP',
          entity: 'GroupMember',
          entityId: groupMember.id,
          details: { memberId, groupId }
        }
      });

      return updated;
    });

    res.json({ message: 'Member removed successfully', groupMember: result });
  } catch (error: any) {
    if (error.message === 'Member is not in this group') {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
});

// -----------------------------------------------------------------------------
// Installments (Phase B)
// -----------------------------------------------------------------------------

// POST /api/chit-groups/:groupId/installments
router.post('/:groupId/installments', async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { monthNumber } = req.body;

    if (!monthNumber || typeof monthNumber !== 'number') {
      res.status(400).json({ error: 'Valid monthNumber is required' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const group = await tx.chitGroup.findUnique({
        where: { id: groupId },
        include: { members: { where: { isActive: true } } }
      });

      if (!group) throw new Error('Group not found');

      const generated = [];
      
      for (const groupMember of group.members) {
        // Check if already exists
        const existing = await tx.installment.findUnique({
          where: {
            groupMemberId_monthNumber: {
              groupMemberId: groupMember.id,
              monthNumber
            }
          }
        });

        if (!existing) {
          const installment = await tx.installment.create({
            data: {
              groupMemberId: groupMember.id,
              monthNumber,
              amountDue: group.installmentAmt,
              dueDate: new Date(), // Could be customized based on start date and month
              status: 'PENDING'
            }
          });
          
          await tx.auditLog.create({
            data: {
              action: 'INSTALLMENT_GENERATED',
              entity: 'Installment',
              entityId: installment.id,
              details: { groupMemberId: groupMember.id, monthNumber, amountDue: group.installmentAmt.toString() }
            }
          });
          
          generated.push(installment);
        }
      }

      return generated;
    });

    res.status(201).json({ message: `Generated ${result.length} installments`, installments: result });
  } catch (error: any) {
    if (error.message === 'Group not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
});

// -----------------------------------------------------------------------------
// Payments (Phase C)
// -----------------------------------------------------------------------------

// GET /api/chit-groups/:groupId/payments
// -----------------------------------------------------------------------------
// Financial Dashboard & Queries (Phase Dashboard)
// -----------------------------------------------------------------------------

// GET /api/chit-groups/:groupId/summary
router.get('/:groupId/summary', async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const group = await prisma.chitGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            installments: {
              include: { payments: true }
            }
          }
        }
      }
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const totalMembers = group.members.length;
    const activeMembers = group.members.filter(m => m.isActive).length;

    let totalAmountDue = new Prisma.Decimal(0);
    let totalAmountCollected = new Prisma.Decimal(0);
    let installmentsGenerated = 0;
    let paidInstallments = 0;
    let partialInstallments = 0;
    let pendingInstallments = 0;

    for (const member of group.members) {
      for (const inst of member.installments) {
        installmentsGenerated++;
        totalAmountDue = totalAmountDue.add(inst.amountDue);
        
        let instPaid = new Prisma.Decimal(0);
        for (const payment of inst.payments) {
          instPaid = instPaid.add(payment.amount);
          totalAmountCollected = totalAmountCollected.add(payment.amount);
        }

        if (instPaid.gte(inst.amountDue)) {
          paidInstallments++;
        } else if (instPaid.gt(0)) {
          partialInstallments++;
        } else {
          pendingInstallments++;
        }
      }
    }

    const totalOutstanding = totalAmountDue.sub(totalAmountCollected);

    res.json({
      groupId: group.id,
      name: group.name,
      totalChitValue: group.totalAmount.toString(),
      totalMembers,
      activeMembers,
      installmentsGenerated,
      totalAmountDue: totalAmountDue.toString(),
      totalAmountCollected: totalAmountCollected.toString(),
      totalOutstanding: totalOutstanding.toString(),
      paidInstallments,
      partialInstallments,
      pendingInstallments
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/chit-groups/:groupId/members/dues
router.get('/:groupId/members/dues', async (req, res, next) => {
  try {
    const { groupId } = req.params;
    
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        member: true,
        installments: {
          include: { payments: true }
        }
      }
    });

    const dues = [];
    for (const gm of members) {
      for (const inst of gm.installments) {
        let amountPaid = new Prisma.Decimal(0);
        for (const p of inst.payments) {
          amountPaid = amountPaid.add(p.amount);
        }
        const outstanding = inst.amountDue.sub(amountPaid);
        let status = 'PENDING';
        if (amountPaid.gte(inst.amountDue)) status = 'PAID';
        else if (amountPaid.gt(0)) status = 'PARTIAL';

        dues.push({
          memberId: gm.member.id,
          memberName: gm.member.name,
          monthNumber: inst.monthNumber,
          amountDue: inst.amountDue.toString(),
          amountPaid: amountPaid.toString(),
          outstanding: outstanding.toString(),
          status
        });
      }
    }

    // sort by member then month
    dues.sort((a, b) => a.memberName.localeCompare(b.memberName) || a.monthNumber - b.monthNumber);

    res.json(dues);
  } catch (error) {
    next(error);
  }
});

// GET /api/chit-groups/:groupId/outstanding
router.get('/:groupId/outstanding', async (req, res, next) => {
  try {
    const { groupId } = req.params;
    
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        member: true,
        installments: {
          include: { payments: true }
        }
      }
    });

    const outstandingRecords = [];
    for (const gm of members) {
      for (const inst of gm.installments) {
        let amountPaid = new Prisma.Decimal(0);
        for (const p of inst.payments) {
          amountPaid = amountPaid.add(p.amount);
        }
        const outstanding = inst.amountDue.sub(amountPaid);
        
        if (outstanding.gt(0)) {
          outstandingRecords.push({
            memberId: gm.member.id,
            memberName: gm.member.name,
            installmentId: inst.id,
            monthNumber: inst.monthNumber,
            amountDue: inst.amountDue.toString(),
            amountPaid: amountPaid.toString(),
            outstanding: outstanding.toString()
          });
        }
      }
    }

    res.json(outstandingRecords);
  } catch (error) {
    next(error);
  }
});

// GET /api/chit-groups/:groupId/payments
router.get('/:groupId/payments', async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { startDate, endDate, monthNumber } = req.query;

    const whereClause: any = {
      installment: { groupMember: { groupId } }
    };

    if (startDate || endDate) {
      whereClause.paymentDate = {};
      if (startDate) whereClause.paymentDate.gte = new Date(startDate as string);
      if (endDate) whereClause.paymentDate.lte = new Date(endDate as string);
    }
    
    if (monthNumber) {
      whereClause.installment = {
        ...whereClause.installment,
        monthNumber: parseInt(monthNumber as string, 10)
      };
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      orderBy: { paymentDate: 'desc' },
      include: {
        installment: {
          include: {
            groupMember: {
              include: { member: true }
            }
          }
        }
      }
    });

    let totalCollected = new Prisma.Decimal(0);
    const records = payments.map(p => {
      totalCollected = totalCollected.add(p.amount);
      return {
        id: p.id,
        amount: p.amount.toString(),
        paymentDate: p.paymentDate,
        method: p.method,
        reference: p.reference,
        memberName: p.installment.groupMember.member.name,
        monthNumber: p.installment.monthNumber
      };
    });

    res.json({
      totalCollected: totalCollected.toString(),
      count: records.length,
      payments: records
    });
  } catch (error) {
    next(error);
  }
});

export default router;
