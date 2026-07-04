import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const friendCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const user = new User({ name, email, passwordHash, friendCode });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true }).json({ token, user: { id: user._id, name, email, friendCode } });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true }).json({ token, user: { id: user._id, name: user.name, email, friendCode: user.friendCode } });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token').json({ message: 'Logged out' });
});

export default router;
