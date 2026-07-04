import mongoose, { Document, Schema } from 'mongoose';

export interface ISharedExpense extends Document {
  group: mongoose.Types.ObjectId;
  paidBy: mongoose.Types.ObjectId;
  title: string;
  amount: number;
  splitType: 'EQUAL' | 'CUSTOM' | 'PERCENTAGE' | 'EXACT' | 'SINGLE_PERSON';
  category?: string;
  description?: string;
  date: Date;
  createdAt: Date;
}

const SharedExpenseSchema: Schema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  paidBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  splitType: { type: String, enum: ['EQUAL', 'CUSTOM', 'PERCENTAGE', 'EXACT', 'SINGLE_PERSON'], required: true },
  category: { type: String, default: 'Other' },
  description: { type: String },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const SharedExpense = mongoose.model<ISharedExpense>('SharedExpense', SharedExpenseSchema);

export interface IExpenseShare extends Document {
  expense: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  amountOwed: number;
}

const ExpenseShareSchema: Schema = new Schema({
  expense: { type: Schema.Types.ObjectId, ref: 'SharedExpense', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amountOwed: { type: Number, required: true }
});

export const ExpenseShare = mongoose.model<IExpenseShare>('ExpenseShare', ExpenseShareSchema);

export interface ISettlement extends Document {
  group: mongoose.Types.ObjectId;
  paidBy: mongoose.Types.ObjectId; // User who pays the settlement
  paidTo: mongoose.Types.ObjectId;   // User who receives the money
  amount: number;
  status: 'PENDING' | 'COMPLETED';
  date: Date;
}

const SettlementSchema: Schema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  paidBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  paidTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'COMPLETED'], default: 'PENDING' },
  date: { type: Date, default: Date.now }
});

export const Settlement = mongoose.model<ISettlement>('Settlement', SettlementSchema);

export interface IActivityLog extends Document {
  user: mongoose.Types.ObjectId;
  group?: mongoose.Types.ObjectId;
  action: string;
  details: string;
  date: Date;
}

const ActivityLogSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  group: { type: Schema.Types.ObjectId, ref: 'Group' },
  action: { type: String, required: true },
  details: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
