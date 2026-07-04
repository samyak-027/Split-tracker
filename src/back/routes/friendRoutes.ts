import express from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { Friend } from '../models/Relations';
import { User } from '../models/User';

const router = express.Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const friends = await Friend.find({
      $or: [{ user1: req.user.id }, { user2: req.user.id }]
    }).populate('user1 user2', 'name email friendCode');
    
    // Map to simple friend objects
    const friendList = friends.map(f => {
      const isUser1 = (f.user1 as any)._id.toString() === req.user.id;
      return isUser1 ? f.user2 : f.user1;
    });

    res.json(friendList);
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { friendCode } = req.body;
    const friendUser = await User.findOne({ friendCode });
    if (!friendUser) return res.status(404).json({ message: 'User not found' });
    if (friendUser._id.toString() === req.user.id) return res.status(400).json({ message: 'Cannot add yourself' });

    const existing = await Friend.findOne({
      $or: [
        { user1: req.user.id, user2: friendUser._id },
        { user1: friendUser._id, user2: req.user.id }
      ]
    });
    if (existing) return res.status(400).json({ message: 'Already friends' });

    const friend = new Friend({ user1: req.user.id, user2: friendUser._id });
    await friend.save();
    res.json(friendUser);
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

export default router;
