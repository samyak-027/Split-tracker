import express from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { PersonalExpense, Income } from '../models/Finance';
import { ActivityLog } from '../models/SharedFinance';

const router = express.Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const expenses = await PersonalExpense.find({ user: userId, date: { $gte: firstDayOfMonth } });
    const inctotal = await Income.find({ user: userId, date: { $gte: firstDayOfMonth } });
    const activities = await ActivityLog.find({ user: userId }).sort({ date: -1 }).limit(10);

    const expenseTotal = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const incomeTotal = inctotal.reduce((acc, curr) => acc + curr.amount, 0);

    res.json({
      expenseTotal,
      incomeTotal,
      balance: incomeTotal - expenseTotal,
      recentActivity: activities,
    });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

export default router;
