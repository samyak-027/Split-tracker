import express from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { PersonalExpense, Income } from '../models/Finance';
import { ActivityLog, SharedExpense, ExpenseShare, Settlement } from '../models/SharedFinance';
import { GroupMember } from '../models/Relations';

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

    // Get groups
    const memberships = await GroupMember.find({ user: userId }).populate('group');
    const groups = memberships.map(m => m.group).filter(g => g);

    // Calculate You Get
    let youGet = 0;
    let youPay = 0;

    for (const group of groups) {
      const groupId = (group as any)._id;
      const owesMap: Record<string, Record<string, number>> = {};
      
      const sharedExpenses = await SharedExpense.find({ group: groupId });
      const expenseIds = sharedExpenses.map(e => e._id);
      const shares = await ExpenseShare.find({ expense: { $in: expenseIds } });
      
      for (const exp of sharedExpenses) {
        const paidByStr = exp.paidBy.toString();
        const expShares = shares.filter(s => s.expense.toString() === exp._id.toString());
        for (const share of expShares) {
          const userStr = share.user.toString();
          if (userStr !== paidByStr) {
            if (!owesMap[userStr]) owesMap[userStr] = {};
            owesMap[userStr][paidByStr] = (owesMap[userStr][paidByStr] || 0) + share.amountOwed;
          }
        }
      }

      const settlements = await Settlement.find({ group: groupId, status: 'COMPLETED' });
      for (const st of settlements) {
        const paidByStr = st.paidBy.toString();
        const paidToStr = st.paidTo.toString();
        if (!owesMap[paidByStr]) owesMap[paidByStr] = {};
        owesMap[paidByStr][paidToStr] = (owesMap[paidByStr][paidToStr] || 0) - st.amount;
      }

      const processed = new Set<string>();
      
      for (const fromUser in owesMap) {
        for (const toUser in owesMap[fromUser]) {
          const key = fromUser < toUser ? `${fromUser}-${toUser}` : `${toUser}-${fromUser}`;
          if (processed.has(key)) continue;
          processed.add(key);

          const amountA = owesMap[fromUser]?.[toUser] || 0;
          const amountB = owesMap[toUser]?.[fromUser] || 0;
          const net = amountA - amountB;

          if (net > 0.01) {
            // fromUser owes toUser `net`
            if (toUser === userId) youGet += net;
            if (fromUser === userId) youPay += net;
          } else if (net < -0.01) {
            // toUser owes fromUser `-net`
            if (fromUser === userId) youGet += -net;
            if (toUser === userId) youPay += -net;
          }
        }
      }
    }

    res.json({
      expenseTotal,
      incomeTotal,
      balance: incomeTotal - expenseTotal,
      recentActivity: activities,
      groups,
      youGet,
      youPay,
    });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

export default router;
