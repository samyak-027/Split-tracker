import mongoose, { Document, Schema } from 'mongoose';

export interface IFriend extends Document {
  user1: mongoose.Types.ObjectId;
  user2: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FriendSchema: Schema = new Schema({
  user1: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  user2: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Ensure uniqueness regardless of order
FriendSchema.index({ user1: 1, user2: 1 }, { unique: true });

export const Friend = mongoose.model<IFriend>('Friend', FriendSchema);

export interface IGroupMember extends Document {
  group: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  joinedAt: Date;
}

const GroupMemberSchema: Schema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  joinedAt: { type: Date, default: Date.now }
});

GroupMemberSchema.index({ group: 1, user: 1 }, { unique: true });

export const GroupMember = mongoose.model<IGroupMember>('GroupMember', GroupMemberSchema);
