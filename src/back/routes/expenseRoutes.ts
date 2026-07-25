import express from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { PersonalExpense } from '../models/Finance';
import { ActivityLog } from '../models/SharedFinance';

const router = express.Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const expenses = await PersonalExpense.find({ user: req.user.id }).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const expense = new PersonalExpense({ ...req.body, user: req.user.id });
    await expense.save();
    
    await ActivityLog.create({
      user: req.user.id,
      action: 'ADD_PERSONAL_EXPENSE',
      details: `Added personal expense: ${expense.amount} for ${expense.category}`
    });

    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const expense = await PersonalExpense.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { ...req.body },
      { new: true }
    );
    if (!expense) return res.status(404).json({ error: 'Not found' });
    
    await ActivityLog.create({
      user: req.user.id,
      action: 'UPDATE_PERSONAL_EXPENSE',
      details: `Updated personal expense: ${expense.amount} for ${expense.category}`
    });

    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        await PersonalExpense.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ error: (err as any).message });
    }
});

export default router;
