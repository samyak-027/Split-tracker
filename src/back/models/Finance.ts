import mongoose, { Document, Schema } from 'mongoose';

export interface IPersonalExpense extends Document {
  user: mongoose.Types.ObjectId;
  amount: number;
  category: string;
  description: string;
  date: Date;
}

const PersonalExpenseSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true }
});

export const PersonalExpense = mongoose.model<IPersonalExpense>('PersonalExpense', PersonalExpenseSchema);

export interface IIncome extends Document {
  user: mongoose.Types.ObjectId;
  amount: number;
  source: string;
  description: string;
  date: Date;
}

const IncomeSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  source: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true }
});

export const Income = mongoose.model<IIncome>('Income', IncomeSchema);
