import mongoose, { Schema, Document } from 'mongoose';

// --- Types ---

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface IContact extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  createdAt: Date;
}

export interface ITransaction extends Document {
  creatorId: mongoose.Types.ObjectId;  // User who created the transaction
  counterpartyId: mongoose.Types.ObjectId;  // The friend involved
  counterpartyName: string;
  type: 'lend' | 'borrow';
  amount: number;
  paymentStatus: 'pending' | 'paid';  // Has it been paid?
  approvalStatus: 'pending' | 'accepted' | 'rejected';  // Has counterparty approved?
  date: Date;
  notes?: string;
  createdAt: Date;
}

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  content: string;
  timestamp: Date;
  read: boolean;
}

export interface IFriendship extends Document {
  requester: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

// --- Schemas ---

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

const ContactSchema = new Schema<IContact>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  phone: { type: String },
}, { timestamps: true });

const TransactionSchema = new Schema<ITransaction>({
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  counterpartyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  counterpartyName: { type: String, required: true },
  type: { type: String, enum: ['lend', 'borrow'], required: true },
  amount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  approvalStatus: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  date: { type: Date, default: Date.now },
  notes: { type: String },
}, { timestamps: true });

// Index for finding transactions where user is either creator or counterparty
TransactionSchema.index({ creatorId: 1 });
TransactionSchema.index({ counterpartyId: 1 });

const MessageSchema = new Schema<IMessage>({
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  read: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'timestamp', updatedAt: false } });

const FriendshipSchema = new Schema<IFriendship>({
  requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: true });

// Compound index to prevent duplicate friendships
FriendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// --- Models ---

export const User = mongoose.model<IUser>('User', UserSchema);
export const Contact = mongoose.model<IContact>('Contact', ContactSchema);
export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
export const Message = mongoose.model<IMessage>('Message', MessageSchema);
export const Friendship = mongoose.model<IFriendship>('Friendship', FriendshipSchema);
