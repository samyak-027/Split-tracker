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
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/shared-expenses', sharedExpenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/dashboard', dashboardRoutes);

export default app;
