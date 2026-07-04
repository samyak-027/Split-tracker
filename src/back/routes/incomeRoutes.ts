import express from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { Income } from '../models/Finance';

const router = express.Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const incomes = await Income.find({ user: req.user.id }).sort({ date: -1 });
    res.json(incomes);
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const income = new Income({ ...req.body, user: req.user.id });
    await income.save();
    res.json(income);
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        await Income.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ error: (err as any).message });
    }
});

export default router;
