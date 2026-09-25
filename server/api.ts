import express from 'express';
import memberRoutes from './routes/members.js';
import chitGroupRoutes from './routes/chit-groups.js';
import installmentRoutes from './routes/installments.js';
import { errorHandler } from './middleware/errorHandler.js';

export const apiRouter = express.Router();

apiRouter.use(express.json());

// Register routes
apiRouter.use('/members', memberRoutes);
apiRouter.use('/chit-groups', chitGroupRoutes);
apiRouter.use('/installments', installmentRoutes);

// Health check
apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling must be last
apiRouter.use(errorHandler);
