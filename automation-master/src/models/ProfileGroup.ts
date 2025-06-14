import mongoose, { Schema, type Document } from 'mongoose';

export interface IProfileGroup extends Document {
  name: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileGroupSchema = new Schema<IProfileGroup>({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });

const ProfileGroup = mongoose.models.ProfileGroup || mongoose.model<IProfileGroup>('ProfileGroup', ProfileGroupSchema);
export default ProfileGroup;
