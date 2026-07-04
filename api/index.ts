import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';

// Routes will be imported here
import authRoutes from '../src/back/routes/authRoutes';
import groupRoutes from '../src/back/routes/groupRoutes';
import friendRoutes from '../src/back/routes/friendRoutes';
import incomeRoutes from '../src/back/routes/incomeRoutes';
import expenseRoutes from '../src/back/routes/expenseRoutes';
import sharedExpenseRoutes from '../src/back/routes/sharedExpenseRoutes';
import settlementRoutes from '../src/back/routes/settlementRoutes';
import dashboardRoutes from '../src/back/routes/dashboardRoutes';

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri || uri === "mongodb+srv://...") {
      console.warn('⚠️ MONGODB_URI is not set. Database operations will fail.');
      return;
    }
    await mongoose.connect(uri);
    isConnected = true;
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
  }
};

// Vercel serverless functions might reuse the same container, so we connect per request 
// if not already connected.
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

// Mount on both /api and / in case Vercel strips the /api prefix
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Catch-all 404 for API
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

export default app;
