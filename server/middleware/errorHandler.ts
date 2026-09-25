import express, { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('API Error:', err);

  // Handle known Prisma errors without exposing internals
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Unique constraint failed', code: err.code });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Record not found', code: err.code });
      return;
    }
    // Generic Prisma error
    res.status(400).json({ error: 'Database operation failed' });
    return;
  }

  // Handle generic errors
  res.status(500).json({ error: 'Internal server error' });
};
