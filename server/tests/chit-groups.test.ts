import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../api.js';
import { Prisma } from '@prisma/client';

const app = express();
app.use('/api', apiRouter);

// Mock Prisma
vi.mock('../../db.js', () => ({
  prisma: {
    chitGroup: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    }
  }
}));

import { prisma } from '../../db.js';

describe('Chit Groups API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validGroup = {
    name: 'Diwali Fund',
    totalAmount: 100000,
    installmentAmt: 5000,
    totalMonths: 20,
    commissionPct: 5,
    startDate: '2026-10-01T00:00:00Z',
    status: 'PENDING'
  };

  describe('POST /api/chit-groups', () => {
    it('should create a valid group successfully', async () => {
      const mockResult = { id: '1', ...validGroup };
      (prisma.chitGroup.create as any).mockResolvedValue(mockResult);

      const res = await request(app).post('/api/chit-groups').send(validGroup);

      expect(res.status).toBe(201);
      expect(prisma.chitGroup.create).toHaveBeenCalled();
      
      const createArgs = (prisma.chitGroup.create as any).mock.calls[0][0].data;
      expect(createArgs.name).toBe('Diwali Fund');
      expect(createArgs.totalAmount instanceof Prisma.Decimal).toBe(true);
      expect(createArgs.totalAmount.toNumber()).toBe(100000);
    });

    it('should fail with invalid name', async () => {
      const res = await request(app).post('/api/chit-groups').send({ ...validGroup, name: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.details[0].path).toContain('name');
    });

    it('should fail with zero/negative total amount', async () => {
      const res = await request(app).post('/api/chit-groups').send({ ...validGroup, totalAmount: -100, installmentAmt: -5 });
      expect(res.status).toBe(400);
      expect(res.body.details.some((d: any) => d.path.includes('totalAmount'))).toBe(true);
    });

    it('should fail when installmentAmt * totalMonths != totalAmount', async () => {
      const res = await request(app).post('/api/chit-groups').send({ ...validGroup, installmentAmt: 1000 });
      expect(res.status).toBe(400);
      expect(res.body.details.some((d: any) => d.message.includes('Total amount'))).toBe(true);
    });

    it('should fail with invalid commission percentage', async () => {
      const res = await request(app).post('/api/chit-groups').send({ ...validGroup, commissionPct: 150 });
      expect(res.status).toBe(400);
      expect(res.body.details.some((d: any) => d.path.includes('commissionPct'))).toBe(true);
    });

    it('should fail with invalid date format', async () => {
      const res = await request(app).post('/api/chit-groups').send({ ...validGroup, startDate: 'not-a-date' });
      expect(res.status).toBe(400);
      expect(res.body.details.some((d: any) => d.path.includes('startDate'))).toBe(true);
    });
  });

  describe('GET /api/chit-groups', () => {
    it('should list active/pending groups by default', async () => {
      (prisma.chitGroup.findMany as any).mockResolvedValue([]);
      const res = await request(app).get('/api/chit-groups');
      expect(res.status).toBe(200);
      expect(prisma.chitGroup.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { status: { in: ['PENDING', 'ACTIVE'] } }
      }));
    });
  });

  describe('GET /api/chit-groups/:id', () => {
    it('should return a group with membership info', async () => {
      (prisma.chitGroup.findUnique as any).mockResolvedValue({ id: '1', members: [] });
      const res = await request(app).get('/api/chit-groups/1');
      expect(res.status).toBe(200);
      expect(prisma.chitGroup.findUnique).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: '1' },
        include: { members: { include: { member: true } } }
      }));
    });
    
    it('should return 404 for nonexistent group', async () => {
      (prisma.chitGroup.findUnique as any).mockResolvedValue(null);
      const res = await request(app).get('/api/chit-groups/999');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/chit-groups/:id', () => {
    it('should update non-financial info easily', async () => {
      (prisma.chitGroup.findUnique as any).mockResolvedValue({ id: '1', status: 'PENDING', auctions: [], members: [] });
      (prisma.chitGroup.update as any).mockResolvedValue({ id: '1', name: 'New Name' });

      const res = await request(app).patch('/api/chit-groups/1').send({ name: 'New Name' });
      expect(res.status).toBe(200);
    });

    it('should prevent modification if group is completed', async () => {
      (prisma.chitGroup.findUnique as any).mockResolvedValue({ id: '1', status: 'COMPLETED' });
      const res = await request(app).patch('/api/chit-groups/1').send({ name: 'New Name' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('completed group');
    });

    it('should prevent financial modifications if financial activity exists', async () => {
      (prisma.chitGroup.findUnique as any).mockResolvedValue({ 
        id: '1', 
        status: 'ACTIVE',
        auctions: [{ id: 'a1' }], // Has auction
        members: []
      });

      const res = await request(app).patch('/api/chit-groups/1').send({ totalAmount: 200000 });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('financial activity');
    });
  });

  describe('DELETE /api/chit-groups/:id', () => {
    it('should mark as cancelled if no financial activity', async () => {
      (prisma.chitGroup.findUnique as any).mockResolvedValue({ 
        id: '1', status: 'PENDING', auctions: [], members: [] 
      });
      (prisma.chitGroup.update as any).mockResolvedValue({ id: '1', status: 'CANCELLED' });

      const res = await request(app).delete('/api/chit-groups/1');
      expect(res.status).toBe(200);
      expect(prisma.chitGroup.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { status: 'CANCELLED' }
      }));
    });

    it('should prevent deletion if financial history exists', async () => {
      (prisma.chitGroup.findUnique as any).mockResolvedValue({ 
        id: '1', 
        status: 'ACTIVE',
        auctions: [], 
        members: [{
          installments: [{ id: 'i1' }], // Has installment
          payouts: [],
          bids: []
        }]
      });

      const res = await request(app).delete('/api/chit-groups/1');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('historical financial records');
    });
  });
});
