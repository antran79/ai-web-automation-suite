import mongoose, { Schema, type Document } from 'mongoose';

export interface IDomain extends Document {
  domain: string;
  description?: string;
  owner?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const DomainSchema = new Schema<IDomain>({
  domain: { type: String, required: true, unique: true },
  description: { type: String },
  owner: { type: String },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });

const Domain = mongoose.models.Domain || mongoose.model<IDomain>('Domain', DomainSchema);
export default Domain;
