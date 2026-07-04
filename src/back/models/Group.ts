import mongoose, { Document, Schema } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description?: string;
  joinCode: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const GroupSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  joinCode: { type: String, required: true, unique: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Group = mongoose.model<IGroup>('Group', GroupSchema);
