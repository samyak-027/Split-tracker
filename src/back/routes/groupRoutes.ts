import express from "express";
import { authenticate, AuthRequest } from "../middlewares/auth";
import { Group } from "../models/Group";
import { GroupMember } from "../models/Relations";
import {
  ActivityLog,
  SharedExpense,
  ExpenseShare,
  Settlement,
} from "../models/SharedFinance";

const router = express.Router();

router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const memberships = await GroupMember.find({ user: req.user.id }).populate(
      "group",
    );
    res.json(memberships.map((m) => m.group).filter((g) => g));
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

router.get("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const group = await Group.findById(req.params.id);
    const members = await GroupMember.find({ group: req.params.id }).populate(
      "user",
      "name email",
    );
    const rawExpenses = await SharedExpense.find({
      group: req.params.id,
    }).populate("paidBy", "name");
    const expenseIds = rawExpenses.map((e) => e._id);
    const shares = await ExpenseShare.find({
      expense: { $in: expenseIds },
    }).populate("user", "name");

    const expenses = rawExpenses.map((exp) => {
      return {
        ...exp.toJSON(),
        splits: shares.filter(
          (s) => s.expense.toString() === exp._id.toString(),
        ),
      };
    });

    res.json({ group, members, expenses });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const group = new Group({ ...req.body, createdBy: req.user.id, joinCode });
    await group.save();

    await GroupMember.create({ group: group._id, user: req.user.id });

    await ActivityLog.create({
      user: req.user.id,
      group: group._id,
      action: "CREATE_GROUP",
      details: `Created group ${group.name}`,
    });

    res.json(group);
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

router.post("/join", authenticate, async (req: AuthRequest, res) => {
  try {
    const { joinCode } = req.body;
    const group = await Group.findOne({ joinCode });
    if (!group) return res.status(404).json({ message: "Group not found" });

    const existing = await GroupMember.findOne({
      group: group._id,
      user: req.user.id,
    });
    if (existing) return res.status(400).json({ message: "Already a member" });

    await GroupMember.create({ group: group._id, user: req.user.id });

    await ActivityLog.create({
      user: req.user.id,
      group: group._id,
      action: "JOIN_GROUP",
      details: `Joined group ${group.name}`,
    });

    res.json(group);
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

router.get("/:id/balances", authenticate, async (req: AuthRequest, res) => {
  try {
    const groupId = req.params.id;

    const netBalances: Record<string, number> = {};
    const owesMap: Record<string, Record<string, number>> = {};

    const sharedExpenses = await SharedExpense.find({ group: groupId });
    const expenseIds = sharedExpenses.map((e) => e._id);
    const shares = await ExpenseShare.find({ expense: { $in: expenseIds } });

    for (const exp of sharedExpenses) {
      const paidByStr = exp.paidBy.toString();
      netBalances[paidByStr] = (netBalances[paidByStr] || 0) + exp.amount;

      const expShares = shares.filter((s) => s.expense.toString() === exp._id.toString());
      for (const share of expShares) {
        const userStr = share.user.toString();
        netBalances[userStr] = (netBalances[userStr] || 0) - share.amountOwed;

        if (userStr !== paidByStr) {
          if (!owesMap[userStr]) owesMap[userStr] = {};
          owesMap[userStr][paidByStr] = (owesMap[userStr][paidByStr] || 0) + share.amountOwed;
        }
      }
    }

    const settlements = await Settlement.find({
      group: groupId,
      status: "COMPLETED",
    });
    for (const st of settlements) {
      const paidByStr = st.paidBy.toString();
      const paidToStr = st.paidTo.toString();
      netBalances[paidByStr] = (netBalances[paidByStr] || 0) + st.amount;
      netBalances[paidToStr] = (netBalances[paidToStr] || 0) - st.amount;

      if (!owesMap[paidByStr]) owesMap[paidByStr] = {};
      owesMap[paidByStr][paidToStr] = (owesMap[paidByStr][paidToStr] || 0) - st.amount;
    }

    for (const key in netBalances) {
      netBalances[key] = Math.round(netBalances[key] * 100) / 100;
    }

    const pairwise: { from: string; to: string; amount: number }[] = [];
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
          pairwise.push({ from: fromUser, to: toUser, amount: Math.round(net * 100) / 100 });
        } else if (net < -0.01) {
          pairwise.push({ from: toUser, to: fromUser, amount: Math.round(-net * 100) / 100 });
        }
      }
    }

    res.json({ netBalances, pairwise });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

export default router;
