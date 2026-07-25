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

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(cookieParser());

let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri || uri === "mongodb+srv://...") {
      console.warn('⚠️ MONGODB_URI is not set. Database operations will fail. Please configure it in your secrets.');
      return;
    }
    await mongoose.connect(uri);
    isConnected = true;
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
  }
};

// Vercel serverless functions might reuse the same container
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// API Routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/groups', groupRoutes);
apiRouter.use('/friends', friendRoutes);
apiRouter.use('/income', incomeRoutes);
apiRouter.use('/expenses', expenseRoutes);
apiRouter.use('/shared-expenses', sharedExpenseRoutes);
apiRouter.use('/settlements', settlementRoutes);
apiRouter.use('/dashboard', dashboardRoutes);

app.use('/api', apiRouter);

// Export for serverless (Vercel)
export default app;

async function startServer() {
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

// Only start the server if we are not running as a Vercel function
if (!process.env.VERCEL) {
  startServer();
}
