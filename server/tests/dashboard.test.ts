import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../api.js';
import { Prisma } from '@prisma/client';

const app = express();
app.use('/api', apiRouter);

vi.mock('../../db.js', () => ({
  prisma: {
    chitGroup: { findUnique: vi.fn() },
    groupMember: { findMany: vi.fn() },
    member: { findUnique: vi.fn() },
    payment: { findMany: vi.fn() },
  }
}));

import { prisma } from '../../db.js';

describe('Financial Dashboard & Queries API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/chit-groups/:groupId/summary', () => {
    it('should return 404 for nonexistent group', async () => {
      (prisma.chitGroup.findUnique as any).mockResolvedValue(null);
      const res = await request(app).get('/api/chit-groups/999/summary');
      expect(res.status).toBe(404);
    });

    it('should correctly aggregate totals for an empty group', async () => {
      (prisma.chitGroup.findUnique as any).mockResolvedValue({
        id: 'g1', name: 'Empty Group', totalAmount: new Prisma.Decimal(100000), members: []
      });
      const res = await request(app).get('/api/chit-groups/g1/summary');
      expect(res.status).toBe(200);
      expect(res.body.totalMembers).toBe(0);
      expect(res.body.totalAmountDue).toBe('0');
      expect(res.body.totalAmountCollected).toBe('0');
      expect(res.body.totalOutstanding).toBe('0');
    });

    it('should aggregate totals correctly with multiple members, installments, and partial payments', async () => {
      const mockGroup = {
        id: 'g1',
        name: 'Active Group',
        totalAmount: new Prisma.Decimal(100000),
        members: [
          {
            isActive: true,
            installments: [
              {
                amountDue: new Prisma.Decimal(5000),
                payments: [{ amount: new Prisma.Decimal(5000) }] // Paid
              },
              {
                amountDue: new Prisma.Decimal(5000),
                payments: [{ amount: new Prisma.Decimal(2000) }, { amount: new Prisma.Decimal(1000) }] // Partial (3000)
              }
            ]
          },
          {
            isActive: true,
            installments: [
              {
                amountDue: new Prisma.Decimal(5000),
                payments: [] // Pending
              }
            ]
          }
        ]
      };
      (prisma.chitGroup.findUnique as any).mockResolvedValue(mockGroup);

      const res = await request(app).get('/api/chit-groups/g1/summary');
      expect(res.status).toBe(200);
      expect(res.body.totalMembers).toBe(2);
      expect(res.body.installmentsGenerated).toBe(3);
      expect(res.body.totalAmountDue).toBe('15000');
      expect(res.body.totalAmountCollected).toBe('8000');
      expect(res.body.totalOutstanding).toBe('7000');
      expect(res.body.paidInstallments).toBe(1);
      expect(res.body.partialInstallments).toBe(1);
      expect(res.body.pendingInstallments).toBe(1);
    });
  });

  describe('GET /api/chit-groups/:groupId/members/dues', () => {
    it('should correctly derive outstanding and status from payments', async () => {
      (prisma.groupMember.findMany as any).mockResolvedValue([
        {
          member: { id: 'm1', name: 'Alice' },
          installments: [
            { monthNumber: 1, amountDue: new Prisma.Decimal(5000), payments: [{ amount: new Prisma.Decimal(5000) }] },
            { monthNumber: 2, amountDue: new Prisma.Decimal(5000), payments: [{ amount: new Prisma.Decimal(2500) }] }
          ]
        },
        {
          member: { id: 'm2', name: 'Bob' },
          installments: [
            { monthNumber: 1, amountDue: new Prisma.Decimal(5000), payments: [] }
          ]
        }
      ]);

      const res = await request(app).get('/api/chit-groups/g1/members/dues');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      
      const aliceM2 = res.body.find((d: any) => d.memberName === 'Alice' && d.monthNumber === 2);
      expect(aliceM2.status).toBe('PARTIAL');
      expect(aliceM2.outstanding).toBe('2500');

      const bobM1 = res.body.find((d: any) => d.memberName === 'Bob' && d.monthNumber === 1);
      expect(bobM1.status).toBe('PENDING');
      expect(bobM1.outstanding).toBe('5000');
    });
  });

  describe('GET /api/chit-groups/:groupId/outstanding', () => {
    it('should only return installments with an outstanding balance', async () => {
      (prisma.groupMember.findMany as any).mockResolvedValue([
        {
          member: { id: 'm1', name: 'Alice' },
          installments: [
            { id: 'i1', monthNumber: 1, amountDue: new Prisma.Decimal(5000), payments: [{ amount: new Prisma.Decimal(5000) }] }, // fully paid
            { id: 'i2', monthNumber: 2, amountDue: new Prisma.Decimal(5000), payments: [{ amount: new Prisma.Decimal(4000) }] } // outstanding 1000
          ]
        }
      ]);

      const res = await request(app).get('/api/chit-groups/g1/outstanding');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].installmentId).toBe('i2');
      expect(res.body[0].outstanding).toBe('1000');
    });
  });

  describe('GET /api/members/:memberId/summary', () => {
    it('should return 404 for nonexistent member', async () => {
      (prisma.member.findUnique as any).mockResolvedValue(null);
      const res = await request(app).get('/api/members/999/summary');
      expect(res.status).toBe(404);
    });

    it('should aggregate totals across multiple groups for a member', async () => {
      (prisma.member.findUnique as any).mockResolvedValue({
        id: 'm1',
        name: 'Alice',
        groupMemberships: [
          {
            groupId: 'g1',
            group: { id: 'g1', name: 'Group 1' },
            installments: [
              { id: 'i1', monthNumber: 1, amountDue: new Prisma.Decimal(5000), payments: [{ amount: new Prisma.Decimal(5000), paymentDate: new Date('2026-01-01') }] }
            ]
          },
          {
            groupId: 'g2',
            group: { id: 'g2', name: 'Group 2' },
            installments: [
              { id: 'i2', monthNumber: 1, amountDue: new Prisma.Decimal(10000), payments: [{ amount: new Prisma.Decimal(2000), paymentDate: new Date('2026-01-02') }] }
            ]
          }
        ]
      });

      const res = await request(app).get('/api/members/m1/summary');
      expect(res.status).toBe(200);
      expect(res.body.groupsJoined).toHaveLength(2);
      expect(res.body.totalDue).toBe('15000');
      expect(res.body.totalPaid).toBe('7000');
      expect(res.body.totalOutstanding).toBe('8000');
      expect(res.body.paymentHistory).toHaveLength(2);
      expect(res.body.paymentHistory[0].amount).toBe('2000'); // newest payment first due to sort
    });
  });

  describe('GET /api/chit-groups/:groupId/payments', () => {
    it('should calculate payment totals and return records', async () => {
      (prisma.payment.findMany as any).mockResolvedValue([
        {
          id: 'p1',
          amount: new Prisma.Decimal(5000),
          paymentDate: new Date('2026-01-01'),
          method: 'CASH',
          installment: { monthNumber: 1, groupMember: { member: { name: 'Alice' } } }
        },
        {
          id: 'p2',
          amount: new Prisma.Decimal(3000),
          paymentDate: new Date('2026-01-02'),
          method: 'UPI',
          installment: { monthNumber: 1, groupMember: { member: { name: 'Bob' } } }
        }
      ]);

      const res = await request(app).get('/api/chit-groups/g1/payments?monthNumber=1');
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.totalCollected).toBe('8000');
      expect(res.body.payments[0].memberName).toBe('Alice');
    });
  });
});
