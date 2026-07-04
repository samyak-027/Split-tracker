import express from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { Settlement, ActivityLog } from '../models/SharedFinance';

const router = express.Router();

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { group, paidTo, amount } = req.body;
    const settlement = new Settlement({
      group,
      paidTo,
      amount,
      paidBy: req.user.id,
      status: 'PENDING'
    });
    await settlement.save();
    res.json(settlement);
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

router.put('/:id/confirm', authenticate, async (req: AuthRequest, res) => {
    try {
        const settlement = await Settlement.findById(req.params.id);
        if (!settlement) return res.status(404).json({ message: 'Not found' });
        
        if (settlement.paidTo.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only receiver can confirm' });
        }

        settlement.status = 'COMPLETED';
        await settlement.save();

        await ActivityLog.create({
            user: settlement.paidBy,
            group: settlement.group,
            action: 'SETTLEMENT_COMPLETED',
            details: `Settlement of ${settlement.amount} completed`
        });

        res.json(settlement);
    } catch(err) {
        res.status(500).json({ error: (err as any).message });
    }
});

router.get('/pending', authenticate, async (req: AuthRequest, res) => {
    try {
        const pending = await Settlement.find({ 
            status: 'PENDING', 
            $or: [{ paidBy: req.user.id }, { paidTo: req.user.id }]
        }).populate('paidBy paidTo group', 'name');
        res.json(pending);
    } catch(err) {
        res.status(500).json({ error: (err as any).message });
    }
});

export default router;
