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

    // Simple balances: positive means they are owed money, negative means they owe money
    const balances: Record<string, number> = {};

    const sharedExpenses = await SharedExpense.find({ group: groupId });
    for (const exp of sharedExpenses) {
      const paidByStr = exp.paidBy.toString();
      balances[paidByStr] = (balances[paidByStr] || 0) + exp.amount;
    }

    const expenseIds = sharedExpenses.map((e) => e._id);
    const shares = await ExpenseShare.find({ expense: { $in: expenseIds } });
    for (const share of shares) {
      const userStr = share.user.toString();
      balances[userStr] = (balances[userStr] || 0) - share.amountOwed;
    }

    // Also take settlements into account
    const settlements = await Settlement.find({
      group: groupId,
      status: "COMPLETED",
    });
    for (const st of settlements) {
      const paidByStr = st.paidBy.toString();
      const paidToStr = st.paidTo.toString();
      balances[paidByStr] = (balances[paidByStr] || 0) + st.amount;
      balances[paidToStr] = (balances[paidToStr] || 0) - st.amount;
    }

    // Round to 2 decimals to avoid floating point errors
    for (const key in balances) {
      balances[key] = Math.round(balances[key] * 100) / 100;
    }

    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

export default router;
