import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../api.js';
import { Prisma } from '@prisma/client';

const app = express();
app.use('/api', apiRouter);

// Mock Prisma
const mockTx = {
  chitGroup: { findUnique: vi.fn(), update: vi.fn() },
  member: { findUnique: vi.fn() },
  groupMember: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  installment: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  payment: { create: vi.fn() },
  auditLog: { create: vi.fn() },
};

vi.mock('../../db.js', () => ({
  prisma: {
    $transaction: vi.fn(async (cb) => cb(mockTx)),
    groupMember: { findMany: vi.fn() },
    payment: { findMany: vi.fn() },
  }
}));

import { prisma } from '../../db.js';

describe('Phase A, B, C APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Phase A: Group Membership', () => {
    it('should add member successfully and create audit log', async () => {
      mockTx.chitGroup.findUnique.mockResolvedValue({ id: 'g1', auctions: [], members: [] });
      mockTx.member.findUnique.mockResolvedValue({ id: 'm1', isActive: true });
      mockTx.groupMember.findUnique.mockResolvedValue(null);
      mockTx.groupMember.create.mockResolvedValue({ id: 'gm1', memberId: 'm1', groupId: 'g1' });

      const res = await request(app).post('/api/chit-groups/g1/members').send({ memberId: 'm1' });
      expect(res.status).toBe(201);
      expect(mockTx.groupMember.create).toHaveBeenCalled();
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: 'MEMBER_ADDED_TO_GROUP' })
      }));
    });

    it('should prevent adding duplicate active member', async () => {
      mockTx.chitGroup.findUnique.mockResolvedValue({ id: 'g1', auctions: [], members: [] });
      mockTx.member.findUnique.mockResolvedValue({ id: 'm1', isActive: true });
      mockTx.groupMember.findUnique.mockResolvedValue({ id: 'gm1', isActive: true });

      const res = await request(app).post('/api/chit-groups/g1/members').send({ memberId: 'm1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Member is already in this group');
    });

    it('should prevent adding inactive member', async () => {
      mockTx.chitGroup.findUnique.mockResolvedValue({ id: 'g1', auctions: [], members: [] });
      mockTx.member.findUnique.mockResolvedValue({ id: 'm1', isActive: false });

      const res = await request(app).post('/api/chit-groups/g1/members').send({ memberId: 'm1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot add an inactive member');
    });
  });

  describe('Phase B: Installments', () => {
    it('should generate installments', async () => {
      const gMembers = [{ id: 'gm1' }, { id: 'gm2' }];
      mockTx.chitGroup.findUnique.mockResolvedValue({
        id: 'g1',
        installmentAmt: new Prisma.Decimal(5000),
        members: gMembers
      });
      // no existing installments
      mockTx.installment.findUnique.mockResolvedValue(null);
      mockTx.installment.create.mockResolvedValue({ id: 'inst1' });

      const res = await request(app).post('/api/chit-groups/g1/installments').send({ monthNumber: 1 });
      
      expect(res.status).toBe(201);
      expect(mockTx.installment.create).toHaveBeenCalledTimes(2);
      expect(mockTx.auditLog.create).toHaveBeenCalledTimes(2);
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: 'INSTALLMENT_GENERATED' })
      }));
    });

    it('should prevent duplicate installment generation', async () => {
      const gMembers = [{ id: 'gm1' }];
      mockTx.chitGroup.findUnique.mockResolvedValue({
        id: 'g1',
        installmentAmt: new Prisma.Decimal(5000),
        members: gMembers
      });
      // simulate existing installment
      mockTx.installment.findUnique.mockResolvedValue({ id: 'inst1' });

      const res = await request(app).post('/api/chit-groups/g1/installments').send({ monthNumber: 1 });
      
      expect(res.status).toBe(201);
      expect(mockTx.installment.create).toHaveBeenCalledTimes(0);
    });
  });

  describe('Phase C: Payments', () => {
    it('should fail on zero/negative payment', async () => {
      const res = await request(app).post('/api/installments/inst1/payments').send({ amount: 0, method: 'CASH' });
      expect(res.status).toBe(400);
      expect(res.body.details[0].message).toContain('greater than zero');
    });

    it('should fail on overpayment', async () => {
      mockTx.installment.findUnique.mockResolvedValue({
        id: 'inst1',
        amountDue: new Prisma.Decimal(5000),
        payments: []
      });
      const res = await request(app).post('/api/installments/inst1/payments').send({ amount: 6000, method: 'CASH' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('exceeds remaining amount due');
    });

    it('should process exact payment', async () => {
      mockTx.installment.findUnique.mockResolvedValue({
        id: 'inst1',
        amountDue: new Prisma.Decimal(5000),
        payments: []
      });
      mockTx.payment.create.mockResolvedValue({ id: 'pay1' });

      const res = await request(app).post('/api/installments/inst1/payments').send({ amount: 5000, method: 'CASH' });
      expect(res.status).toBe(201);
      
      expect(mockTx.installment.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { status: 'PAID' }
      }));
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: 'PAYMENT_CREATED' })
      }));
    });

    it('should process partial payment', async () => {
      mockTx.installment.findUnique.mockResolvedValue({
        id: 'inst1',
        amountDue: new Prisma.Decimal(5000),
        payments: []
      });
      mockTx.payment.create.mockResolvedValue({ id: 'pay1' });

      const res = await request(app).post('/api/installments/inst1/payments').send({ amount: 2000, method: 'CASH' });
      expect(res.status).toBe(201);
      
      expect(mockTx.installment.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { status: 'PARTIAL' }
      }));
    });

    it('should handle multiple payments against one installment', async () => {
      mockTx.installment.findUnique.mockResolvedValue({
        id: 'inst1',
        amountDue: new Prisma.Decimal(5000),
        payments: [{ amount: new Prisma.Decimal(2000) }]
      });
      mockTx.payment.create.mockResolvedValue({ id: 'pay2' });

      const res = await request(app).post('/api/installments/inst1/payments').send({ amount: 3000, method: 'CASH' });
      expect(res.status).toBe(201);
      
      expect(mockTx.installment.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { status: 'PAID' }
      }));
    });

    it('should fail for nonexistent installment', async () => {
      mockTx.installment.findUnique.mockResolvedValue(null);
      const res = await request(app).post('/api/installments/999/payments').send({ amount: 1000, method: 'CASH' });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Installment not found');
    });

    it('should simulate payment transaction failure', async () => {
      mockTx.installment.findUnique.mockRejectedValue(new Error('DB Error'));
      const res = await request(app).post('/api/installments/inst1/payments').send({ amount: 1000, method: 'CASH' });
      expect(res.status).toBe(500); // Because unhandled error goes to next(error) -> error handler -> 500 usually
    });
  });
});
