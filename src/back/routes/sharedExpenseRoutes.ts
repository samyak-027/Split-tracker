import express from "express";
import { authenticate, AuthRequest } from "../middlewares/auth";
import {
  SharedExpense,
  ExpenseShare,
  ActivityLog,
} from "../models/SharedFinance";

const router = express.Router();

router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { group, title, amount, splitType, category, description, date, splits } =
      req.body;
    // splits array: { user: string, amount: number }

    const expense = new SharedExpense({
      group,
      title,
      amount,
      splitType,
      category,
      description,
      date,
      paidBy: req.body.paidBy || req.user.id,
    });
    await expense.save();

    for (const split of splits) {
      await ExpenseShare.create({
        expense: expense._id,
        user: split.user,
        amountOwed: split.amount,
      });
    }

    await ActivityLog.create({
      user: req.user.id,
      group: group,
      action: "ADD_SHARED_EXPENSE",
      details: `Added shared expense ${title} for ${amount}`,
    });

    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

router.put("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      amount,
      splitType,
      category,
      description,
      date,
      splits,
      paidBy,
    } = req.body;

    const expense = await SharedExpense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: "Not found" });

    expense.title = title;
    expense.amount = amount;
    expense.splitType = splitType;
    expense.category = category || expense.category;
    expense.description = description;
    expense.date = date;
    if (paidBy) expense.paidBy = paidBy;
    await expense.save();

    await ExpenseShare.deleteMany({ expense: expense._id });

    for (const split of splits) {
      await ExpenseShare.create({
        expense: expense._id,
        user: split.user,
        amountOwed: split.amount,
      });
    }

    await ActivityLog.create({
      user: req.user.id,
      group: expense.group,
      action: "UPDATE_SHARED_EXPENSE",
      details: `Updated shared expense ${title} for ${amount}`,
    });

    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

router.delete("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const expense = await SharedExpense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: "Not found" });

    // Ensure user is part of group before they can delete? Or just simple check.
    // Assuming simple for now
    await ExpenseShare.deleteMany({ expense: expense._id });
    await SharedExpense.findByIdAndDelete(expense._id);

    await ActivityLog.create({
      user: req.user.id,
      group: expense.group,
      action: "DELETE_SHARED_EXPENSE",
      details: `Deleted shared expense ${expense.title} for ${expense.amount}`,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

export default router;
