import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../api.js';

// Setup express app for testing
const app = express();
app.use('/api', apiRouter);

// Mock Prisma
vi.mock('../../db.js', () => ({
  prisma: {
    member: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    }
  }
}));

import { prisma } from '../../db.js';

describe('Members API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/members', () => {
    it('should create a new member successfully', async () => {
      const mockMember = { id: '1', name: 'John Doe', email: 'john@example.com', isActive: true };
      (prisma.member.create as any).mockResolvedValue(mockMember);

      const res = await request(app)
        .post('/api/members')
        .send({ name: 'John Doe', email: 'john@example.com' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockMember);
      expect(prisma.member.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ name: 'John Doe', email: 'john@example.com' })
      }));
    });

    it('should fail when name is missing', async () => {
      const res = await request(app)
        .post('/api/members')
        .send({ email: 'john@example.com' });

      console.log('MISSING NAME BODY:', res.body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details[0].message).toContain('expected string, received undefined');
    });

    it('should fail with invalid email', async () => {
      const res = await request(app)
        .post('/api/members')
        .send({ name: 'John', email: 'invalid-email' });

      console.log('INVALID EMAIL BODY:', res.body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details[0].message).toBe('Invalid email format');
    });
  });

  describe('GET /api/members', () => {
    it('should list active members', async () => {
      const mockMembers = [{ id: '1', name: 'John Doe', isActive: true }];
      (prisma.member.findMany as any).mockResolvedValue(mockMembers);

      const res = await request(app).get('/api/members');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockMembers);
      expect(prisma.member.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('PATCH /api/members/:id', () => {
    it('should update a member successfully', async () => {
      const mockMember = { id: '1', name: 'John Doe', isActive: true };
      (prisma.member.findUnique as any).mockResolvedValue(mockMember);
      (prisma.member.update as any).mockResolvedValue({ ...mockMember, name: 'Jane Doe' });

      const res = await request(app)
        .patch('/api/members/1')
        .send({ name: 'Jane Doe' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Jane Doe');
      expect(prisma.member.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: '1' },
        data: expect.objectContaining({ name: 'Jane Doe' })
      }));
    });
  });

  describe('DELETE /api/members/:id', () => {
    it('should soft delete a member', async () => {
      const mockMember = { id: '1', name: 'John Doe', isActive: true };
      (prisma.member.findUnique as any).mockResolvedValue(mockMember);
      (prisma.member.update as any).mockResolvedValue({ ...mockMember, isActive: false });

      const res = await request(app).delete('/api/members/1');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Member deleted successfully');
      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false }
      });
    });

    it('should fail if member does not exist', async () => {
      (prisma.member.findUnique as any).mockResolvedValue(null);

      const res = await request(app).delete('/api/members/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Member not found');
    });
  });
});
