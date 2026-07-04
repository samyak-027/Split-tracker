import express from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { createServer as createViteServer } from 'vite';
import dotenv from "dotenv";

dotenv.config();

// Routes will be imported here
import authRoutes from './src/back/routes/authRoutes';
import groupRoutes from './src/back/routes/groupRoutes';
import friendRoutes from './src/back/routes/friendRoutes';
import incomeRoutes from './src/back/routes/incomeRoutes';
import expenseRoutes from './src/back/routes/expenseRoutes';
import sharedExpenseRoutes from './src/back/routes/sharedExpenseRoutes';
import settlementRoutes from './src/back/routes/settlementRoutes';
import dashboardRoutes from './src/back/routes/dashboardRoutes';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // Wait, let's gracefully connect to MongoDB if URI is provided, else log warning.
  const connectDB = async () => {
    try {
      const uri = process.env.MONGODB_URI;
      if (!uri || uri === "mongodb+srv://...") {
        console.warn('⚠️ MONGODB_URI is not set. Database operations will fail. Please configure it in your secrets.');
        return;
      }
      await mongoose.connect(uri);
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB Connection Error:', error);
    }
  };
  connectDB();

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/groups', groupRoutes);
  app.use('/api/friends', friendRoutes);
  app.use('/api/income', incomeRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/shared-expenses', sharedExpenseRoutes);
  app.use('/api/settlements', settlementRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
